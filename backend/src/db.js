import { createReadStream } from 'node:fs'
import { basename, dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'
import { config } from './config.js'

const csvDirectory = resolve(fileURLToPath(config.repoRoot), 'sources', 'CSV')
const allowedCsvFiles = new Set([
  'accounts.csv',
  'banking_transactions.csv',
  'branches.csv',
  'customers.csv',
])

export const pool = mysql.createPool({
  ...config.mysql,
  waitForConnections: true,
  connectionLimit: config.mysql.connectionLimit,
  decimalNumbers: true,
  dateStrings: true,
  multipleStatements: true,
  flags: '+LOCAL_FILES',
  infileStreamFactory: (requestedPath) => {
    const filePath = resolve(requestedPath)
    const relativePath = relative(csvDirectory, filePath)
    const isInsideCsvDirectory = relativePath && !relativePath.startsWith('..') && !relativePath.includes(':')
    const isExpectedCsv = allowedCsvFiles.has(basename(filePath).toLowerCase())

    if (!isInsideCsvDirectory || !isExpectedCsv || dirname(filePath).toLowerCase() !== csvDirectory.toLowerCase()) {
      throw new Error(`LOCAL INFILE requested an unsupported file: ${requestedPath}`)
    }

    return createReadStream(filePath)
  },
})

export async function checkDatabase() {
  const [rows] = await pool.query('SELECT 1 AS connected')
  return rows[0]?.connected === 1
}