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
        SELECT UPPER(TRIM(currency.currency_code)) AS code,
          COUNT(fact.transaction_key) AS value
        FROM warehouse.dim_currency currency
        LEFT JOIN warehouse.fact_transaction fact ON fact.currency_key = currency.currency_key
        WHERE currency.currency_code IS NOT NULL AND TRIM(currency.currency_code) <> ''
        GROUP BY UPPER(TRIM(currency.currency_code))
        ORDER BY value DESC, code ASC
      `),
      query(`
        SELECT DATE_FORMAT(MIN(date_dim.full_date), '%b %y') AS label, COUNT(*) AS value
        FROM warehouse.fact_transaction fact
        JOIN warehouse.dim_date date_dim ON date_dim.date_key = fact.date_key
        GROUP BY YEAR(date_dim.full_date), MONTH(date_dim.full_date), DATE_FORMAT(date_dim.full_date, '%b')
        ORDER BY YEAR(date_dim.full_date), MONTH(date_dim.full_date)
      `),
      query(`
        SELECT layer_name AS layer, status, COUNT(*) AS run_count,
          ROUND(AVG(TIMESTAMPDIFF(SECOND, started_at, COALESCE(completed_at, NOW()))), 1) AS average_duration,
          DATE_FORMAT(MAX(started_at), '%Y-%m-%d %H:%i:%s') AS latest_run
        FROM warehouse.etl_run_log
        GROUP BY layer_name, status
        ORDER BY layer_name, status
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
    const totalRuns = runs.reduce((total, run) => total + Number(run.run_count), 0)
    const pipelineLatency = totalRuns
      ? runs.reduce((total, run) => total + Number(run.average_duration) * Number(run.run_count), 0) / totalRuns
      : null

    response.json({
      connected: true,
      metrics: {
        transactions: metrics.count,
        reportingVolume: metrics.reporting_volume,
        qualityScore: score,
        pipelineLatency: pipelineLatency == null ? null : Math.round(pipelineLatency),
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
      `),
      query(`
        SELECT COALESCE(channel, 'Unspecified') AS label, COUNT(*) AS transaction_count,
          COALESCE(SUM(lkr_amount), 0) AS reporting_volume
        FROM warehouse.fact_transaction
        GROUP BY channel
        ORDER BY transaction_count DESC
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

app.get('/api/warehouse/transaction-summary', async (request, response) => {
  try {
    const searchText = typeof request.query.search === 'string' ? request.query.search.trim() : ''
    const search = `%${searchText}%`
    const filter = `
      (? = '' OR fact.transaction_id LIKE ? OR account.account_id LIKE ? OR currency.currency_code LIKE ?)
    `
    const parameters = [searchText, search, search, search]
    const [summary, byType, byCurrency, transactionTypes] = await Promise.all([
      query(`
        SELECT COUNT(*) AS transaction_count,
          COALESCE(SUM(fact.lkr_amount), 0) AS reporting_volume,
          COALESCE(AVG(fact.lkr_amount), 0) AS average_transaction
        FROM warehouse.fact_transaction fact
        LEFT JOIN warehouse.dim_account account ON account.account_key = fact.account_key
        LEFT JOIN warehouse.dim_currency currency ON currency.currency_key = fact.currency_key
        WHERE ${filter}
      `, parameters),
      query(`
        SELECT fact.branch_key,
          COALESCE(branch.branch_name, 'Unassigned branch') AS branch_name,
          COALESCE(fact.transaction_type, 'Unspecified') AS label,
          COUNT(*) AS transaction_count, COALESCE(SUM(fact.lkr_amount), 0) AS reporting_volume
        FROM warehouse.fact_transaction fact
        LEFT JOIN warehouse.dim_account account ON account.account_key = fact.account_key
        LEFT JOIN warehouse.dim_currency currency ON currency.currency_key = fact.currency_key
        LEFT JOIN warehouse.dim_branch branch ON branch.branch_key = fact.branch_key
        WHERE ${filter}
        GROUP BY fact.branch_key, COALESCE(branch.branch_name, 'Unassigned branch'),
          COALESCE(fact.transaction_type, 'Unspecified')
        ORDER BY reporting_volume DESC, branch_name ASC, label ASC
      `, parameters),
      query(`
        SELECT branch.branch_key,
          COALESCE(branch.branch_name, 'Unassigned branch') AS branch_name,
          COALESCE(branch.city, 'Unknown location') AS city,
          COALESCE(branch.province, 'Unassigned') AS province,
          COALESCE(currency.currency_code, 'Unspecified') AS currency_code,
          COUNT(*) AS transaction_count
        FROM warehouse.fact_transaction fact
        LEFT JOIN warehouse.dim_account account ON account.account_key = fact.account_key
        LEFT JOIN warehouse.dim_currency currency ON currency.currency_key = fact.currency_key
        LEFT JOIN warehouse.dim_branch branch ON branch.branch_key = fact.branch_key
        WHERE ${filter}
        GROUP BY branch.branch_key, COALESCE(branch.branch_name, 'Unassigned branch'),
          COALESCE(branch.city, 'Unknown location'), COALESCE(branch.province, 'Unassigned'),
          COALESCE(currency.currency_code, 'Unspecified')
        ORDER BY transaction_count DESC, branch_name ASC, currency_code ASC
      `, parameters),
      query(`
        SELECT DISTINCT COALESCE(transaction_type, 'Unspecified') AS label
        FROM warehouse.fact_transaction
        ORDER BY label ASC
      `),
    ])

    response.json({ summary: summary[0], byType, byCurrency, transactionTypes, search: searchText })
  } catch (error) {
    handleError(response, error)
  }
})

app.get('/api/warehouse/loan-summary', async (_request, response) => {
  try {
    const [summary, products, statuses] = await Promise.all([
      query(`
        SELECT COUNT(*) AS facility_count,
          COALESCE(SUM(loan.loan_amount), 0) AS principal,
          COALESCE(AVG(loan.interest_rate), 0) AS average_rate,
          COALESCE(SUM(payments.total_paid), 0) AS payments_tracked
        FROM warehouse.fact_loan loan
        LEFT JOIN (
          SELECT loan_id, SUM(payment_amount) AS total_paid
          FROM warehouse.fact_loan_payment
          GROUP BY loan_id
        ) payments ON payments.loan_id = loan.loan_id
      `),
      query(`
        SELECT COALESCE(loan_type, 'Unspecified') AS label,
          COUNT(*) AS loan_count, COALESCE(SUM(loan_amount), 0) AS principal
        FROM warehouse.fact_loan
        GROUP BY loan_type
        ORDER BY principal DESC
      `),
      query(`
        SELECT COALESCE(loan_status, 'Unspecified') AS label,
          COUNT(*) AS loan_count, COALESCE(SUM(loan_amount), 0) AS principal
        FROM warehouse.fact_loan
        GROUP BY loan_status
        ORDER BY loan_count DESC
      `),
    ])

    response.json({ summary: summary[0], products, statuses })
  } catch (error) {
    handleError(response, error)
  }
})

app.get('/api/warehouse/transactions', async (request, response) => {
  try {
    const search = `%${request.query.search || ''}%`
    const rows = await query(`
      SELECT transaction_id AS id, transaction_date AS date, account_id AS account,
        transaction_type AS type, currency_code AS currency, amount, lkr_amount AS lkr,
        channel, CASE WHEN currency_code = 'LKR' THEN 'Native' ELSE 'Matched' END AS status
      FROM warehouse.vw_transaction_detail
      WHERE transaction_id LIKE ? OR account_id LIKE ? OR currency_code LIKE ?
      ORDER BY transaction_date DESC, transaction_id DESC
    `, [search, search, search])
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
      ORDER BY loan_id DESC
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