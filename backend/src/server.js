import express from 'express'
import cors from 'cors'
import { config } from './config.js'
import { checkDatabase, pool } from './db.js'
import { runPipeline, runQueryGroup } from './sql.js'

const app = express()
let pipelineRunning = false

app.use(cors({ origin: true, credentials: true }))
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

// --- Customer Loan Portal Endpoints ---
app.get('/api/customer/loans/products', (_request, response) => {
  response.json({
    products: [
      {
        id: 'personal',
        name: 'Personal Loan',
        tagline: 'Instant financial support for travel, emergency, wedding or medical needs.',
        minAmount: 50000,
        maxAmount: 2500000,
        rate: 12.5,
        minTenure: 12,
        maxTenure: 60,
        badge: 'Fast Approval',
        features: ['No guarantor needed up to LKR 500K', 'Instant 24-hr pre-approval', 'Flexible repayment schedule'],
        color: '#3b82f6',
      },
      {
        id: 'housing',
        name: 'Housing & Home Loan',
        tagline: 'Build, buy, or renovate your dream sanctuary with Sri Lanka’s lowest long-term rates.',
        minAmount: 500000,
        maxAmount: 25000000,
        rate: 8.1,
        minTenure: 36,
        maxTenure: 240,
        badge: 'Lowest Interest',
        features: ['Up to 20 years repayment tenure', 'Zero early settlement penalty', 'Free legal & valuation guidance'],
        color: '#10b981',
      },
      {
        id: 'vehicle',
        name: 'Vehicle & Auto Loan',
        tagline: 'Drive your preferred car, commercial vehicle or hybrid with quick leasing solutions.',
        minAmount: 250000,
        maxAmount: 10000000,
        rate: 10.5,
        minTenure: 12,
        maxTenure: 84,
        badge: 'Popular',
        features: ['Up to 80% vehicle financing', 'Speedy registration & approval', 'Special subsidized green rates for EVs'],
        color: '#8b5cf6',
      },
      {
        id: 'education',
        name: 'Education Loan',
        tagline: 'Empower your future with undergraduate & postgraduate funding locally and abroad.',
        minAmount: 100000,
        maxAmount: 5000000,
        rate: 6.87,
        minTenure: 12,
        maxTenure: 96,
        badge: 'Subsidized Rate',
        features: ['Grace period during course study', 'Covers tuition fees & living expenses', 'Convenient parent co-borrower terms'],
        color: '#06b6d4',
      },
      {
        id: 'business',
        name: 'Business & SME Facility',
        tagline: 'Fuel your enterprise growth, working capital, inventory, or machinery upgrade.',
        minAmount: 500000,
        maxAmount: 15000000,
        rate: 11.0,
        minTenure: 12,
        maxTenure: 120,
        badge: 'Growth Booster',
        features: ['Collateral-free credit lines for SMEs', 'Cash-flow structured repayments', 'Dedicated relationship officer'],
        color: '#f59e0b',
      },
    ],
  })
})

app.post('/api/customer/loans/apply', async (request, response) => {
  try {
    const {
      customerId,
      accountId,
      customerName,
      loanType,
      loanAmount,
      tenureMonths,
      interestRate,
      purpose,
      monthlyIncome,
    } = request.body

    const parsedAmount = Number(loanAmount) || 500000
    const parsedRate = Number(interestRate) || 10.5
    const tenure = Number(tenureMonths) || 36
    const numericCusId = Number(String(customerId || '').replace(/\D/g, '')) || Math.floor(Math.random() * 200) + 1
    const numericAccId = Number(String(accountId || '').replace(/\D/g, '')) || Math.floor(Math.random() * 300) + 100

    const [maxRows] = await pool.query('SELECT COALESCE(MAX(loan_id), 2000) AS max_id FROM banking_loan_source.loans')
    const newLoanId = (maxRows[0]?.max_id || 2000) + 1

    await pool.query(`
      INSERT INTO banking_loan_source.loans
        (loan_id, customer_id, account_id, loan_type, loan_amount, interest_rate, loan_start_date, loan_end_date, loan_status)
      VALUES (?, ?, ?, ?, ?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL ? MONTH), 'Active')
    `, [newLoanId, numericCusId, numericAccId, loanType || 'Personal', parsedAmount, parsedRate, tenure])

    response.json({
      success: true,
      loanId: newLoanId,
      referenceNo: `LN-${new Date().getFullYear()}-${newLoanId}`,
      message: 'Loan facility approved and recorded successfully!',
      details: {
        loanId: newLoanId,
        customerName: customerName || `Customer #${numericCusId}`,
        loanType: loanType || 'Personal',
        loanAmount: parsedAmount,
        interestRate: parsedRate,
        tenureMonths: tenure,
        status: 'Active',
        startDate: new Date().toISOString().split('T')[0],
      },
    })
  } catch (error) {
    handleError(response, error)
  }
})

app.get('/api/customer/loans/lookup/:query', async (request, response) => {
  try {
    const rawParam = request.params.query.trim()
    const numParam = Number(rawParam.replace(/\D/g, '')) || 0

    const loans = await query(`
      SELECT l.loan_id, l.customer_id, l.account_id, l.loan_type, l.loan_amount,
             l.interest_rate, l.loan_start_date, l.loan_end_date, l.loan_status,
             COALESCE(SUM(p.payment_amount), 0) AS total_paid
      FROM banking_loan_source.loans l
      LEFT JOIN banking_loan_source.loan_payments p ON p.loan_id = l.loan_id
      WHERE l.loan_id = ? OR l.customer_id = ?
      GROUP BY l.loan_id, l.customer_id, l.account_id, l.loan_type, l.loan_amount,
               l.interest_rate, l.loan_start_date, l.loan_end_date, l.loan_status
      ORDER BY l.loan_id DESC
    `, [numParam, numParam])

    if (!loans.length) {
      return response.status(404).json({ error: 'No loan records found for this identifier' })
    }

    const loanIdList = loans.map((l) => l.loan_id)
    const [payments] = await pool.query(`
      SELECT payment_id, loan_id, payment_date, payment_amount, payment_method, payment_status
      FROM banking_loan_source.loan_payments
      WHERE loan_id IN (?)
      ORDER BY payment_date DESC LIMIT 50
    `, [loanIdList])

    response.json({
      loans: loans.map((l) => ({
        ...l,
        balance_remaining: Math.max(0, Number(l.loan_amount) - Number(l.total_paid)),
        progress_pct: Math.min(100, Math.round((Number(l.total_paid) / Number(l.loan_amount)) * 100)),
      })),
      payments,
    })
  } catch (error) {
    handleError(response, error)
  }
})

app.post('/api/customer/loans/pay', async (request, response) => {
  try {
    const { loanId, paymentAmount, paymentMethod } = request.body
    const parsedAmount = Number(paymentAmount)
    const targetLoanId = Number(loanId)

    const [maxPayRows] = await pool.query('SELECT COALESCE(MAX(payment_id), 3000) AS max_id FROM banking_loan_source.loan_payments')
    const newPaymentId = (maxPayRows[0]?.max_id || 3000) + 1

    await pool.query(`
      INSERT INTO banking_loan_source.loan_payments
        (payment_id, loan_id, payment_date, payment_amount, payment_method, payment_status)
      VALUES (?, ?, CURDATE(), ?, ?, 'Paid')
    `, [newPaymentId, targetLoanId, parsedAmount, paymentMethod || 'Online Transfer'])

    response.json({
      success: true,
      paymentId: newPaymentId,
      receiptNo: `RCP-${new Date().getFullYear()}-${newPaymentId}`,
      message: 'Installment payment recorded successfully!',
    })
  } catch (error) {
    handleError(response, error)
  }
})

app.listen(config.port, () => {
  console.info(`Warehouse API listening on http://127.0.0.1:${config.port}`)
})