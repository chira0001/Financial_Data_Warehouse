import express from 'express'
import cors from 'cors'
import mysql from 'mysql2/promise'
import { config } from './config.js'
import { checkDatabase, pool } from './db.js'
import { runPipeline, runQueryGroup } from './sql.js'

const app = express()
let pipelineRunning = false

app.use(cors({ origin: true, credentials: true }))
app.use(express.json())

const initRbacUser = async () => {
  try {
    const conn = await pool.getConnection()
    await conn.query("CREATE USER IF NOT EXISTS 'banking_app'@'localhost' IDENTIFIED BY 'AppPass123!'")
    await conn.query("GRANT role_loan_officer, role_loan_manager, role_loan_auditor TO 'banking_app'@'localhost'")
    await conn.query("ALTER USER 'banking_app'@'localhost' DEFAULT ROLE ALL")
    await conn.query("GRANT EXECUTE ON PROCEDURE banking_loan_source.sp_underwrite_loan_application TO role_loan_manager").catch(() => {})
    await conn.query("GRANT SELECT, INSERT, UPDATE ON banking_loan_source.loan_applications TO role_loan_manager").catch(() => {})
    await conn.query("GRANT SELECT, INSERT, UPDATE ON banking_loan_source.loan_guarantors TO role_loan_manager").catch(() => {})
    await conn.query("GRANT SELECT, INSERT, UPDATE ON banking_loan_source.loans TO role_loan_manager").catch(() => {})
    await conn.query("GRANT SELECT, INSERT, UPDATE ON banking_loan_source.loan_audit_log TO role_loan_manager").catch(() => {})
    await conn.query("FLUSH PRIVILEGES").catch(() => {})
    conn.release()
  } catch (err) {
    console.warn('RBAC user initialization notice:', err.message)
  }
}
initRbacUser()

const getRoleConnection = async (requestedRole) => {
  const allowedRoles = ['role_loan_officer', 'role_loan_manager', 'role_loan_auditor']
  if (requestedRole && allowedRoles.includes(requestedRole)) {
    try {
      const conn = await mysql.createConnection({
        host: config.mysql.host,
        port: config.mysql.port,
        user: 'banking_app',
        password: 'AppPass123!',
        database: 'banking_loan_source',
        multipleStatements: true,
      })
      await conn.query(`SET ROLE ${requestedRole};`)
      return { connection: conn, isDedicated: true, activeRole: requestedRole }
    } catch (connErr) {
      console.warn(`Could not connect as banking_app (${requestedRole}), falling back to default pool:`, connErr.message)
    }
  }
  const conn = await pool.getConnection()
  return { connection: conn, isDedicated: false, activeRole: null }
}

const releaseRoleConnection = async (holder) => {
  if (!holder) return
  try {
    if (holder.isDedicated && holder.connection) {
      await holder.connection.end().catch(() => {})
    } else if (holder.connection) {
      holder.connection.release()
    }
  } catch (relErr) {
    console.warn('Connection release warning:', relErr.message)
  }
}

const query = async (sql, params = []) => {
  const [rows] = await pool.query(sql, params)
  return rows
}

const handleError = (response, error) => {
  console.error(error)
  response.status(503).json({ error: 'Warehouse unavailable', detail: error.message })
}

const layerTables = {
  Bronze: [
    'bronze_accounts', 'bronze_banking_transactions', 'bronze_branches', 'bronze_customers',
    'bronze_exchange_rates', 'bronze_loans', 'bronze_loan_payments', 'bronze_loan_products',
    'bronze_loan_officers', 'bronze_loan_applications', 'bronze_loan_collaterals',
    'bronze_loan_guarantors', 'bronze_loan_disbursements', 'bronze_loan_repayment_schedules',
    'bronze_loan_fees_and_penalties', 'bronze_loan_recovery_actions', 'bronze_loan_audit_log',
    'bronze_loan_payment_audit_log',
  ],
  Silver: [
    'silver_accounts', 'silver_banking_transactions', 'silver_branches', 'silver_customers',
    'silver_exchange_rates', 'silver_loans', 'silver_loan_payments', 'silver_loan_products',
    'silver_loan_officers', 'silver_loan_applications', 'silver_loan_collaterals',
    'silver_loan_guarantors', 'silver_loan_disbursements', 'silver_loan_repayment_schedules',
    'silver_loan_fees_and_penalties', 'silver_loan_recovery_actions', 'silver_loan_audit_log',
    'silver_loan_payment_audit_log',
  ],
  Gold: [
    'dim_date', 'dim_currency', 'dim_branch', 'dim_customer', 'dim_account',
    'dim_loan_product', 'dim_loan_officer', 'fact_transaction', 'fact_exchange_rate',
    'fact_loan', 'fact_loan_payment', 'fact_loan_application', 'fact_loan_disbursement',
    'fact_loan_repayment_schedule', 'fact_loan_collateral', 'fact_loan_guarantor',
    'fact_loan_fee', 'fact_loan_recovery_action', 'fact_loan_audit', 'fact_loan_payment_audit',
  ],
}

const loanOperationDatasets = {
  facilities: {
    label: 'Loan facilities',
    columns: ['loan_id', 'customer_id', 'customer_name', 'account_id', 'loan_type', 'loan_start_date', 'loan_end_date', 'loan_amount', 'interest_rate', 'loan_status', 'total_paid'],
    search: ['loan.loan_id', 'customer.customer_id', "CONCAT_WS(' ', customer.first_name, customer.last_name)", 'account.account_id', 'loan.loan_type', 'loan.loan_status'],
    order: 'loan.loan_id DESC',
    sql: `SELECT loan.loan_id, customer.customer_id, CONCAT_WS(' ', customer.first_name, customer.last_name) AS customer_name,
      account.account_id, loan.loan_type, start_date.full_date AS loan_start_date, end_date.full_date AS loan_end_date,
      loan.loan_amount, loan.interest_rate, loan.loan_status, COALESCE(payment.total_paid, 0) AS total_paid
      FROM warehouse.fact_loan loan
      LEFT JOIN warehouse.dim_customer customer ON customer.customer_key = loan.customer_key
      LEFT JOIN warehouse.dim_account account ON account.account_key = loan.account_key
      LEFT JOIN warehouse.dim_date start_date ON start_date.date_key = loan.start_date_key
      LEFT JOIN warehouse.dim_date end_date ON end_date.date_key = loan.end_date_key
      LEFT JOIN (SELECT loan_id, SUM(payment_amount) AS total_paid FROM warehouse.fact_loan_payment GROUP BY loan_id) payment ON payment.loan_id = loan.loan_id`,
  },
  payments: {
    label: 'Payments',
    columns: ['payment_id', 'loan_id', 'customer_id', 'payment_date', 'payment_amount', 'payment_method', 'payment_status'],
    search: ['payment.payment_id', 'payment.loan_id', 'customer.customer_id', 'payment.payment_method', 'payment.payment_status'],
    order: 'payment_date DESC, payment.payment_id DESC',
    sql: `SELECT payment.payment_id, payment.loan_id, customer.customer_id, date_dim.full_date AS payment_date,
      payment.payment_amount, payment.payment_method, payment.payment_status
      FROM warehouse.fact_loan_payment payment
      LEFT JOIN warehouse.fact_loan loan ON loan.loan_id = payment.loan_id
      LEFT JOIN warehouse.dim_customer customer ON customer.customer_key = loan.customer_key
      LEFT JOIN warehouse.dim_date date_dim ON date_dim.date_key = payment.date_key`,
  },
  applications: {
    label: 'Applications',
    columns: ['application_id', 'customer_id', 'customer_name', 'product_name', 'loan_category', 'officer_code', 'application_date', 'approval_status', 'applied_amount', 'approved_amount', 'requested_tenure_months', 'credit_score'],
    search: ['application_id', 'customer.customer_id', "CONCAT_WS(' ', customer.first_name, customer.last_name)", 'product.product_name', 'application.approval_status'],
    order: 'application_date DESC, application_id DESC',
    sql: `SELECT application.application_id, customer.customer_id,
      CONCAT_WS(' ', customer.first_name, customer.last_name) AS customer_name,
      product.product_name, product.loan_category, officer.employee_code AS officer_code,
      application_date.full_date AS application_date, application.approval_status,
      application.applied_amount, application.approved_amount, application.requested_tenure_months,
      application.credit_score
      FROM warehouse.fact_loan_application application
      LEFT JOIN warehouse.dim_customer customer ON customer.customer_key = application.customer_key
      LEFT JOIN warehouse.dim_loan_product product ON product.product_key = application.product_key
      LEFT JOIN warehouse.dim_loan_officer officer ON officer.officer_key = application.officer_key
      LEFT JOIN warehouse.dim_date application_date ON application_date.date_key = application.application_date_key`,
  },
  products: {
    label: 'Products',
    columns: ['product_id', 'product_code', 'product_name', 'loan_category', 'min_amount', 'max_amount', 'base_interest_rate', 'max_tenure_months', 'is_collateral_required', 'processing_fee_percentage'],
    search: ['product_id', 'product_code', 'product_name', 'loan_category'],
    order: 'loan_category, product_name',
    sql: `SELECT product_id, product_code, product_name, loan_category, min_amount, max_amount,
      base_interest_rate, max_tenure_months, is_collateral_required, processing_fee_percentage
      FROM warehouse.dim_loan_product`,
  },
  officers: {
    label: 'Officers',
    columns: ['officer_id', 'employee_code', 'branch_id', 'role_title', 'status'],
    search: ['officer_id', 'employee_code', 'branch_id', 'role_title', 'status'],
    order: 'employee_code',
    sql: `SELECT officer_id, employee_code, branch_id, role_title, status FROM warehouse.dim_loan_officer`,
  },
  disbursements: {
    label: 'Disbursements',
    columns: ['disbursement_id', 'loan_id', 'customer_id', 'loan_type', 'officer_code', 'disbursement_date', 'disbursed_amount', 'disbursement_method'],
    search: ['disbursement.disbursement_id', 'loan.loan_id', 'customer.customer_id', 'loan.loan_type', 'officer.employee_code', 'disbursement.disbursement_method'],
    order: 'disbursement_date DESC, disbursement_id DESC',
    sql: `SELECT disbursement.disbursement_id, loan.loan_id, customer.customer_id, loan.loan_type,
      officer.employee_code AS officer_code, date_dim.full_date AS disbursement_date,
      disbursement.disbursed_amount, disbursement.disbursement_method
      FROM warehouse.fact_loan_disbursement disbursement
      LEFT JOIN warehouse.fact_loan loan ON loan.loan_id = disbursement.loan_id
      LEFT JOIN warehouse.dim_customer customer ON customer.customer_key = loan.customer_key
      LEFT JOIN warehouse.dim_loan_officer officer ON officer.officer_key = disbursement.officer_key
      LEFT JOIN warehouse.dim_date date_dim ON date_dim.date_key = disbursement.date_key`,
  },
  schedules: {
    label: 'Repayment schedule',
    columns: ['schedule_id', 'loan_id', 'installment_number', 'due_date', 'paid_date', 'installment_amount', 'principal_component', 'interest_component', 'status'],
    search: ['schedule.schedule_id', 'schedule.loan_id', 'schedule.status'],
    order: 'due_date DESC, schedule_id DESC',
    sql: `SELECT schedule.schedule_id, schedule.loan_id, schedule.installment_number,
      due_date.full_date AS due_date, paid_date.full_date AS paid_date,
      schedule.installment_amount, schedule.principal_component, schedule.interest_component, schedule.status
      FROM warehouse.fact_loan_repayment_schedule schedule
      LEFT JOIN warehouse.dim_date due_date ON due_date.date_key = schedule.due_date_key
      LEFT JOIN warehouse.dim_date paid_date ON paid_date.date_key = schedule.paid_date_key`,
  },
  collateral: {
    label: 'Collateral',
    columns: ['collateral_id', 'loan_id', 'collateral_type', 'valuation_date', 'valuation_amount', 'status'],
    search: ['collateral.collateral_id', 'collateral.loan_id', 'collateral.collateral_type', 'collateral.status'],
    order: 'valuation_date DESC, collateral_id DESC',
    sql: `SELECT collateral.collateral_id, collateral.loan_id, collateral.collateral_type,
      date_dim.full_date AS valuation_date, collateral.valuation_amount, collateral.status
      FROM warehouse.fact_loan_collateral collateral
      LEFT JOIN warehouse.dim_date date_dim ON date_dim.date_key = collateral.valuation_date_key`,
  },
  guarantors: {
    label: 'Guarantors',
    columns: ['guarantor_id', 'loan_id', 'relationship_to_borrower', 'monthly_income', 'guarantee_amount'],
    search: ['guarantor_id', 'loan_id', 'relationship_to_borrower'],
    order: 'guarantor_id DESC',
    sql: `SELECT guarantor_id, loan_id, relationship_to_borrower, monthly_income, guarantee_amount
      FROM warehouse.fact_loan_guarantor`,
  },
  fees: {
    label: 'Fees & penalties',
    columns: ['fee_id', 'loan_id', 'fee_type', 'assessed_date', 'amount', 'status', 'settled_date'],
    search: ['fee.fee_id', 'fee.loan_id', 'fee.fee_type', 'fee.status'],
    order: 'assessed_date DESC, fee_id DESC',
    sql: `SELECT fee.fee_id, fee.loan_id, fee.fee_type, assessed_date.full_date AS assessed_date,
      fee.amount, fee.status, settled_date.full_date AS settled_date
      FROM warehouse.fact_loan_fee fee
      LEFT JOIN warehouse.dim_date assessed_date ON assessed_date.date_key = fee.assessed_date_key
      LEFT JOIN warehouse.dim_date settled_date ON settled_date.date_key = fee.settled_date_key`,
  },
  recovery: {
    label: 'Recovery actions',
    columns: ['action_id', 'loan_id', 'officer_code', 'action_date', 'action_type', 'next_followup_date'],
    search: ['action.action_id', 'action.loan_id', 'officer.employee_code', 'action.action_type'],
    order: 'action_date DESC, action_id DESC',
    sql: `SELECT action.action_id, action.loan_id, officer.employee_code AS officer_code,
      action_date.full_date AS action_date, action.action_type, followup_date.full_date AS next_followup_date
      FROM warehouse.fact_loan_recovery_action action
      LEFT JOIN warehouse.dim_loan_officer officer ON officer.officer_key = action.officer_key
      LEFT JOIN warehouse.dim_date action_date ON action_date.date_key = action.action_date_key
      LEFT JOIN warehouse.dim_date followup_date ON followup_date.date_key = action.next_followup_date_key`,
  },
  'loan-audit': {
    label: 'Loan audit',
    columns: ['audit_id', 'loan_id', 'event_date', 'action_type', 'old_status', 'new_status', 'old_amount', 'new_amount', 'old_interest_rate', 'new_interest_rate'],
    search: ['audit.audit_id', 'audit.loan_id', 'audit.action_type', 'audit.old_status', 'audit.new_status'],
    order: 'event_date DESC, audit_id DESC',
    sql: `SELECT audit.audit_id, audit.loan_id, date_dim.full_date AS event_date, audit.action_type,
      audit.old_status, audit.new_status, audit.old_amount, audit.new_amount,
      audit.old_interest_rate, audit.new_interest_rate
      FROM warehouse.fact_loan_audit audit
      LEFT JOIN warehouse.dim_date date_dim ON date_dim.date_key = audit.date_key`,
  },
  'payment-audit': {
    label: 'Payment audit',
    columns: ['audit_id', 'payment_id', 'loan_id', 'event_date', 'action_type', 'old_amount', 'new_amount', 'old_status', 'new_status'],
    search: ['audit.audit_id', 'audit.payment_id', 'audit.loan_id', 'audit.action_type', 'audit.old_status', 'audit.new_status'],
    order: 'event_date DESC, audit_id DESC',
    sql: `SELECT audit.audit_id, audit.payment_id, audit.loan_id, date_dim.full_date AS event_date,
      audit.action_type, audit.old_amount, audit.new_amount, audit.old_status, audit.new_status
      FROM warehouse.fact_loan_payment_audit audit
      LEFT JOIN warehouse.dim_date date_dim ON date_dim.date_key = audit.date_key`,
  },
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
    const layerCounts = Promise.all(Object.entries(layerTables).map(([layer, tables]) => {
      const rowCount = tables.map((table) => `(SELECT COUNT(*) FROM warehouse.${table})`).join(' + ')
      return query(`SELECT ? AS layer, ${rowCount} AS rows_loaded, ? AS tables_loaded`, [layer, tables.length])
    }))
    const [countsByLayer, currencies, volume, runs] = await Promise.all([
      layerCounts,
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

    const counts = countsByLayer.flat()

    const [transactionMetrics, qualityMetrics] = await Promise.all([
      query(`SELECT COUNT(*) AS count, COALESCE(SUM(lkr_amount), 0) AS reporting_volume FROM warehouse.fact_transaction`),
      query(`SELECT COUNT(*) AS total, SUM(account_key IS NULL OR date_key IS NULL OR currency_key IS NULL) AS failed FROM warehouse.fact_transaction`),
    ])

    const layerMap = new Map(counts.map((layer) => [layer.layer, layer]))
    const latestRunByLayer = new Map()
    runs.forEach((run) => {
      const current = latestRunByLayer.get(run.layer)
      if (!current || String(run.latest_run || '') > String(current.latest_run || '')) latestRunByLayer.set(run.layer, run)
    })
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
        status: latestRunByLayer.get(label)?.status === 'FAILED'
          ? 'Needs attention'
          : latestRunByLayer.get(label)?.status === 'RUNNING'
            ? 'Processing'
            : latestRunByLayer.has(label) ? 'Healthy' : 'Not run',
        accent: label === 'Bronze' ? 'amber' : label === 'Silver' ? 'cyan' : 'lime',
      })),
      volume,
      currencyMix: currencies,
      runs,
      lastSync: [...latestRunByLayer.values()].map((run) => run.latest_run).filter(Boolean).sort().at(-1) || null,
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
          (SELECT COUNT(*) FROM warehouse.fact_loan_application) AS application_count,
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
        SELECT COALESCE(product.product_name, 'Unspecified product') AS label,
          COUNT(*) AS application_count, COALESCE(SUM(application.applied_amount), 0) AS applied_amount
        FROM warehouse.fact_loan_application application
        LEFT JOIN warehouse.dim_loan_product product ON product.product_key = application.product_key
        GROUP BY product.product_key, product.product_name
        ORDER BY applied_amount DESC
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
    const [summary, products, statuses, operations] = await Promise.all([
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
      query(`
        SELECT
          (SELECT COUNT(*) FROM warehouse.fact_loan_application) AS applications,
          (SELECT COUNT(*) FROM warehouse.fact_loan_application WHERE approval_status IN ('Submitted', 'Under Review', 'Pending')) AS pending_applications,
          (SELECT COUNT(*) FROM warehouse.fact_loan_disbursement) AS disbursements,
          (SELECT COALESCE(SUM(disbursed_amount), 0) FROM warehouse.fact_loan_disbursement) AS disbursed_amount,
          (SELECT COUNT(*) FROM warehouse.fact_loan_repayment_schedule WHERE status = 'Pending') AS pending_installments,
          (SELECT COUNT(*) FROM warehouse.fact_loan_collateral) AS collateral_records,
          (SELECT COALESCE(SUM(valuation_amount), 0) FROM warehouse.fact_loan_collateral) AS collateral_value,
          (SELECT COUNT(*) FROM warehouse.fact_loan_guarantor) AS guarantors,
          (SELECT COUNT(*) FROM warehouse.fact_loan_fee WHERE status <> 'Paid' AND status <> 'Settled') AS open_fees,
          (SELECT COALESCE(SUM(amount), 0) FROM warehouse.fact_loan_fee WHERE status <> 'Paid' AND status <> 'Settled') AS open_fee_amount,
          (SELECT COUNT(*) FROM warehouse.fact_loan_recovery_action) AS recovery_actions,
          (SELECT COUNT(*) FROM warehouse.fact_loan_audit) AS loan_audit_events,
          (SELECT COUNT(*) FROM warehouse.fact_loan_payment_audit) AS payment_audit_events
      `),
    ])

    response.json({ summary: summary[0], products, statuses, operations: operations[0] })
  } catch (error) {
    handleError(response, error)
  }
})

app.get('/api/warehouse/loan-operations/:dataset', async (request, response) => {
  try {
    const dataset = loanOperationDatasets[request.params.dataset]
    if (!dataset) return response.status(404).json({ error: 'Unknown loan operations dataset' })

    const searchText = typeof request.query.search === 'string' ? request.query.search.trim().slice(0, 100) : ''
    const limit = Math.min(Math.max(Number.parseInt(request.query.limit, 10) || 50, 1), 100)
    const offset = Math.max(Number.parseInt(request.query.offset, 10) || 0, 0)
    const predicates = dataset.search.map((column) => `CAST(${column} AS CHAR) LIKE ?`).join(' OR ')
    const where = searchText ? `WHERE (${predicates})` : ''
    const parameters = searchText ? dataset.search.map(() => `%${searchText}%`) : []

    const [rows, total] = await Promise.all([
      query(`${dataset.sql} ${where} ORDER BY ${dataset.order} LIMIT ? OFFSET ?`, [...parameters, limit, offset]),
      query(`SELECT COUNT(*) AS total FROM (${dataset.sql} ${where}) result_rows`, parameters),
    ])

    response.json({
      dataset: request.params.dataset,
      label: dataset.label,
      columns: dataset.columns,
      rows,
      total: Number(total[0]?.total || 0),
      limit,
      offset,
    })
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
    const coverageChecks = [
      ['Loan facilities', 'silver_loans', 'fact_loan'],
      ['Applications', 'silver_loan_applications', 'fact_loan_application'],
      ['Loan products', 'silver_loan_products', 'dim_loan_product'],
      ['Loan officers', 'silver_loan_officers', 'dim_loan_officer'],
      ['Disbursements', 'silver_loan_disbursements', 'fact_loan_disbursement'],
      ['Repayment schedules', 'silver_loan_repayment_schedules', 'fact_loan_repayment_schedule'],
      ['Collateral valuations', 'silver_loan_collaterals', 'fact_loan_collateral'],
      ['Guarantor records', 'silver_loan_guarantors', 'fact_loan_guarantor'],
      ['Fees and penalties', 'silver_loan_fees_and_penalties', 'fact_loan_fee'],
      ['Recovery actions', 'silver_loan_recovery_actions', 'fact_loan_recovery_action'],
      ['Loan audit events', 'silver_loan_audit_log', 'fact_loan_audit'],
      ['Payment audit events', 'silver_loan_payment_audit_log', 'fact_loan_payment_audit'],
      ['Exchange rates', 'silver_exchange_rates', 'fact_exchange_rate'],
    ]
    const [transactionCheck, paymentsCheck, ...coverage] = await Promise.all([
      query(`SELECT COUNT(*) AS total, SUM(date_key IS NULL OR account_key IS NULL OR currency_key IS NULL) AS failed FROM warehouse.fact_transaction`),
      query(`SELECT (SELECT COUNT(*) FROM warehouse.silver_loan_payments) AS silver_total, COUNT(*) AS total FROM warehouse.fact_loan_payment`),
      ...coverageChecks.map(([, silverTable, goldTable]) => query(`SELECT (SELECT COUNT(*) FROM warehouse.${silverTable}) AS silver_total, COUNT(*) AS total FROM warehouse.${goldTable}`)),
    ])
    const transaction = transactionCheck[0]
    const checkRows = [{
      label: 'Transaction dimension integrity',
      detail: `${transaction.total} Gold transaction rows checked`,
      failed: Number(transaction.failed || 0),
      total: Number(transaction.total || 0),
    }, {
      label: 'Loan payment layer reconciliation',
      detail: `${paymentsCheck[0].silver_total} Silver / ${paymentsCheck[0].total} Gold payment rows`,
      failed: Number(paymentsCheck[0].silver_total) === Number(paymentsCheck[0].total) ? 0 : Math.abs(Number(paymentsCheck[0].silver_total) - Number(paymentsCheck[0].total)),
      total: Number(paymentsCheck[0].silver_total || 0),
    }, ...coverageChecks.map(([label], index) => ({
      label: `${label} layer reconciliation`,
      detail: `${coverage[index][0].silver_total} Silver / ${coverage[index][0].total} Gold rows`,
      failed: Number(coverage[index][0].silver_total) === Number(coverage[index][0].total) ? 0 : Math.abs(Number(coverage[index][0].silver_total) - Number(coverage[index][0].total)),
      total: Number(coverage[index][0].silver_total || 0),
    }))]
    checkRows.forEach((check) => {
      check.result = check.failed === 0 ? 'Passed' : 'Review'
      check.score = check.total ? Math.round(((check.total - check.failed) / check.total) * 100) : (check.failed === 0 ? 100 : 0)
    })
    const totalRows = checkRows.reduce((sum, check) => sum + check.total, 0)
    const totalFailures = checkRows.reduce((sum, check) => sum + check.failed, 0)
    response.json({
      score: totalRows ? Math.round(((totalRows - totalFailures) / totalRows) * 1000) / 10 : null,
      checks: checkRows,
    })
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
