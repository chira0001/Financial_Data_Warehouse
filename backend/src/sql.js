import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from './config.js'

const scriptPath = (relativePath) => fileURLToPath(new URL(relativePath, config.repoRoot))

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
  await loadExchangeRates(connection)

  const scripts = [
    ['bronze', 'scripts/data_load/bronze_data_load.sql'],
    ['silver', 'scripts/data_load/silver_data_load.sql'],
    ['gold', 'scripts/data_load/gold_data_load.sql'],
  ]

  for (const [layer, relativePath] of scripts) {
    let script = await readFile(scriptPath(relativePath), 'utf8')
    if (layer === 'bronze') {
      const csvDirectory = resolve(fileURLToPath(config.repoRoot), 'sources/CSV').replaceAll('\\', '/')
      script = script.replaceAll('E:/E Drive/University Project/L3S2/Financial_Data_Warehouse/sources/CSV', csvDirectory)
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
