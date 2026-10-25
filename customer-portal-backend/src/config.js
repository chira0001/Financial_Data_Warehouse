import 'dotenv/config'

export const config = {
  port: Number(process.env.PORT || 4001),
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://127.0.0.1:5174',
  mysql: {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'banking_loan_source',
    connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT || 5),
  },
}
