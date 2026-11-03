import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { config } from './config.js'

const scriptPath = (relativePath) => fileURLToPath(new URL(relativePath, config.repoRoot))

const queryGroupPaths = new Map([
  ['1', 'scripts/queries/group_01_queries.sql'],
  ['2', 'scripts/queries/group_02_queries.sql'],
  ['3', 'scripts/queries/group_03_queries.sql'],
  ['4', 'scripts/queries/group_04_queries.sql'],
  ['5', 'scripts/queries/group_05_queries.sql'],
])

async function executeSqlFile(connection, relativePath) {
  const script = await readFile(scriptPath(relativePath), 'utf8')
  let delimiter = ';'
  let pending = ''

  const executePendingStatements = async () => {
    const statements = pending.split(delimiter).map((statement) => statement.trim()).filter(Boolean)
    pending = ''
    for (const statement of statements) {
      await connection.query(statement)
    }
  }

  for (const line of script.split(/(?<=\n)/)) {
    const delimiterDirective = /^\s*DELIMITER\s+(\S+)\s*$/i.exec(line.trim())
    if (delimiterDirective) {
      await executePendingStatements()
      delimiter = delimiterDirective[1]
    } else {
      pending += line
    }
  }

  await executePendingStatements()
}

export async function runPipeline(connection) {
  const ddlScripts = [
    'scripts/ddl/bronze_ddl_csv.sql',
    'scripts/ddl/routines.sql',
    'scripts/ddl/silver_ddl_csv.sql',
    'scripts/ddl/gold_ddl.sql',
    'scripts/ddl/reporting_views.sql',
  ]
  const loadScripts = [
    ['bronze', 'scripts/data_load/bronze_data_load.sql'],
    ['silver', 'scripts/data_load/silver_data_load.sql'],
    ['gold', 'scripts/data_load/gold_data_load.sql'],
  ]

  for (const relativePath of ddlScripts) {
    await executeSqlFile(connection, relativePath)
    console.info(`Applied warehouse DDL: ${relativePath}`)
  }

  for (const [layer, relativePath] of loadScripts) {
    await executeSqlFile(connection, relativePath)
    console.info(`Completed ${layer} warehouse load`)
  }
}

export async function runQueryGroup(connection, groupId) {
  const relativePath = queryGroupPaths.get(String(groupId))
  if (!relativePath) throw new Error('Query group must be between 1 and 5')
  const script = await readFile(scriptPath(relativePath), 'utf8')
  const [results] = await connection.query(script)
  const statements = [...script.matchAll(/--\s*Q(\d+)\.\s*([^\r\n]*)\r?\n([\s\S]*?;)/g)]
    .map(([, number, title, sql]) => ({ number: Number(number), title: title.trim(), sql: sql.trim() }))
  const queryResults = results.filter((result) => Array.isArray(result))

  if (statements.length !== queryResults.length) {
    throw new Error(`Query group ${groupId} has ${statements.length} labeled queries but returned ${queryResults.length} result sets`)
  }

  return statements.map((statement, index) => ({ ...statement, rows: queryResults[index] }))
}