import fs from 'node:fs'
import mysql from 'mysql2/promise'
import { config } from './config.js'

export const pool = mysql.createPool({
  ...config.mysql,
  waitForConnections: true,
  connectionLimit: config.mysql.connectionLimit,
  decimalNumbers: true,
  dateStrings: true,
  multipleStatements: true,
  flags: '+LOCAL_FILES',
  infileStreamFactory: (path) => fs.createReadStream(path),
})

export async function checkDatabase() {
  const [rows] = await pool.query('SELECT 1 AS connected')
  return rows[0]?.connected === 1
}