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
    const [summary, byType, byCurrency] = await Promise.all([
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
        SELECT COALESCE(fact.transaction_type, 'Unspecified') AS label,
          COUNT(*) AS transaction_count, COALESCE(SUM(fact.lkr_amount), 0) AS reporting_volume
        FROM warehouse.fact_transaction fact
        LEFT JOIN warehouse.dim_account account ON account.account_key = fact.account_key
        LEFT JOIN warehouse.dim_currency currency ON currency.currency_key = fact.currency_key
        WHERE ${filter}
        GROUP BY fact.transaction_type
        ORDER BY reporting_volume DESC
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
    ])

    response.json({ summary: summary[0], byType, byCurrency, search: searchText })
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

// --- Customer Loan Portal Endpoints ---
const fallbackLoanProducts = [
  {
    id: 'personal',
    name: 'Personal Loan',
    category: 'Personal',
    tagline: 'Instant financial support for travel, emergency, wedding or medical needs.',
    minAmount: 50000,
    maxAmount: 5000000,
    rate: 13.5,
    minTenure: 12,
    maxTenure: 60,
    badge: 'Fast Approval',
    features: ['No guarantor needed up to LKR 500K', 'Instant 24-hr pre-approval', 'Flexible repayment schedule'],
    color: '#3b82f6',
  },
  {
    id: 'housing',
    name: 'Housing & Home Loan',
    category: 'Housing',
    tagline: 'Build, buy, or renovate your dream sanctuary with Sri Lanka’s lowest long-term rates.',
    minAmount: 500000,
    maxAmount: 25000000,
    rate: 11.25,
    minTenure: 36,
    maxTenure: 240,
    badge: 'Lowest Interest',
    features: ['Up to 20 years repayment tenure', 'Zero early settlement penalty', 'Free legal & valuation guidance'],
    color: '#10b981',
  },
  {
    id: 'vehicle',
    name: 'Vehicle & Auto Loan',
    category: 'Vehicle',
    tagline: 'Drive your preferred car, commercial vehicle or hybrid with quick leasing solutions.',
    minAmount: 250000,
    maxAmount: 10000000,
    rate: 14.0,
    minTenure: 12,
    maxTenure: 84,
    badge: 'Popular',
    features: ['Up to 80% vehicle financing', 'Speedy registration & approval', 'Special subsidized green rates for EVs'],
    color: '#8b5cf6',
  },
  {
    id: 'education',
    name: 'Education Loan',
    category: 'Education',
    tagline: 'Empower your future with undergraduate & postgraduate funding locally and abroad.',
    minAmount: 100000,
    maxAmount: 5000000,
    rate: 8.5,
    minTenure: 12,
    maxTenure: 84,
    badge: 'Subsidized Rate',
    features: ['Grace period during course study', 'Covers tuition fees & living expenses', 'Convenient parent co-borrower terms'],
    color: '#06b6d4',
  },
  {
    id: 'business',
    name: 'Business & SME Facility',
    category: 'Business',
    tagline: 'Fuel your enterprise growth, working capital, inventory, or machinery upgrade.',
    minAmount: 500000,
    maxAmount: 20000000,
    rate: 12.75,
    minTenure: 12,
    maxTenure: 120,
    badge: 'Growth Booster',
    features: ['Collateral-free credit lines for SMEs', 'Cash-flow structured repayments', 'Dedicated relationship officer'],
    color: '#f59e0b',
  },
]

app.get('/api/customer/loans/products', async (_request, response) => {
  try {
    const dbProducts = await query(`
      SELECT product_id, product_code, product_name, loan_category,
             min_amount, max_amount, base_interest_rate, max_tenure_months,
             is_collateral_required, processing_fee_percentage
      FROM banking_loan_source.loan_products
      ORDER BY product_id
    `)

    if (dbProducts && dbProducts.length > 0) {
      const categoryMetadata = {
        Personal: {
          id: 'personal',
          tagline: 'Instant financial support for travel, emergency, wedding or medical needs.',
          badge: 'Fast Approval',
          features: ['No guarantor needed up to LKR 500K', 'Instant 24-hr pre-approval', 'Flexible repayment schedule'],
          color: '#3b82f6',
          minTenure: 12,
        },
        Housing: {
          id: 'housing',
          tagline: 'Build, buy, or renovate your dream sanctuary with Sri Lanka’s lowest long-term rates.',
          badge: 'Lowest Interest',
          features: ['Up to 20 years repayment tenure', 'Zero early settlement penalty', 'Free legal & valuation guidance'],
          color: '#10b981',
          minTenure: 36,
        },
        Vehicle: {
          id: 'vehicle',
          tagline: 'Drive your preferred car, commercial vehicle or hybrid with quick leasing solutions.',
          badge: 'Popular',
          features: ['Up to 80% vehicle financing', 'Speedy registration & approval', 'Special subsidized green rates for EVs'],
          color: '#8b5cf6',
          minTenure: 12,
        },
        Education: {
          id: 'education',
          tagline: 'Empower your future with undergraduate & postgraduate funding locally and abroad.',
          badge: 'Subsidized Rate',
          features: ['Grace period during course study', 'Covers tuition fees & living expenses', 'Convenient parent co-borrower terms'],
          color: '#06b6d4',
          minTenure: 12,
        },
        Business: {
          id: 'business',
          tagline: 'Fuel your enterprise growth, working capital, inventory, or machinery upgrade.',
          badge: 'Growth Booster',
          features: ['Collateral-free credit lines for SMEs', 'Cash-flow structured repayments', 'Dedicated relationship officer'],
          color: '#f59e0b',
          minTenure: 12,
        },
      }

      const merged = dbProducts.map((p) => {
        const meta = categoryMetadata[p.loan_category] || {
          id: p.loan_category.toLowerCase(),
          tagline: 'Reliable financing option tailored to your requirements.',
          badge: 'Standard Facility',
          features: ['Competitive interest rate', 'Flexible tenure', 'Dedicated advisory support'],
          color: '#6366f1',
          minTenure: 12,
        }
        return {
          id: meta.id,
          productId: p.product_id,
          productCode: p.product_code,
          name: p.product_name,
          category: p.loan_category,
          tagline: meta.tagline,
          minAmount: Number(p.min_amount),
          maxAmount: Number(p.max_amount),
          rate: Number(p.base_interest_rate),
          minTenure: meta.minTenure,
          maxTenure: Number(p.max_tenure_months),
          badge: meta.badge,
          features: meta.features,
          color: meta.color,
          isCollateralRequired: Boolean(p.is_collateral_required),
          processingFeePercentage: Number(p.processing_fee_percentage),
        }
      })
      return response.json({ products: merged })
    }

    response.json({ products: fallbackLoanProducts })
  } catch (error) {
    console.warn('DB loan products unavailable, returning fallback catalog:', error.message)
    response.json({ products: fallbackLoanProducts })
  }
})

app.post('/api/customer/loans/apply', async (request, response) => {
  const connection = await pool.getConnection()
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
      city,
      occupation,
      branchId,
      nic,
      phone,
    } = request.body

    const parsedAmount = Number(loanAmount) || 500000
    const parsedRate = Number(interestRate) || 12.5
    const tenure = Number(tenureMonths) || 36
    const cleanName = (customerName || '').trim()

    // 1. Manage Customer record so the applicant's entered name and profile are saved!
    let targetCustomerId = null
    let targetCustomerCode = null

    if (cleanName) {
      // Check if a customer already exists with this name (case-insensitive)
      const [existing] = await connection.query(
        'SELECT customer_id, customer_code FROM banking_loan_source.customers WHERE LOWER(customer_name) = LOWER(?) LIMIT 1',
        [cleanName]
      )
      if (existing.length > 0) {
        targetCustomerId = existing[0].customer_id
        targetCustomerCode = existing[0].customer_code
        // Update customer with latest contact/branch info
        await connection.query(
          'UPDATE banking_loan_source.customers SET city = ?, occupation = ?, branch_id = ? WHERE customer_id = ?',
          [city || 'Colombo', occupation || 'IT Professional', branchId || 'B001', targetCustomerId]
        )
      } else {
        // Find next customer_id
        const [maxCus] = await connection.query('SELECT COALESCE(MAX(customer_id), 500) AS max_c FROM banking_loan_source.customers')
        targetCustomerId = Math.max((maxCus[0]?.max_c || 500) + 1, 501)
        targetCustomerCode = 'C' + String(targetCustomerId).padStart(4, '0')
        await connection.query(`
          INSERT INTO banking_loan_source.customers
            (customer_id, customer_code, customer_name, gender, date_of_birth, city, occupation, branch_id)
          VALUES (?, ?, ?, 'Not Specified', '1995-01-01', ?, ?, ?)
        `, [targetCustomerId, targetCustomerCode, cleanName, city || 'Colombo', occupation || 'IT Professional', branchId || 'B001'])
      }
    } else {
      targetCustomerId = Number(String(customerId || '').replace(/\D/g, '')) || 10
      targetCustomerCode = 'C' + String(targetCustomerId).padStart(4, '0')
    }

    const numericAccId = Number(String(accountId || '').replace(/\D/g, '')) || (targetCustomerId * 10 + 1)

    const [maxRows] = await connection.query('SELECT COALESCE(MAX(loan_id), 2000) AS max_id FROM banking_loan_source.loans')
    const newLoanId = (maxRows[0]?.max_id || 2000) + 1

    let procedureSucceeded = false
    try {
      await connection.query('SET @code = "", @msg = ""')
      await connection.query(`
        CALL banking_loan_source.sp_disburse_new_loan(
          ?, ?, ?, ?, ?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL ? MONTH), @code, @msg
        )
      `, [newLoanId, targetCustomerId, numericAccId, loanType || 'Personal', parsedAmount, parsedRate, tenure])
      const [outRows] = await connection.query('SELECT @code AS code, @msg AS msg')
      if (outRows[0]?.code === 'SUCCESS') {
        procedureSucceeded = true
      }
    } catch (spErr) {
      console.warn('sp_disburse_new_loan failed or not found, falling back to direct insert:', spErr.message)
    }

    if (!procedureSucceeded) {
      await connection.query(`
        INSERT INTO banking_loan_source.loans
          (loan_id, customer_id, account_id, loan_type, loan_amount, interest_rate, loan_start_date, loan_end_date, loan_status)
        VALUES (?, ?, ?, ?, ?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL ? MONTH), 'Active')
      `, [newLoanId, targetCustomerId, numericAccId, loanType || 'Personal', parsedAmount, parsedRate, tenure])
    }

    // Record application in underwriting pipeline
    try {
      const [appMax] = await connection.query('SELECT COALESCE(MAX(application_id), 7000) AS max_app FROM banking_loan_source.loan_applications')
      const newAppId = (appMax[0]?.max_app || 7000) + 1
      const productMap = {
        Personal: 'PRD01',
        Housing: 'PRD02',
        Vehicle: 'PRD03',
        Education: 'PRD04',
        Business: 'PRD05',
      }
      const mappedProduct = productMap[loanType] || 'PRD01'
      await connection.query(`
        INSERT INTO banking_loan_source.loan_applications
          (application_id, customer_id, product_id, assigned_officer_id, applied_amount, requested_tenure_months, application_date, credit_score, approval_status, approved_amount, approval_date, decision_notes)
        VALUES (?, ?, ?, 101, ?, ?, CURDATE(), 720, 'Approved', ?, CURDATE(), 'Automated instant approval via Customer Online Portal')
      `, [newAppId, targetCustomerId, mappedProduct, parsedAmount, tenure, parsedAmount])
    } catch (appErr) {
      console.warn('Could not record application in pipeline:', appErr.message)
    }

    response.json({
      success: true,
      loanId: newLoanId,
      customerCode: targetCustomerCode,
      referenceNo: `LN-${new Date().getFullYear()}-${newLoanId}`,
      message: 'Loan facility approved and recorded successfully in core banking database!',
      details: {
        loanId: newLoanId,
        customerName: cleanName || `Customer #${targetCustomerId}`,
        customerCode: targetCustomerCode,
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
  } finally {
    connection.release()
  }
})

app.get('/api/customer/loans/lookup/:query', async (request, response) => {
  try {
    const rawParam = request.params.query.trim()
    const numParam = Number(rawParam.replace(/\D/g, '')) || 0

    const loans = await query(`
      SELECT l.loan_id, l.customer_id, l.account_id, l.loan_type, l.loan_amount,
             l.interest_rate, l.loan_start_date, l.loan_end_date, l.loan_status,
             c.customer_name, c.customer_code, c.city, c.occupation, c.branch_id,
             COALESCE(SUM(p.payment_amount), 0) AS total_paid
      FROM banking_loan_source.loans l
      LEFT JOIN banking_loan_source.customers c ON c.customer_id = l.customer_id
      LEFT JOIN banking_loan_source.loan_payments p ON p.loan_id = l.loan_id
      WHERE l.loan_id = ? OR l.customer_id = ? OR c.customer_code = ?
      GROUP BY l.loan_id, l.customer_id, l.account_id, l.loan_type, l.loan_amount,
               l.interest_rate, l.loan_start_date, l.loan_end_date, l.loan_status,
               c.customer_name, c.customer_code, c.city, c.occupation, c.branch_id
      ORDER BY l.loan_id DESC
    `, [numParam, numParam, rawParam])

    if (!loans.length) {
      return response.status(404).json({ error: 'No loan facilities registered under this identifier' })
    }

    const loanIdList = loans.map((l) => l.loan_id)
    const [payments] = await pool.query(`
      SELECT payment_id, loan_id, payment_date, payment_amount, payment_method, payment_status
      FROM banking_loan_source.loan_payments
      WHERE loan_id IN (?)
      ORDER BY payment_date DESC, payment_id DESC LIMIT 50
    `, [loanIdList])

    let auditLogs = []
    try {
      const [auditRows] = await pool.query(`
        SELECT audit_id, loan_id, action_type, old_status, new_status,
               old_amount, new_amount, old_interest_rate, new_interest_rate,
               modified_by, modified_at, notes
        FROM banking_loan_source.loan_audit_log
        WHERE loan_id IN (?)
        ORDER BY modified_at DESC, audit_id DESC LIMIT 50
      `, [loanIdList])
      auditLogs = auditRows || []
    } catch (auditErr) {
      console.warn('Could not query loan_audit_log:', auditErr.message)
    }

    response.json({
      loans: loans.map((l) => ({
        ...l,
        balance_remaining: Math.max(0, Number(l.loan_amount) - Number(l.total_paid)),
        progress_pct: Math.min(100, Math.round((Number(l.total_paid) / Number(l.loan_amount)) * 100)),
      })),
      payments,
      auditLogs,
    })
  } catch (error) {
    handleError(response, error)
  }
})

app.post('/api/customer/loans/pay', async (request, response) => {
  const connection = await pool.getConnection()
  try {
    const { loanId, paymentAmount, paymentMethod } = request.body
    const parsedAmount = Number(paymentAmount)
    const targetLoanId = Number(loanId)

    const [maxPayRows] = await connection.query('SELECT COALESCE(MAX(payment_id), 3000) AS max_id FROM banking_loan_source.loan_payments')
    const newPaymentId = (maxPayRows[0]?.max_id || 3000) + 1

    let procedureSucceeded = false
    try {
      await connection.query('SET @code = "", @msg = ""')
      await connection.query(`
        CALL banking_loan_source.sp_process_loan_payment(
          ?, ?, CURDATE(), ?, ?, 'Paid', @code, @msg
        )
      `, [newPaymentId, targetLoanId, parsedAmount, paymentMethod || 'Online Transfer'])
      const [outRows] = await connection.query('SELECT @code AS code, @msg AS msg')
      if (outRows && outRows[0]?.code) {
        if (outRows[0].code === 'SUCCESS') {
          procedureSucceeded = true
        } else {
          return response.status(400).json({
            error: outRows[0].msg || 'Repayment rejected by core banking stored procedure',
            code: outRows[0].code,
          })
        }
      }
    } catch (spErr) {
      console.warn('sp_process_loan_payment invocation exception, falling back to direct insert:', spErr.message)
    }

    if (!procedureSucceeded) {
      await connection.query(`
        INSERT INTO banking_loan_source.loan_payments
          (payment_id, loan_id, payment_date, payment_amount, payment_method, payment_status)
        VALUES (?, ?, CURDATE(), ?, ?, 'Paid')
      `, [newPaymentId, targetLoanId, parsedAmount, paymentMethod || 'Online Transfer'])
    }

    // Record audit trail entry for ADBMS compliance logging
    try {
      await connection.query(`
        INSERT INTO banking_loan_source.loan_audit_log
          (loan_id, action_type, old_status, new_status, old_amount, new_amount, notes, modified_by)
        VALUES (?, 'REPAYMENT', 'Active', 'Active', NULL, ?, ?, 'web_customer_portal')
      `, [targetLoanId, parsedAmount, `Installment #${newPaymentId} of LKR ${parsedAmount.toLocaleString()} paid via ${paymentMethod || 'Online Transfer'}`])
    } catch (auditErr) {
      console.warn('Audit log write error:', auditErr.message)
    }

    response.json({
      success: true,
      paymentId: newPaymentId,
      receiptNo: `RCP-${new Date().getFullYear()}-${newPaymentId}`,
      message: 'Installment payment recorded and posted successfully!',
    })
  } catch (error) {
    handleError(response, error)
  } finally {
    connection.release()
  }
})

// ==========================================
// ADBMS LIVE PLAYGROUND & EXECUTION CONSOLE
// ==========================================
app.post('/api/customer/loans/adbms/execute-procedure', async (request, response) => {
  const connection = await pool.getConnection()
  const start = performance.now()
  try {
    const { procedure, params } = request.body

    if (procedure === 'sp_process_loan_payment') {
      const loanId = Number(params.loanId) || 2008
      const amount = Number(params.amount) || 25000
      const method = params.method || 'Online Transfer'

      const [maxPayRows] = await connection.query('SELECT COALESCE(MAX(payment_id), 3000) AS max_id FROM banking_loan_source.loan_payments')
      const paymentId = (maxPayRows[0]?.max_id || 3000) + 1

      const sql = `CALL banking_loan_source.sp_process_loan_payment(${paymentId}, ${loanId}, CURDATE(), ${amount}, '${method}', 'Paid', @code, @msg);`

      await connection.query('SET @code = "", @msg = ""')
      await connection.query(
        'CALL banking_loan_source.sp_process_loan_payment(?, ?, CURDATE(), ?, ?, "Paid", @code, @msg)',
        [paymentId, loanId, amount, method]
      )
      const [outRows] = await connection.query('SELECT @code AS code, @msg AS msg')
      const execTime = (performance.now() - start).toFixed(2)

      return response.json({
        success: true,
        procedure: 'sp_process_loan_payment',
        sqlExecuted: sql,
        statusCode: outRows[0]?.code || 'UNKNOWN',
        statusMessage: outRows[0]?.msg || 'Execution completed',
        executionTimeMs: execTime,
        database: 'banking_loan_source',
        transactionStatus: outRows[0]?.code === 'SUCCESS' ? 'COMMITTED' : 'ROLLED_BACK',
      })
    } else if (procedure === 'sp_disburse_new_loan') {
      const customerId = Number(params.customerId) || 10
      const accountId = Number(params.accountId) || 101
      const loanType = params.loanType || 'Personal'
      const amount = Number(params.amount) || 500000
      const rate = Number(params.rate) || 12.5
      const tenure = Number(params.tenure) || 36

      const [maxRows] = await connection.query('SELECT COALESCE(MAX(loan_id), 2000) AS max_id FROM banking_loan_source.loans')
      const loanId = (maxRows[0]?.max_id || 2000) + 1

      const sql = `CALL banking_loan_source.sp_disburse_new_loan(${loanId}, ${customerId}, ${accountId}, '${loanType}', ${amount}, ${rate}, CURDATE(), DATE_ADD(CURDATE(), INTERVAL ${tenure} MONTH), @code, @msg);`

      await connection.query('SET @code = "", @msg = ""')
      await connection.query(`
        CALL banking_loan_source.sp_disburse_new_loan(
          ?, ?, ?, ?, ?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL ? MONTH), @code, @msg
        )
      `, [loanId, customerId, accountId, loanType, amount, rate, tenure])
      const [outRows] = await connection.query('SELECT @code AS code, @msg AS msg')
      const execTime = (performance.now() - start).toFixed(2)

      return response.json({
        success: true,
        procedure: 'sp_disburse_new_loan',
        sqlExecuted: sql,
        generatedLoanId: loanId,
        statusCode: outRows[0]?.code || 'UNKNOWN',
        statusMessage: outRows[0]?.msg || 'Execution completed',
        executionTimeMs: execTime,
        database: 'banking_loan_source',
        transactionStatus: outRows[0]?.code === 'SUCCESS' ? 'COMMITTED' : 'ROLLED_BACK',
      })
    } else if (procedure === 'sp_restructure_loan') {
      const loanId = Number(params.loanId) || 2008
      const newInterestRate = Number(params.newInterestRate) || 7.5
      const newEndDate = params.newEndDate || '2029-12-31'
      const officerReason = params.officerReason || 'Hardship interest relief approved by credit committee'

      const sql = `CALL banking_loan_source.sp_restructure_loan(${loanId}, ${newInterestRate}, '${newEndDate}', '${officerReason}', @code, @msg);`

      await connection.query('SET @code = "", @msg = ""')
      await connection.query(`
        CALL banking_loan_source.sp_restructure_loan(?, ?, ?, ?, @code, @msg)
      `, [loanId, newInterestRate, newEndDate, officerReason])
      const [outRows] = await connection.query('SELECT @code AS code, @msg AS msg')
      const execTime = (performance.now() - start).toFixed(2)

      return response.json({
        success: true,
        procedure: 'sp_restructure_loan',
        sqlExecuted: sql,
        statusCode: outRows[0]?.code || 'UNKNOWN',
        statusMessage: outRows[0]?.msg || 'Execution completed',
        executionTimeMs: execTime,
        database: 'banking_loan_source',
        transactionStatus: outRows[0]?.code === 'SUCCESS' ? 'COMMITTED' : 'ROLLED_BACK',
      })
    } else {
      return response.status(400).json({ error: `Unsupported procedure: ${procedure}` })
    }
  } catch (error) {
    const execTime = (performance.now() - start).toFixed(2)
    response.status(500).json({
      error: error.message,
      executionTimeMs: execTime,
      transactionStatus: 'ROLLED_BACK',
    })
  } finally {
    connection.release()
  }
})

app.get('/api/customer/loans/adbms/views/:viewName', async (request, response) => {
  const start = performance.now()
  try {
    const { viewName } = request.params
    const allowedViews = [
      'vw_loan_officer_active_facilities',
      'vw_overdue_collections_queue',
      'vw_loan_portfolio_health_metrics',
      'vw_daily_payment_reconciliation',
      'vw_customer_loan_statement',
    ]

    if (!allowedViews.includes(viewName)) {
      return response.status(400).json({ error: `Unsupported view: ${viewName}` })
    }

    const [rows] = await pool.query(`SELECT * FROM banking_loan_source.${viewName} LIMIT 30;`)
    const execTime = (performance.now() - start).toFixed(2)

    response.json({
      success: true,
      viewName,
      sqlExecuted: `SELECT * FROM banking_loan_source.${viewName} LIMIT 30;`,
      rowCount: rows.length,
      data: rows,
      executionTimeMs: execTime,
      database: 'banking_loan_source',
      engine: 'MySQL 8.0 Materialized/Relational View',
    })
  } catch (error) {
    const execTime = (performance.now() - start).toFixed(2)
    response.status(500).json({ error: error.message, executionTimeMs: execTime })
  }
})

app.get('/api/customer/loans/adbms/audit-log', async (request, response) => {
  const start = performance.now()
  try {
    const [rows] = await pool.query(`SELECT * FROM banking_loan_source.loan_audit_log ORDER BY audit_id DESC LIMIT 30;`)
    const execTime = (performance.now() - start).toFixed(2)

    response.json({
      success: true,
      sqlExecuted: `SELECT * FROM banking_loan_source.loan_audit_log ORDER BY audit_id DESC LIMIT 30;`,
      rowCount: rows.length,
      data: rows,
      executionTimeMs: execTime,
      database: 'banking_loan_source',
      engine: 'MySQL 8.0 Trigger-Populated Audit Ledger',
    })
  } catch (error) {
    const execTime = (performance.now() - start).toFixed(2)
    response.status(500).json({ error: error.message, executionTimeMs: execTime })
  }
})

app.post('/api/customer/loans/adbms/execute-function', async (request, response) => {
  const start = performance.now()
  try {
    const { functionName, params } = request.body
    let sql = ''
    let queryParams = []

    if (functionName === 'fn_calculate_monthly_emi') {
      const principal = Number(params.principal) || 1500000
      const rate = Number(params.rate) || 12.5
      const tenure = Number(params.tenure) || 36
      sql = `SELECT banking_loan_source.fn_calculate_monthly_emi(?, ?, ?) AS result;`
      queryParams = [principal, rate, tenure]
    } else if (functionName === 'fn_loan_outstanding_balance') {
      const loanId = Number(params.loanId) || 2008
      sql = `SELECT banking_loan_source.fn_loan_outstanding_balance(?) AS result;`
      queryParams = [loanId]
    } else if (functionName === 'fn_days_overdue') {
      const loanId = Number(params.loanId) || 2008
      sql = `SELECT banking_loan_source.fn_days_overdue(?) AS result;`
      queryParams = [loanId]
    } else if (functionName === 'fn_loan_risk_tier') {
      const loanId = Number(params.loanId) || 2008
      sql = `SELECT banking_loan_source.fn_loan_risk_tier(?) AS result;`
      queryParams = [loanId]
    } else if (functionName === 'fn_calculate_total_interest') {
      const principal = Number(params.principal) || 1500000
      const rate = Number(params.rate) || 12.5
      const tenure = Number(params.tenure) || 36
      sql = `SELECT banking_loan_source.fn_calculate_total_interest(?, ?, ?) AS result;`
      queryParams = [principal, rate, tenure]
    } else {
      return response.status(400).json({ error: `Unsupported function: ${functionName}` })
    }

    const [rows] = await pool.query(sql, queryParams)
    const execTime = (performance.now() - start).toFixed(2)

    // Build human readable SQL with interpolated parameters
    let displaySql = sql
    queryParams.forEach((p) => {
      displaySql = displaySql.replace('?', typeof p === 'string' ? `'${p}'` : p)
    })

    response.json({
      success: true,
      functionName,
      sqlExecuted: displaySql,
      result: rows[0]?.result,
      executionTimeMs: execTime,
      database: 'banking_loan_source',
      engine: 'MySQL 8.0 In-Engine UDF',
    })
  } catch (error) {
    const execTime = (performance.now() - start).toFixed(2)
    response.status(500).json({ error: error.message, executionTimeMs: execTime })
  }
})

app.listen(config.port, () => {
  console.info(`Warehouse API listening on http://127.0.0.1:${config.port}`)
})