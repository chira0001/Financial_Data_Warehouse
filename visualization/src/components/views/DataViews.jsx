import { useEffect, useState } from 'react'
import { warehouseApi } from '../../api/warehouseApi'
import SectionHeader from '../shared/SectionHeader'
import StatusPill from '../shared/StatusPill'
import { sriLankaBoundaryPaths, sriLankaMapBounds, sriLankaMapFrame } from '../../data/sriLankaMap'
import './LoanOperations.css'

const formatCurrency = (value) => `LKR ${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
const transactionCountFormatter = new Intl.NumberFormat()

function EmptyResults({ message, loading, error }) {
  return <div className="empty-data"><strong>{loading ? 'Loading warehouse data' : error ? 'Warehouse request failed' : 'No warehouse data available'}</strong><span>{error || message}</span></div>
}

function RankedBars({ rows, valueKey, valueFormatter = (value) => Number(value).toLocaleString() }) {
  const maximum = Math.max(...rows.map((row) => Number(row[valueKey] || 0)), 0)
  return <div className="summary-bars">{rows.map((row) => {
    const value = Number(row[valueKey] || 0)
    return <div className="summary-bar-row" key={row.label}>
      <span title={row.label}>{row.label}</span>
      <div className="summary-bar-track"><i style={{ width: `${maximum ? Math.max((value / maximum) * 100, 2) : 0}%` }} /></div>
      <strong>{valueFormatter(value)}</strong>
    </div>
  })}</div>
}

const branchCoordinates = {
  Colombo: { latitude: 6.9271, longitude: 79.8612 },
  Kandy: { latitude: 7.2906, longitude: 80.6337 },
  Galle: { latitude: 6.0535, longitude: 80.221 },
  Jaffna: { latitude: 9.6615, longitude: 80.0255 },
  Negombo: { latitude: 7.2083, longitude: 79.8358 },
  Kurunegala: { latitude: 7.4863, longitude: 80.3623 },
  Matara: { latitude: 5.9549, longitude: 80.555 },
  'Nuwara Eliya': { latitude: 6.9497, longitude: 80.7891 },
  Batticaloa: { latitude: 7.731, longitude: 81.6747 },
  Anuradhapura: { latitude: 8.3114, longitude: 80.4037 },
}

function projectBranch(city) {
  const location = branchCoordinates[city]
  if (!location) return null
  return {
    x: sriLankaMapFrame.left + ((location.longitude - sriLankaMapBounds.west) / (sriLankaMapBounds.east - sriLankaMapBounds.west)) * sriLankaMapFrame.width,
    y: sriLankaMapFrame.top + ((sriLankaMapBounds.north - location.latitude) / (sriLankaMapBounds.north - sriLankaMapBounds.south)) * sriLankaMapFrame.height,
  }
}

function groupBranchActivity(rows) {
  const branches = new Map()
  rows.forEach((row) => {
    const key = row.branch_key == null ? `unassigned-${row.branch_name}` : String(row.branch_key)
    if (!branches.has(key)) {
      branches.set(key, {
        key,
        branchName: row.branch_name,
        city: row.city,
        province: row.province,
        currencies: [],
      })
    }
    const branch = branches.get(key)
    branch.currencies.push({
      code: row.currency_code,
      count: Number(row.transaction_count || 0),
    })
  })

  return [...branches.values()].map((branch) => {
    const currencies = branch.currencies.sort((left, right) =>
      right.count - left.count || left.code.localeCompare(right.code))
    return {
      ...branch,
      currencies,
      total: currencies.reduce((sum, currency) => sum + currency.count, 0),
      currencyCount: currencies.length,
    }
  }).sort((left, right) => right.total - left.total || left.branchName.localeCompare(right.branchName))
}

function BranchDetailDialog({ branch, onClose }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const maximum = Math.max(...branch.currencies.map((currency) => currency.count), 0)
  const averageTransactions = branch.currencyCount ? Math.round(branch.total / branch.currencyCount) : 0

  return <div className="branch-dialog-backdrop" onMouseDown={(event) => {
    if (event.target === event.currentTarget) onClose()
  }}>
    <section className="branch-dialog" role="dialog" aria-modal="true" aria-labelledby="branch-dialog-title">
      <button className="branch-dialog-close" type="button" aria-label="Close branch summary" onClick={onClose}>×</button>
      <span className="eyebrow">Branch currency activity / {branch.province}</span>
      <h2 id="branch-dialog-title">{branch.branchName}</h2>
      <p className="branch-dialog-location">{branch.city}, Sri Lanka</p>
      <div className="branch-dialog-metrics">
        <article><span>Transactions</span><strong>{transactionCountFormatter.format(branch.total)}</strong></article>
        <article><span>Currencies used</span><strong>{branch.currencyCount.toLocaleString()}</strong></article>
        <article><span>Average per currency</span><strong>{transactionCountFormatter.format(averageTransactions)}</strong></article>
      </div>
      <h3>Transactions by currency</h3>
      <div className="branch-detail-chart" role="img" aria-label={`${branch.currencyCount} currencies used by ${branch.branchName}, ranked by transaction count`}>
        {branch.currencies.map((currency) => <div className="branch-detail-row" key={currency.code}>
          <b>{currency.code}</b>
          <div className="branch-detail-track" aria-hidden="true"><i style={{ width: `${maximum ? (currency.count / maximum) * 100 : 0}%` }} /></div>
          <strong>{transactionCountFormatter.format(currency.count)}</strong>
        </div>)}
      </div>
    </section>
  </div>
}

function BranchActivityMap({ rows }) {
  const [selectedBranch, setSelectedBranch] = useState(null)
  const branches = groupBranchActivity(rows)
  const mappedBranches = branches.map((branch) => ({ ...branch, point: projectBranch(branch.city) }))
  const multiCurrencyBranches = branches.filter((branch) => branch.currencyCount > 1)
  const maximum = Math.max(...branches.map((branch) => branch.total), 0)

  return <>
    <div className="branch-map-layout">
      <div className="branch-map" aria-label="Map of Sri Lanka showing transaction activity at branches">
        <svg className="sri-lanka-map" viewBox="0 0 430 570" role="img" aria-label="Sri Lanka map with branch locations">
          <g className="sri-lanka-map-shadow" aria-hidden="true">
            {sriLankaBoundaryPaths.map((path) => <path d={path} key={path} />)}
          </g>
          <g className="sri-lanka-map-shape" aria-hidden="true">
            {sriLankaBoundaryPaths.map((path) => <path d={path} key={path} />)}
          </g>
          {mappedBranches.filter((branch) => branch.point).map((branch) => {
            const radius = 5 + (maximum ? Math.sqrt(branch.total / maximum) * 5 : 0)
            return <g className="branch-map-marker" key={branch.key} transform={`translate(${branch.point.x} ${branch.point.y})`}>
              <circle className="branch-map-marker-halo" r={radius + 4} />
              <circle className="branch-map-marker-dot" r={radius} />
              <text className="branch-map-marker-label" x="12" y="4">{branch.city}</text>
              <title>{`${branch.branchName}: ${transactionCountFormatter.format(branch.total)} transactions across ${branch.currencyCount} currencies`}</title>
            </g>
          })}
        </svg>
        {mappedBranches.filter((branch) => branch.point).map((branch) => <button
          key={branch.key}
          className="branch-map-hit-area"
          style={{
            left: `${(branch.point.x / 430) * 100}%`,
            top: `${(branch.point.y / 570) * 100}%`,
          }}
          type="button"
          aria-label={`Open ${branch.branchName} summary: ${transactionCountFormatter.format(branch.total)} transactions across ${branch.currencyCount} currencies`}
          onClick={() => setSelectedBranch(branch)}
        />)}
      </div>
      <aside className="branch-quick-glance">
        <span className="eyebrow">Quick glance</span>
        <h3>Multi-currency branches</h3>
        {multiCurrencyBranches.length ? <div className="branch-glance-list">
          {multiCurrencyBranches.map((branch) => <button className="branch-glance-card" type="button" key={branch.key} onClick={() => setSelectedBranch(branch)}>
            <span><b>{branch.branchName}</b><small>{branch.currencyCount} currencies · {transactionCountFormatter.format(branch.total)} transactions</small></span>
            <span className="branch-glance-currencies">{branch.currencies.slice(0, 3).map((currency) => <i key={currency.code}>{currency.code} {transactionCountFormatter.format(currency.count)}</i>)}</span>
            <strong>Details →</strong>
          </button>)}
        </div> : <p className="branch-glance-empty">No branches have activity in multiple currencies.</p>}
      </aside>
    </div>
    <div className="branch-map-footer"><span><i /> Branch marker size reflects transaction count</span>    <span>Click a marker or summary to view details</span>
    <a href="https://www.naturalearthdata.com/" target="_blank" rel="noreferrer">Map boundary: Natural Earth</a>
      </div>
    {selectedBranch && <BranchDetailDialog branch={selectedBranch} onClose={() => setSelectedBranch(null)} />}
  </>
}

export function TransactionsView() {
  const [query, setQuery] = useState('')
  const [state, setState] = useState({ summary: null, byType: [], byCurrency: [], loading: true, error: '' })
  useEffect(() => {
    let active = true
    warehouseApi.transactionSummary(query).then((data) => {
      if (active) setState({ summary: data.summary, byType: data.byType || [], byCurrency: data.byCurrency || [], loading: false, error: '' })
    }).catch((error) => {
      if (active) setState((current) => ({ ...current, loading: false, error: error.message }))
    })
    return () => { active = false }
  }, [query])

  const totalCount = Number(state.summary?.transaction_count || 0)
  const totalVolume = Number(state.summary?.reporting_volume || 0)
  const averageValue = Number(state.summary?.average_transaction || 0)

  return <div className="view-stack">
    <div className="view-toolbar"><label className="search-field"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search transaction, account, currency..." /></label><span className="result-count">{totalCount.toLocaleString()} matching records · full-table summary</span></div>
    <div className="summary-metric-grid">
      <article className="summary-metric"><span>Matched transactions</span><strong>{totalCount.toLocaleString()}</strong><small>{query ? `Search: “${query}”` : 'Every transaction in Gold'}</small></article>
      <article className="summary-metric"><span>Reporting value</span><strong>{formatCurrency(totalVolume)}</strong><small>Total across matched records</small></article>
      <article className="summary-metric"><span>Average transaction</span><strong>{formatCurrency(averageValue)}</strong><small>Mean reporting value per record</small></article>
    </div>
    {state.error ? <EmptyResults loading={state.loading} error={state.error} message="Load fact_transaction to summarize transaction activity." /> : state.loading && !state.summary ? <EmptyResults loading={state.loading} message="Summarizing all fact_transaction records." /> : totalCount === 0 ? <EmptyResults loading={state.loading} message="No transactions match this search." /> : <div className="summary-grid">
      <section className="panel summary-panel"><SectionHeader eyebrow="Transaction mix / type" title="Value by transaction type" /><RankedBars rows={state.byType} valueKey="reporting_volume" valueFormatter={formatCurrency} />{state.byType[0] && <p className="summary-note">{state.byType[0].label} leads with {Number(state.byType[0].transaction_count).toLocaleString()} transactions across the full matching set.</p>}</section>
      <section className="panel summary-panel summary-wide"><SectionHeader eyebrow="Currency mix / branch" title="Branch activity across currencies" /><BranchActivityMap rows={state.byCurrency} />{state.byCurrency[0] && <p className="summary-note">The busiest branch and currency combination is {state.byCurrency[0].currency_code} at {state.byCurrency[0].branch_name}, with {Number(state.byCurrency[0].transaction_count).toLocaleString()} matching transactions.</p>}</section>
    </div>}
  </div>
}

export function LoansView({ refreshKey = 0 }) {
  const [state, setState] = useState({ summary: null, products: [], statuses: [], operations: {}, loading: true, error: '' })
  useEffect(() => {
    warehouseApi.loanSummary().then((data) => setState({ summary: data.summary, products: data.products || [], statuses: data.statuses || [], operations: data.operations || {}, loading: false, error: '' })).catch((error) => setState((current) => ({ ...current, loading: false, error: error.message })))
  }, [refreshKey])

  const facilityCount = Number(state.summary?.facility_count || 0)
  const principal = Number(state.summary?.principal || 0)
  const paid = Number(state.summary?.payments_tracked || 0)
  const averageRate = Number(state.summary?.average_rate || 0)

  return <div className="view-stack">
    <div className="portfolio-banner"><div><span className="eyebrow">Gold / fact_loan</span><h2>Portfolio at a glance</h2><p>Exposure, repayment progress, pricing, and status summarized across every loan record.</p></div><div className="portfolio-total"><span>Principal tracked</span><strong>{facilityCount ? formatCurrency(principal) : '—'}</strong><b>{facilityCount.toLocaleString()} facilities analyzed</b></div></div>
    {state.error ? <EmptyResults loading={state.loading} error={state.error} message="Load fact_loan and fact_loan_payment to summarize the portfolio." /> : state.loading && !state.summary ? <EmptyResults loading={state.loading} message="Summarizing all fact_loan records." /> : facilityCount === 0 ? <EmptyResults loading={state.loading} message="No loan records are available." /> : <>
      <div className="summary-metric-grid">
        <article className="summary-metric"><span>Facilities</span><strong>{facilityCount.toLocaleString()}</strong><small>All active and historical loans</small></article>
        <article className="summary-metric"><span>Payments tracked</span><strong>{formatCurrency(paid)}</strong><small>{principal ? `${((paid / principal) * 100).toFixed(1)}% of principal value` : 'No principal recorded'}</small></article>
        <article className="summary-metric"><span>Average interest rate</span><strong>{averageRate.toFixed(2)}%</strong><small>Across loaded facilities</small></article>
      </div>
      <section className="operations-metric-grid" aria-label="Customer portal loan operation metrics">
        <article><span>Applications</span><strong>{Number(state.operations.applications || 0).toLocaleString()}</strong><small>{Number(state.operations.pending_applications || 0).toLocaleString()} pending review</small></article>
        <article><span>Disbursements</span><strong>{Number(state.operations.disbursements || 0).toLocaleString()}</strong><small>{formatCurrency(state.operations.disbursed_amount)} released</small></article>
        <article><span>Scheduled installments</span><strong>{Number(state.operations.pending_installments || 0).toLocaleString()}</strong><small>Pending payment</small></article>
        <article><span>Collateral value</span><strong>{formatCurrency(state.operations.collateral_value)}</strong><small>{Number(state.operations.collateral_records || 0).toLocaleString()} valuations</small></article>
        <article><span>Open fees & penalties</span><strong>{Number(state.operations.open_fees || 0).toLocaleString()}</strong><small>{formatCurrency(state.operations.open_fee_amount)} outstanding</small></article>
        <article><span>Recovery actions</span><strong>{Number(state.operations.recovery_actions || 0).toLocaleString()}</strong><small>Collections activity recorded</small></article>
      </section>
      <div className="summary-grid">
        <section className="panel summary-panel"><SectionHeader eyebrow="Portfolio exposure / fact_loan" title="Principal by loan category" /><RankedBars rows={state.products} valueKey="principal" valueFormatter={formatCurrency} />{state.products[0] && <p className="summary-note">{state.products[0].label} is the largest loan category, accounting for {principal ? ((Number(state.products[0].principal) / principal) * 100).toFixed(1) : '0.0'}% of principal across all facilities.</p>}</section>
        <section className="panel summary-panel"><SectionHeader eyebrow="Portfolio health / loan status" title="Facilities by status" /><RankedBars rows={state.statuses} valueKey="loan_count" valueFormatter={(value) => `${value.toLocaleString()} loans`} />{state.statuses[0] && <p className="summary-note">{state.statuses[0].label} is the most common status across all facilities.</p>}</section>
      </div>
    </>}
  </div>
}

const loanOperationTabs = [
  ['facilities', 'Facilities'], ['payments', 'Payments'], ['applications', 'Applications'], ['products', 'Products'], ['officers', 'Officers'],
  ['disbursements', 'Disbursements'], ['schedules', 'Schedules'], ['collateral', 'Collateral'],
  ['guarantors', 'Guarantors'], ['fees', 'Fees & penalties'], ['recovery', 'Recovery'],
  ['loan-audit', 'Loan audit'], ['payment-audit', 'Payment audit'],
]

const displayColumnName = (column) => column.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
const displayCell = (value, column) => {
  if (value == null || value === '') return '—'
  if (column.endsWith('_amount') || ['min_amount', 'max_amount', 'base_interest_rate', 'processing_fee_percentage', 'monthly_income', 'guarantee_amount', 'old_interest_rate', 'new_interest_rate'].includes(column)) {
    const numeric = Number(value)
    return Number.isFinite(numeric) ? numeric.toLocaleString(undefined, { maximumFractionDigits: 2 }) : value
  }
  if (column.startsWith('is_')) return Number(value) ? 'Required' : 'Optional'
  if (typeof value === 'number') return value.toLocaleString()
  return String(value)
}

export function LoanOperationsView({ refreshKey = 0 }) {
  const [dataset, setDataset] = useState('applications')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [state, setState] = useState({ rows: [], columns: [], total: 0, label: '', loading: true, error: '' })
  const pageSize = 50

  useEffect(() => {
    let active = true
    warehouseApi.loanOperations(dataset, { search, limit: pageSize, offset: page * pageSize })
      .then((data) => {
        if (active) setState({ rows: data.rows || [], columns: data.columns || [], total: data.total || 0, label: data.label || '', loading: false, error: '' })
      })
      .catch((error) => {
        if (active) setState((current) => ({ ...current, loading: false, error: error.message }))
      })
    return () => { active = false }
  }, [dataset, search, page, refreshKey])

  const selectDataset = (nextDataset) => {
    setState((current) => ({ ...current, loading: true, error: '' }))
    setDataset(nextDataset)
    setSearch('')
    setPage(0)
  }
  const pageCount = Math.max(1, Math.ceil(state.total / pageSize))

  return <div className="view-stack loan-operations-view">
    <section className="operations-intro">
      <div><span className="eyebrow">Gold / customer portal warehouse</span><h2>Loan servicing, end to end.</h2><p>Explore applications, product rules, servicing events, collateral, collections, and audit history from the analytical layer.</p></div>
      <div className="operations-grain"><span>Current dataset</span><strong>{loanOperationTabs.find(([id]) => id === dataset)?.[1]}</strong><small>One row per source event or reference record</small></div>
    </section>
    <nav className="operations-tabs" aria-label="Loan operation datasets">
      {loanOperationTabs.map(([id, label]) => <button key={id} type="button" className={dataset === id ? 'active' : ''} aria-current={dataset === id ? 'page' : undefined} onClick={() => selectDataset(id)}>{label}</button>)}
    </nav>
    <section className="panel operations-panel">
      <div className="operations-toolbar">
        <div><span className="eyebrow">Gold records</span><h3>{state.label || loanOperationTabs.find(([id]) => id === dataset)?.[1]}</h3></div>
        <label className="operations-search"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => { setState((current) => ({ ...current, loading: true, error: '' })); setSearch(event.target.value); setPage(0) }} placeholder="Search this dataset" aria-label="Search this dataset" /></label>
        <span className="operations-count">{state.total.toLocaleString()} records</span>
      </div>
      {state.error ? <EmptyResults loading={state.loading} error={state.error} message="Load the Gold customer portal tables to view these records." /> : state.loading && state.rows.length === 0 ? <EmptyResults loading message="Loading Gold loan operation records." /> : state.rows.length === 0 ? <EmptyResults message={search ? 'No records match this search.' : 'This Gold dataset has no records yet.'} /> : <>
        <div className="operations-table-wrap"><table className="operations-table"><thead><tr>{state.columns.map((column) => <th key={column}>{displayColumnName(column)}</th>)}</tr></thead><tbody>{state.rows.map((row, index) => <tr key={`${row[state.columns[0]] ?? index}-${index}`}>{state.columns.map((column) => <td key={column} title={row[column] == null ? '' : String(row[column])}>{displayCell(row[column], column)}</td>)}</tr>)}</tbody></table></div>
        <footer className="operations-pagination"><span>Showing {(page * pageSize + 1).toLocaleString()}–{Math.min((page + 1) * pageSize, state.total).toLocaleString()} of {state.total.toLocaleString()}</span><div><button type="button" onClick={() => { setState((current) => ({ ...current, loading: true })); setPage((current) => Math.max(0, current - 1)) }} disabled={page === 0}>Previous</button><b>Page {page + 1} of {pageCount}</b><button type="button" onClick={() => { setState((current) => ({ ...current, loading: true })); setPage((current) => Math.min(pageCount - 1, current + 1)) }} disabled={page + 1 >= pageCount}>Next</button></div></footer>
      </>}
    </section>
  </div>
}

export function QualityView() {
  const [state, setState] = useState({ checks: [], score: null, loading: true, error: '' })
  useEffect(() => {
    warehouseApi.quality().then((data) => setState({ checks: data.checks || [], score: data.score, loading: false, error: '' })).catch((error) => setState({ checks: [], score: null, loading: false, error: error.message }))
  }, [])
  const passed = state.checks.filter((check) => check.result === 'Passed').length
  return <div className="view-stack"><div className="quality-summary"><div><span className="eyebrow">Validation status</span><h2>{state.error ? 'Validation unavailable.' : state.checks.length ? 'Trust, with receipts.' : 'Quality awaits a load.'}</h2><p>Gold checks run after every full refresh and leave an auditable trail in the warehouse.</p></div><div className="quality-score"><strong>{state.score == null ? '—' : state.score}</strong><span>/ 100</span><div className={`score-ring ${state.score == null ? 'empty-ring' : ''}`}><i /></div></div></div><section className="panel checks-panel"><SectionHeader eyebrow="Validation suite" title={state.checks.length ? `${passed} checks passed` : 'No checks recorded'} action="Run checks" />{state.checks.length === 0 ? <div className="empty-data"><strong>{state.loading ? 'Loading quality results' : 'No warehouse quality results yet'}</strong><span>{state.error || 'Run the Gold validation procedure after loading the warehouse.'}</span></div> : <div className="checks-list">{state.checks.map((check) => <div className="check-row" key={check.label}><div className={`check-icon ${check.result === 'Passed' ? 'passed' : 'review'}`}>{check.result}</div><div className="check-copy"><strong>{check.label}</strong><span>{check.detail}</span></div><div className="check-bar"><i style={{ width: `${check.score}%` }} /></div><b className="check-score">{check.score}%</b><StatusPill tone={check.result === 'Passed' ? 'success' : 'warning'}>{check.result}</StatusPill></div>)}</div>}</section></div>
}

const queryGroups = [
  { id: 1, title: 'Transaction operations', range: 'Q01-Q04', description: 'Volume, monthly movement, transaction types, and channels.' },
  { id: 2, title: 'Currency and customers', range: 'Q05-Q08', description: 'Currency activity, branches, top customers, and account types.' },
  { id: 3, title: 'Portfolio summaries', range: 'Q09-Q12', description: 'Branch balances, occupations, loan types, and statuses.' },
  { id: 4, title: 'Rates and payments', range: 'Q13-Q16', description: 'High-interest facilities, payment status, methods, and monthly totals.' },
  { id: 5, title: 'Risk and quality', range: 'Q17-Q20', description: 'Customer exposure, overdue loans, quality gaps, and maturities.' },
]

function formatQueryValue(value, column) {
  const number = Number(value || 0)
  if (/amount|balance|exposure|principal|payment|volume|total/i.test(column)) return formatCurrency(number)
  if (/rate|percent|score/i.test(column)) return `${number.toLocaleString(undefined, { maximumFractionDigits: 2 })}%`
  return number.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

function DistributionLineChart({ rows, valueKey, queryNumber }) {
  const values = rows.map((row) => Number(row[valueKey])).filter(Number.isFinite)
  if (values.length === 0) return null

  const min = Math.min(...values)
  const max = Math.max(...values)
  const binCount = Math.min(8, Math.max(3, Math.ceil(Math.sqrt(values.length))))
  const range = max - min
  const binWidth = range === 0 ? 1 : range / binCount
  const bins = Array.from({ length: range === 0 ? 1 : binCount }, (_, index) => {
    const lower = range === 0 ? min : min + index * binWidth
    const upper = range === 0 ? max : index === binCount - 1 ? max : lower + binWidth
    return { lower, upper, count: 0 }
  })

  values.forEach((value) => {
    const index = range === 0 ? 0 : Math.min(Math.floor((value - min) / binWidth), bins.length - 1)
    bins[index].count += 1
  })

  const maxCount = Math.max(...bins.map((bin) => bin.count), 1)
  const chartPoints = bins.map((bin, index) => ({
    x: bins.length === 1 ? 415 : 58 + (index / (bins.length - 1)) * 700,
    y: 164 - (bin.count / maxCount) * 132,
    label: range === 0 ? formatQueryValue(bin.lower, valueKey) : formatQueryValue(bin.lower, valueKey),
    detail: `${formatQueryValue(bin.lower, valueKey)} to ${formatQueryValue(bin.upper, valueKey)}: ${bin.count} results`,
    count: bin.count,
  }))
  return <QueryLineChart
    points={chartPoints}
    maxValue={maxCount}
    xLabel={valueKey.replaceAll('_', ' ')}
    ariaLabel={`Line chart of ${valueKey.replaceAll('_', ' ')} distribution for query ${queryNumber}`}
  />
}

function MaturityLineChart({ rows }) {
  const buckets = Object.values(rows.reduce((groups, row) => {
    const date = new Date(row.loan_end_date)
    if (Number.isNaN(date.getTime())) return groups
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    groups[key] = groups[key] || { key, label: date.toLocaleString(undefined, { month: 'short', year: '2-digit' }), count: 0, principal: 0 }
    groups[key].count += 1
    groups[key].principal += Number(row.loan_amount || 0)
    return groups
  }, {})).sort((a, b) => a.key.localeCompare(b.key))
  const maxCount = Math.max(...buckets.map((bucket) => bucket.count), 1)

  if (!buckets.length) return null
  const points = buckets.map((bucket, index) => ({
    x: buckets.length === 1 ? 415 : 58 + (index / (buckets.length - 1)) * 700,
    y: 164 - (bucket.count / maxCount) * 132,
    label: bucket.label,
    detail: `${bucket.label}: ${bucket.count} loans, ${formatCurrency(bucket.principal)} principal`,
    count: bucket.count,
  }))
  return <QueryLineChart points={points} maxValue={maxCount} xLabel="Maturity month" ariaLabel="Line chart of active loan maturities by month" />
}

function QueryLineChart({ points, maxValue, xLabel, ariaLabel }) {
  const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
  const guideValues = [0, Math.ceil(maxValue / 2), maxValue]

  return <div className="query-line-chart-wrap">
    <svg className="query-line-chart" viewBox="0 0 800 220" preserveAspectRatio="none" role="img" aria-label={ariaLabel}>
      {guideValues.map((value) => {
        const y = 164 - (value / maxValue) * 132
        return <g key={value}><line className="query-line-guide" x1="52" x2="770" y1={y} y2={y} /><text className="query-line-y-tick" x="45" y={y + 3} textAnchor="end">{value}</text></g>
      })}
      <path className="query-line-path" d={linePath} />
      {points.map((point) => <circle className="query-line-point" key={`${point.label}-${point.x}`} cx={point.x} cy={point.y} r="4"><title>{point.detail}</title></circle>)}
      {points.map((point, index) => {
        const labelInterval = Math.max(1, Math.ceil(points.length / 12))
        if (index % labelInterval !== 0 && index !== points.length - 1) return null
        return <text className="query-line-x-tick" key={`label-${point.label}-${point.x}`} x={point.x} y="187" textAnchor="middle">{point.label}</text>
      })}
      <text className="query-line-axis-label" x="410" y="212" textAnchor="middle">{xLabel}</text>
    </svg>
  </div>
}

function QueryResult({ rows, index, groupId }) {
  const queryNumber = (groupId - 1) * 4 + index + 1
  if (!rows.length) return <div className="query-result-empty">Q{String(queryNumber).padStart(2, '0')} returned no rows.</div>
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))]
  const measures = columns.filter((column) => {
    if (/(^|_)(id|key)(_|$)|date|year|month|day|week/i.test(column)) return false
    const values = rows.map((row) => row[column]).filter((value) => value != null && value !== '')
    return values.length > 0 && values.every((value) => Number.isFinite(Number(value)))
  })
  const categories = columns.filter((column) => !measures.includes(column) && !/(^|_)(id|key)(_|$)/i.test(column))
  const primaryMeasure = measures.find((column) => /amount|balance|exposure|principal|payment|volume|total/i.test(column))
    || measures.find((column) => /count/i.test(column))
    || measures[0]
  const timeSeries = columns.some((column) => /^(calendar_)?(year|month|date|full_date|transaction_date)$/i.test(column))
  const performanceRows = rows
  const total = primaryMeasure ? rows.reduce((sum, row) => sum + Number(row[primaryMeasure] || 0), 0) : 0
  const histogramMeasure = { 13: 'interest_rate', 17: 'exposure', 18: 'loan_amount' }[queryNumber]
  const showDistributionLine = histogramMeasure && measures.includes(histogramMeasure) && rows.length > 1
  const showMaturityLine = queryNumber === 20 && rows.some((row) => row.loan_end_date)
  const categoryLabel = (row, rowIndex) => {
    const orderedCategories = timeSeries
      ? [...categories.filter((column) => /year|month|date/i.test(column)), ...categories.filter((column) => !/year|month|date/i.test(column))]
      : categories
    const values = orderedCategories.slice(0, 2).map((column) => row[column]).filter((value) => value != null && String(value).trim() !== '')
    return values.length ? values.join(' · ') : `Result ${rowIndex + 1}`
  }
  const performanceMax = Math.max(...performanceRows.map((row) => Number(row[primaryMeasure] || 0)), 1)
  const performancePoints = performanceRows.map((row, rowIndex) => {
    const value = Number(row[primaryMeasure] || 0)
    return {
      x: performanceRows.length === 1 ? 415 : 58 + (rowIndex / (performanceRows.length - 1)) * 700,
      y: 164 - (value / performanceMax) * 132,
      label: categoryLabel(row, rowIndex),
      detail: `${categoryLabel(row, rowIndex)}: ${formatQueryValue(value, primaryMeasure)}`,
      count: value,
    }
  })

  return <div className="query-result">
    <div className="query-result-heading"><span className="query-result-label">Q{String(queryNumber).padStart(2, '0')} · {rows.length.toLocaleString()} result{rows.length === 1 ? '' : 's'}</span><strong>{columns.filter((column) => !/id|key/i.test(column)).slice(0, 3).map((column) => column.replaceAll('_', ' ')).join(' · ')}</strong></div>
    {rows.length === 1 && measures.length > 0 ? <div className="query-metric-grid">{measures.slice(0, 4).map((measure) => <article className="query-metric" key={measure}><span>{measure.replaceAll('_', ' ')}</span><strong>{formatQueryValue(rows[0][measure], measure)}</strong></article>)}</div> : primaryMeasure ? <>
      {!showDistributionLine && !showMaturityLine && <div className="query-summary"><strong>{formatQueryValue(total, primaryMeasure)}</strong><span>combined {primaryMeasure.replaceAll('_', ' ')} across {rows.length.toLocaleString()} results</span></div>}
      {showDistributionLine ? <><h4 className="query-chart-title">Distribution of {histogramMeasure.replaceAll('_', ' ')}</h4><DistributionLineChart rows={rows} valueKey={histogramMeasure} queryNumber={queryNumber} /><p className="histogram-note">{rows.length.toLocaleString()} records summarized as points across {histogramMeasure.replaceAll('_', ' ')} ranges.</p></> : showMaturityLine ? <><h4 className="query-chart-title">Upcoming maturity schedule</h4><MaturityLineChart rows={rows} /><p className="histogram-note">{rows.length.toLocaleString()} active loans grouped by expected maturity month.</p></> : <><h4 className="query-chart-title">{timeSeries ? 'Performance over time' : `Top results by ${primaryMeasure.replaceAll('_', ' ')}`}</h4><QueryLineChart points={performancePoints} maxValue={performanceMax} xLabel={timeSeries ? 'Period' : categories[0]?.replaceAll('_', ' ') || 'Result rank'} ariaLabel={`Line chart of ${primaryMeasure.replaceAll('_', ' ')} performance`} /></>}
    </> : <div className="query-category-cards">{rows.map((row, rowIndex) => <article key={rowIndex}><span>{categoryLabel(row, rowIndex)}</span><strong>{columns.filter((column) => column !== categories[0] && !/(^|_)(id|key)(_|$)|date/i.test(column)).map((column) => row[column] == null ? null : `${column.replaceAll('_', ' ')}: ${row[column]}`).filter(Boolean).slice(0, 2).join(' · ') || 'Category result'}</strong></article>)}</div>}
  </div>
}

export function QueryGroupsView() {
  const [groupState, setGroupState] = useState({})

  const runGroup = async (groupId) => {
    setGroupState((current) => ({ ...current, [groupId]: { loading: true, error: '', results: [] } }))
    try {
      const data = await warehouseApi.runQueryGroup(groupId)
      setGroupState((current) => ({ ...current, [groupId]: { loading: false, error: '', results: data.results || [] } }))
    } catch (error) {
      setGroupState((current) => ({ ...current, [groupId]: { loading: false, error: error.message, results: [] } }))
    }
  }

  return <div className="view-stack"><div className="query-intro"><div><span className="eyebrow">SQL / Gold warehouse</span><h2>Five perspectives, one source of truth.</h2><p>Run each member's four-query group independently. Results are distilled into key metrics, category summaries, and ranked comparisons.</p></div><span className="query-count">20 questions<br /><b>5 groups</b></span></div><div className="query-group-grid">{queryGroups.map((group) => { const state = groupState[group.id] || { loading: false, error: '', results: [] }; return <section className="query-group-card panel" key={group.id}><div className="query-group-top"><span className="query-group-number">0{group.id}</span><span className="query-range">{group.range}</span></div><h3>{group.title}</h3><p>{group.description}</p><button className="query-run-button" onClick={() => runGroup(group.id)} disabled={state.loading}>{state.loading ? 'Running group...' : `Run ${group.range}`}</button>{state.error && <div className="query-error">Warehouse result unavailable: {state.error}</div>}{state.results.length > 0 && <div className="query-results">{state.results.map((rows, index) => <QueryResult key={index} rows={rows} index={index} groupId={group.id} />)}</div>}{!state.loading && !state.error && state.results.length === 0 && <div className="query-not-run">Not run yet</div>}</section> })}</div></div>
}
