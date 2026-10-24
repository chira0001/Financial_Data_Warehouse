import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from './config.js'

const scriptPath = (relativePath) => fileURLToPath(new URL(relativePath, config.repoRoot))

function splitSqlScript(script) {
  let delimiter = ';'
  let buffer = ''
  const statements = []

  for (const line of script.split(/\r?\n/)) {
    const delimiterDirective = line.match(/^\s*DELIMITER\s+(\S+)\s*$/i)
    if (delimiterDirective) {
      delimiter = delimiterDirective[1]
      continue
    }

    buffer += `${line}\n`
    let delimiterIndex
    while ((delimiterIndex = buffer.indexOf(delimiter)) !== -1) {
      const statement = buffer.slice(0, delimiterIndex).trim()
      if (statement) statements.push(statement)
      buffer = buffer.slice(delimiterIndex + delimiter.length)
    }
  }

  if (buffer.trim()) statements.push(buffer.trim())
  return statements
}

export async function initializeWarehouse(connection) {
  const ddlScripts = [
    'scripts/ddl/bronze_ddl_csv.sql',
    'scripts/ddl/routines.sql',
    'scripts/ddl/silver_ddl_csv.sql',
    'scripts/ddl/gold_ddl.sql',
    'scripts/ddl/reporting_views.sql',
  ]

  for (const relativePath of ddlScripts) {
    const script = (await readFile(scriptPath(relativePath), 'utf8')).replace(/\/\*[\s\S]*?\*\//g, '')
    for (const statement of splitSqlScript(script)) {
      await connection.query(statement)
    }
  }

  const indexes = [
    ['silver_exchange_rates', 'idx_target_currency_rate_date', 'target_currency, rate_date'],
    ['bronze_exchange_rates', 'idx_exchange_rates', 'target_currency, rate_date'],
    ['bronze_banking_transactions', 'idx_bronze_txns', 'currency'],
  ]
  for (const [table, index, columns] of indexes) {
    const [existing] = await connection.query(
      'SELECT 1 FROM information_schema.statistics WHERE table_schema = ? AND table_name = ? AND index_name = ? LIMIT 1',
      ['warehouse', table, index],
    )
    if (!existing.length) {
      await connection.query(`CREATE INDEX ${index} ON warehouse.${table} (${columns})`)
    }
  }
}

async function loadExchangeRates(connection) {
  const startYear = 2026
  const endYear = new Date().getFullYear()
  const [tableName] = await connection.query('SELECT DATABASE() AS name')
  const database = tableName[0]?.name
  if (!database) throw new Error('No MySQL database is selected')

  await connection.query(`
    CREATE TABLE IF NOT EXISTS warehouse.bronze_exchange_rates (
      id INT NOT NULL AUTO_INCREMENT UNIQUE,
      rate_date DATE NOT NULL,
      base_currency CHAR(3) NOT NULL,
      target_currency CHAR(3) NOT NULL,
      rate DECIMAL(18, 6) NOT NULL
    )
  `)

  const rows = []
  for (let year = startYear; year <= endYear; year += 1) {
    const from = `${year}-01-01`
    const to = year === endYear ? new Date().toISOString().slice(0, 10) : `${year}-12-31`
    const url = new URL('https://api.frankfurter.dev/v2/rates')
    url.search = new URLSearchParams({ base: 'LKR', from, to }).toString()
    const response = await fetch(url, { signal: AbortSignal.timeout(30000) })
    if (!response.ok) throw new Error(`Frankfurter API returned ${response.status} ${response.statusText}`)
    const data = await response.json()
    if (!Array.isArray(data)) throw new Error(`Unexpected Frankfurter API response: ${JSON.stringify(data)}`)
    for (const item of data) {
      if (!item.date || !item.quote || !Number.isFinite(Number(item.rate))) {
        throw new Error(`Invalid exchange-rate record: ${JSON.stringify(item)}`)
      }
      rows.push([item.date, 'LKR', item.quote, item.rate])
    }
  }

  await connection.beginTransaction()
  try {
    await connection.query('DELETE FROM warehouse.bronze_exchange_rates')
    if (rows.length) {
      await connection.query(
        'INSERT INTO warehouse.bronze_exchange_rates (rate_date, base_currency, target_currency, rate) VALUES ?',
        [rows],
      )
    }
    await connection.commit()
    console.info(`Loaded ${rows.length} exchange rates into ${database}.bronze_exchange_rates`)
  } catch (error) {
    await connection.rollback()
    throw error
  }
}

const queryGroupPaths = new Map([
  ['1', 'scripts/queries/group_01_queries.sql'],
  ['2', 'scripts/queries/group_02_queries.sql'],
  ['3', 'scripts/queries/group_03_queries.sql'],
  ['4', 'scripts/queries/group_04_queries.sql'],
  ['5', 'scripts/queries/group_05_queries.sql'],
])

export async function runPipeline(connection) {
  await initializeWarehouse(connection)
  await loadExchangeRates(connection)

  const scripts = [
    ['bronze', 'scripts/data_load/bronze_data_load.sql'],
    ['silver', 'scripts/data_load/silver_data_load.sql'],
    ['gold', 'scripts/data_load/gold_data_load.sql'],
  ]

  for (const [layer, relativePath] of scripts) {
    let script = await readFile(scriptPath(relativePath), 'utf8')
    if (layer === 'bronze') {
      const projectRoot = resolve(fileURLToPath(config.repoRoot)).replaceAll('\\', '/')
      script = script.replaceAll('{{PROJECT_ROOT}}', projectRoot)
    }
    await connection.query(script)
    console.info(`Completed ${layer} warehouse load`)
  }
}

export async function runQueryGroup(connection, groupId) {
  const relativePath = queryGroupPaths.get(String(groupId))
  if (!relativePath) throw new Error('Query group must be between 1 and 5')
  const script = await readFile(scriptPath(relativePath), 'utf8')
  const [results] = await connection.query(script)
  return results.filter((result) => Array.isArray(result))
}
