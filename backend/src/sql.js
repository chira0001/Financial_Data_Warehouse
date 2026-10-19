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
  return results.filter((result) => Array.isArray(result))
}