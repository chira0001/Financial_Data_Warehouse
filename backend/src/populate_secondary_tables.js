import mysql from 'mysql2/promise'

async function populate() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '1234',
    database: 'banking_loan_source',
  })

  console.log('Connected to MySQL banking_loan_source...')

  const [loans] = await conn.query(
    'SELECT loan_id, customer_id, loan_type, loan_amount FROM loans WHERE loan_id <= 1300 OR loan_id >= 2000'
  )
  console.log(`Analyzing ${loans.length} loans for collateral and guarantor enrichment...`)

  const [existingCol] = await conn.query('SELECT COALESCE(MAX(collateral_id), 500) AS max_c FROM loan_collaterals')
  let colId = (existingCol[0]?.max_c || 500) + 1

  const [existingG] = await conn.query('SELECT COALESCE(MAX(guarantor_id), 500) AS max_g FROM loan_guarantors')
  let gId = (existingG[0]?.max_g || 500) + 1

  const [existingA] = await conn.query('SELECT COALESCE(MAX(application_id), 7000) AS max_a FROM loan_applications')
  let aId = (existingA[0]?.max_a || 7000) + 1

  let insertedCol = 0
  let insertedG = 0
  let insertedApp = 0

  const valuers = [
    'Lanka Valuers (Pvt) Ltd',
    'Chartered Valuers Colombo',
    'Ernst & Associates Valuers',
    'Central Valuation Bureau',
  ]
  const employers = [
    'Ministry of Education',
    'Dialog Axiata PLC',
    'Commercial Bank of Ceylon',
    'Hayleys PLC',
    'John Keells Holdings',
    'General Hospital Colombo',
  ]

  for (const l of loans) {
    const [cCheck] = await conn.query('SELECT 1 FROM loan_collaterals WHERE loan_id = ?', [l.loan_id])
    if (cCheck.length === 0 && (l.loan_type === 'Housing' || l.loan_type === 'Vehicle' || l.loan_type === 'Business')) {
      const type = l.loan_type === 'Housing' ? 'Real Estate' : l.loan_type === 'Vehicle' ? 'Vehicle' : 'Commercial Equipment'
      const desc =
        l.loan_type === 'Housing'
          ? 'Prime Residential Property & Two-Story House (Title Deed Verified)'
          : l.loan_type === 'Vehicle'
          ? 'Registered Hybrid Motor Vehicle / Chassis Verified'
          : 'Industrial Machinery & Inventory Fixed Charge'
      const valAmount = Math.round(Number(l.loan_amount) * (1.3 + Math.random() * 0.4))
      const valuer = valuers[Math.floor(Math.random() * valuers.length)]
      const docRef =
        l.loan_type === 'Housing'
          ? `DEED-${l.loan_id}-LK`
          : l.loan_type === 'Vehicle'
          ? `CR-${l.loan_id}-WP`
          : `LIEN-${l.loan_id}`
      const monthsAgo = Math.floor(Math.random() * 12) + 1

      await conn.query(
        `INSERT INTO loan_collaterals 
          (collateral_id, loan_id, collateral_type, collateral_description, valuation_amount, valuation_date, valuer_name, document_reference, status)
        VALUES (?, ?, ?, ?, ?, CURDATE() - INTERVAL ? MONTH, ?, ?, 'Active')`,
        [colId++, l.loan_id, type, desc, valAmount, monthsAgo, valuer, docRef]
      )
      insertedCol++
    }

    const [gCheck] = await conn.query('SELECT 1 FROM loan_guarantors WHERE loan_id = ?', [l.loan_id])
    if (gCheck.length === 0 && (l.loan_type === 'Personal' || l.loan_type === 'Education' || l.loan_id >= 2000)) {
      const relationships = ['Brother', 'Uncle', 'Parent', 'Colleague', 'Business Partner']
      const rel = relationships[Math.floor(Math.random() * relationships.length)]
      const names = [
        'Sunil Shantha',
        'Kolitha Wickramasinghe',
        'Nalaka Bandara',
        'Chandana Rajapaksa',
        'Priyantha De Silva',
        'Anura Perera',
      ]
      const gName = names[Math.floor(Math.random() * names.length)]
      const nic = `19${Math.floor(70 + Math.random() * 25)}${Math.floor(10000000 + Math.random() * 90000000)}`
      const emp = employers[Math.floor(Math.random() * employers.length)]
      const inc = Math.round(150000 + Math.random() * 200000)

      await conn.query(
        `INSERT INTO loan_guarantors
          (guarantor_id, loan_id, guarantor_name, nic_number, relationship_to_borrower, phone_number, monthly_income, employer_name, guarantee_amount)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          gId++,
          l.loan_id,
          gName,
          nic,
          rel,
          `077-${Math.floor(1000000 + Math.random() * 9000000)}`,
          inc,
          emp,
          l.loan_amount,
        ]
      )
      insertedG++
    }

    const [aCheck] = await conn.query('SELECT 1 FROM loan_applications WHERE customer_id = ?', [l.customer_id])
    if (aCheck.length === 0 && insertedApp < 80) {
      const prodMap = { Personal: 'PRD01', Housing: 'PRD02', Vehicle: 'PRD03', Education: 'PRD04', Business: 'PRD05' }
      const prd = prodMap[l.loan_type] || 'PRD01'
      const score = Math.floor(660 + Math.random() * 160)
      await conn.query(
        `INSERT INTO loan_applications
          (application_id, customer_id, product_id, assigned_officer_id, applied_amount, requested_tenure_months, application_date, credit_score, approval_status, approved_amount, approval_date, decision_notes)
        VALUES (?, ?, ?, 101, ?, 36, CURDATE() - INTERVAL 1 MONTH, ?, 'Approved', ?, CURDATE() - INTERVAL 1 MONTH, 'Automated credit score and collateral verification passed')`,
        [aId++, l.customer_id, prd, l.loan_amount, score, l.loan_amount]
      )
      insertedApp++
    }
  }

  await conn.query('DELETE FROM loan_collaterals WHERE loan_id = 2008')
  await conn.query(
    `INSERT INTO loan_collaterals 
      (collateral_id, loan_id, collateral_type, collateral_description, valuation_amount, valuation_date, valuer_name, document_reference, status)
    VALUES (?, 2008, 'Real Estate', 'Luxury Residential Land & 2-Story Villa, Kandy (Lot 42A)', 4500000.00, CURDATE(), 'Ernst & Associates Chartered Valuers', 'DEED-KD-88291', 'Active')`,
    [colId++]
  )

  await conn.query('DELETE FROM loan_guarantors WHERE loan_id = 2008')
  await conn.query(
    `INSERT INTO loan_guarantors
      (guarantor_id, loan_id, guarantor_name, nic_number, relationship_to_borrower, phone_number, monthly_income, employer_name, guarantee_amount)
    VALUES (?, 2008, 'Dr. Sunimal Perera', '197824102948', 'Uncle / Family Physician', '077-4928172', 350000.00, 'Kandy National Hospital', 2500000.00)`,
    [gId++]
  )

  console.log(`Enrichment complete!`)
  console.log(`- Collaterals added: ${insertedCol}`)
  console.log(`- Guarantors added: ${insertedG}`)
  console.log(`- Applications added: ${insertedApp}`)

  const [[cCount]] = await conn.query('SELECT COUNT(*) as count FROM loan_collaterals')
  const [[gCount]] = await conn.query('SELECT COUNT(*) as count FROM loan_guarantors')
  const [[aCount]] = await conn.query('SELECT COUNT(*) as count FROM loan_applications')
  console.log(`New Totals in Database:`)
  console.log(`  loan_collaterals: ${cCount.count}`)
  console.log(`  loan_guarantors: ${gCount.count}`)
  console.log(`  loan_applications: ${aCount.count}`)

  await conn.end()
}

populate().catch(console.error)
