import express from 'express'
import cors from 'cors'
import { config } from './config.js'
import { checkDatabase, pool } from './db.js'
import { runPipeline, runQueryGroup } from './sql.js'

const app = express()
let pipelineRunning = false

app.use(cors({ origin: config.frontendOrigin }))
app.use(express.json())

const query = async (sql, params = []) => {
  const [rows] = await pool.query(sql, params)
  return rows
}

const handleError = (response, error) => {
  console.error(error)
  response.status(503).json({ error: 'Warehouse unavailable', detail: error.message })
}

app.get('/api/health', async (_request, response) => {
  try {
    await checkDatabase()
    response.json({ status: 'ok', database: 'connected' })
  } catch (error) {
    response.status(503).json({ status: 'error', database: 'unavailable', detail: error.message })
  }
})

app.get('/api/warehouse/overview', async (_request, response) => {
  try {
    const [counts, currencies, volume, runs] = await Promise.all([
      query(`
        SELECT 'Bronze' AS layer, COUNT(*) AS rows_loaded, 7 AS tables_loaded FROM warehouse.bronze_banking_transactions
        UNION ALL SELECT 'Silver', COUNT(*), 7 FROM warehouse.silver_banking_transactions
        UNION ALL SELECT 'Gold', COUNT(*), 9 FROM warehouse.fact_transaction
      `),
      query(`
        SELECT currency_code AS code, currency_code AS name, COUNT(*) AS value
        FROM warehouse.dim_currency
        GROUP BY currency_code
        ORDER BY value DESC
        LIMIT 8
      `),
      query(`
        SELECT DATE_FORMAT(date_dim.full_date, '%b') AS label, COUNT(*) AS value
        FROM warehouse.fact_transaction fact
        JOIN warehouse.dim_date date_dim ON date_dim.date_key = fact.date_key
        GROUP BY YEAR(date_dim.full_date), MONTH(date_dim.full_date), DATE_FORMAT(date_dim.full_date, '%b')
        ORDER BY YEAR(date_dim.full_date), MONTH(date_dim.full_date)
      `),
      query(`
        SELECT DATE_FORMAT(started_at, '%H:%i:%s') AS time, layer_name AS layer,
          status, message, TIMESTAMPDIFF(SECOND, started_at, COALESCE(completed_at, NOW())) AS duration
        FROM warehouse.etl_run_log
        ORDER BY started_at DESC LIMIT 8
      `),
    ])

    const [transactionMetrics, qualityMetrics] = await Promise.all([
      query(`SELECT COUNT(*) AS count, COALESCE(SUM(lkr_amount), 0) AS reporting_volume FROM warehouse.fact_transaction`),
      query(`SELECT COUNT(*) AS total, SUM(account_key IS NULL OR date_key IS NULL OR currency_key IS NULL) AS failed FROM warehouse.fact_transaction`),
    ])

    const layerMap = new Map(counts.map((layer) => [layer.layer, layer]))
    const metrics = transactionMetrics[0]
    const quality = qualityMetrics[0]
    const score = quality.total ? Math.round(((quality.total - quality.failed) / quality.total) * 1000) / 10 : null

    response.json({
      connected: true,
      metrics: {
        transactions: metrics.count,
        reportingVolume: metrics.reporting_volume,
        qualityScore: score,
        pipelineLatency: runs[0]?.duration ?? null,
      },
      layers: ['Bronze', 'Silver', 'Gold'].map((label) => ({
        id: label.toLowerCase(),
        label,
        description: label === 'Bronze' ? 'Raw landing' : label === 'Silver' ? 'Typed + cleaned' : 'Analytics ready',
        tables: layerMap.get(label)?.tables_loaded ?? 0,
        rows: layerMap.get(label)?.rows_loaded ?? 0,
        status: 'Healthy',
        accent: label === 'Bronze' ? 'amber' : label === 'Silver' ? 'cyan' : 'lime',
      })),
      volume,
      currencyMix: currencies,
      runs,
    })
  } catch (error) {
    handleError(response, error)
  }
})

app.get('/api/warehouse/analytics', async (_request, response) => {
  try {
    const [summary, monthlyTrend, transactionTypes, loanProducts, regions, channels] = await Promise.all([
      query(`
        SELECT
          (SELECT COUNT(*) FROM warehouse.fact_transaction) AS transaction_count,
          (SELECT COALESCE(SUM(lkr_amount), 0) FROM warehouse.fact_transaction) AS reporting_volume,
          (SELECT COALESCE(SUM(loan_amount), 0) FROM warehouse.fact_loan) AS loan_principal,
          (SELECT COUNT(DISTINCT branch_key) FROM warehouse.fact_transaction WHERE branch_key IS NOT NULL) AS active_branches
      `),
      query(`
        SELECT DATE_FORMAT(monthly.month_start, '%b %Y') AS label,
          monthly.transaction_count, monthly.reporting_volume
        FROM (
          SELECT DATE_SUB(date_dim.full_date, INTERVAL DAYOFMONTH(date_dim.full_date) - 1 DAY) AS month_start,
            COUNT(*) AS transaction_count, SUM(fact.lkr_amount) AS reporting_volume
          FROM warehouse.fact_transaction fact
          JOIN warehouse.dim_date date_dim ON date_dim.date_key = fact.date_key
          GROUP BY YEAR(date_dim.full_date), MONTH(date_dim.full_date), month_start
          ORDER BY month_start DESC LIMIT 12
        ) monthly
        ORDER BY monthly.month_start
      `),
      query(`
        SELECT transaction_type AS label, COUNT(*) AS transaction_count,
          COALESCE(SUM(lkr_amount), 0) AS reporting_volume
        FROM warehouse.fact_transaction
        GROUP BY transaction_type
        ORDER BY reporting_volume DESC
      `),
      query(`
        SELECT loan_type AS label, COUNT(*) AS loan_count,
          COALESCE(SUM(loan_amount), 0) AS principal
        FROM warehouse.fact_loan
        GROUP BY loan_type
        ORDER BY principal DESC
      `),
      query(`
        SELECT COALESCE(branch.province, 'Unassigned') AS label,
          COUNT(*) AS transaction_count, COALESCE(SUM(fact.lkr_amount), 0) AS reporting_volume
        FROM warehouse.fact_transaction fact
        LEFT JOIN warehouse.dim_branch branch ON branch.branch_key = fact.branch_key
        GROUP BY branch.province
        ORDER BY reporting_volume DESC
        LIMIT 8
      `),
      query(`
        SELECT COALESCE(channel, 'Unspecified') AS label, COUNT(*) AS transaction_count,
          COALESCE(SUM(lkr_amount), 0) AS reporting_volume
        FROM warehouse.fact_transaction
        GROUP BY channel
        ORDER BY transaction_count DESC
        LIMIT 6
      `),
    ])

    response.json({
      summary: summary[0],
      monthlyTrend,
      transactionTypes,
      loanProducts,
      regions,
      channels,
    })
  } catch (error) {
    handleError(response, error)
  }
})

app.get('/api/warehouse/transactions', async (request, response) => {
  try {
    const search = `%${request.query.search || ''}%`
    const limit = Math.min(Number(request.query.limit || 100), 500)
    const rows = await query(`
      SELECT transaction_id AS id, transaction_date AS date, account_id AS account,
        transaction_type AS type, currency_code AS currency, amount, lkr_amount AS lkr,
        channel, CASE WHEN currency_code = 'LKR' THEN 'Native' ELSE 'Matched' END AS status
      FROM warehouse.vw_transaction_detail
      WHERE transaction_id LIKE ? OR account_id LIKE ? OR currency_code LIKE ?
      ORDER BY transaction_date DESC, transaction_id DESC LIMIT ?
    `, [search, search, search, limit])
    response.json({ rows })
  } catch (error) {
    handleError(response, error)
  }
})

app.get('/api/warehouse/loans', async (_request, response) => {
  try {
    const rows = await query(`
      SELECT loan_id AS id, customer_id AS customer, loan_type AS type,
        loan_amount AS amount, CONCAT(interest_rate, '%') AS rate, loan_status AS status,
        total_payments AS paid, loan_end_date AS maturity
      FROM warehouse.vw_loan_portfolio
      ORDER BY loan_id DESC LIMIT 500
    `)
    response.json({ rows })
  } catch (error) {
    handleError(response, error)
  }
})

app.get('/api/warehouse/quality', async (_request, response) => {
  try {
    const [transactionCheck, paymentsCheck] = await Promise.all([
      query(`SELECT COUNT(*) AS total, SUM(date_key IS NULL OR account_key IS NULL OR currency_key IS NULL) AS failed FROM warehouse.fact_transaction`),
      query(`SELECT COUNT(*) AS total FROM warehouse.fact_loan_payment`),
    ])
    const transaction = transactionCheck[0]
    response.json({
      score: transaction.total ? Math.round(((transaction.total - transaction.failed) / transaction.total) * 1000) / 10 : null,
      checks: [{
        label: 'Transaction dimension integrity',
        detail: `${transaction.total} Gold transaction rows checked`,
        result: transaction.failed ? 'Review' : 'Passed',
        score: transaction.total ? Math.round(((transaction.total - transaction.failed) / transaction.total) * 100) : 0,
      }, {
        label: 'Loan payment availability',
        detail: `${paymentsCheck[0].total} Gold payment rows available`,
        result: 'Passed',
        score: 100,
      }] })
  } catch (error) {
    handleError(response, error)
  }
})

app.post('/api/query-groups/:groupId/run', async (request, response) => {
  let connection
  try {
    connection = await pool.getConnection()
    const results = await runQueryGroup(connection, request.params.groupId)
    response.json({ groupId: request.params.groupId, results })
  } catch (error) {
    handleError(response, error)
  } finally {
    connection?.release()
  }
})

app.post('/api/pipeline/run', async (_request, response) => {
  if (pipelineRunning) return response.status(409).json({ error: 'Pipeline is already running' })
  pipelineRunning = true
  const connection = await pool.getConnection()
  try {
    await runPipeline(connection)
    response.json({ status: 'success', message: 'Bronze, Silver, and Gold loads completed' })
  } catch (error) {
    console.error(error)
    response.status(500).json({ status: 'error', error: 'Pipeline failed', detail: error.message })
  } finally {
    connection.release()
    pipelineRunning = false
  }
})

app.listen(config.port, () => {
  console.info(`Warehouse API listening on http://127.0.0.1:${config.port}`)
})