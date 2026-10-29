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

export async function runPipeline(connection) {
  const scripts = [
    ['bronze', 'scripts/data_load/bronze_data_load.sql'],
    ['silver', 'scripts/data_load/silver_data_load.sql'],
    ['gold', 'scripts/data_load/gold_data_load.sql'],
  ]

  for (const [layer, relativePath] of scripts) {
    const script = await readFile(scriptPath(relativePath), 'utf8')
    await connection.query(script)
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