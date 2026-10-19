import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { config } from './config.js'

const scriptPath = (relativePath) => fileURLToPath(new URL(relativePath, config.repoRoot))

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