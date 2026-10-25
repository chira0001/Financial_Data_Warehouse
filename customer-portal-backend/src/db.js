import mysql from 'mysql2/promise'
import { config } from './config.js'

export const pool = mysql.createPool({
  ...config.mysql,
  waitForConnections: true,
  connectionLimit: config.mysql.connectionLimit,
  decimalNumbers: true,
  dateStrings: true,
  multipleStatements: true,
})
