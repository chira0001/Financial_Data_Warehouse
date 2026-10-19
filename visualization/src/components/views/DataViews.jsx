import { useEffect, useState } from 'react'
import { warehouseApi } from '../../api/warehouseApi'
import SectionHeader from '../shared/SectionHeader'
import StatusPill from '../shared/StatusPill'

function EmptyTable({ message, loading, error }) {
  return <div className="empty-table"><strong>{loading ? 'Loading warehouse records' : error ? 'Warehouse request failed' : 'No warehouse records available'}</strong><span>{error || message}</span></div>
}

export function TransactionsView() {
  const [query, setQuery] = useState('')
  const [state, setState] = useState({ rows: [], loading: true, error: '' })
  useEffect(() => {
    let active = true
    warehouseApi.transactions(query).then((data) => {
      if (active) setState({ rows: data.rows || [], loading: false, error: '' })
    }).catch((error) => {
      if (active) setState({ rows: [], loading: false, error: error.message })
    })
    return () => { active = false }
  }, [query])

  return <div className="view-stack"><div className="view-toolbar"><label className="search-field"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search transaction, account, currency..." /></label><button className="filter-button">All currencies <span>⌄</span></button><button className="filter-button">Last 30 days <span>⌄</span></button><span className="result-count">{state.rows.length} loaded records</span></div><section className="panel data-panel"><SectionHeader eyebrow="Gold / fact_transaction" title="Transaction ledger" action="Export CSV" />{state.rows.length === 0 ? <EmptyTable loading={state.loading} error={state.error} message="Load fact_transaction from the warehouse to inspect transactions." /> : <div className="data-table transaction-table"><div className="data-head"><span>Transaction</span><span>Date</span><span>Account</span><span>Type</span><span>Original</span><span>Reporting value</span><span>Status</span></div>{state.rows.map((row) => <div className="data-row" key={row.id}><span className="mono strong">{row.id}</span><span className="mono muted">{row.date}</span><span className="mono">{row.account}</span><span><span className={`type-mark ${row.type.toLowerCase()}`} />{row.type}</span><span className="amount"><b>{row.currency}</b> {Number(row.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span><span className="amount">LKR {Number(row.lkr).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span><StatusPill tone={row.status === 'Native' ? 'native' : 'success'}>{row.status}</StatusPill></div>)}</div>}</section></div>
}

export function LoansView() {
  const [state, setState] = useState({ rows: [], loading: true, error: '' })
  useEffect(() => {
    warehouseApi.loans().then((data) => setState({ rows: data.rows || [], loading: false, error: '' })).catch((error) => setState({ rows: [], loading: false, error: error.message }))
  }, [])

  return <div className="view-stack"><div className="portfolio-banner"><div><span className="eyebrow">Gold / fact_loan</span><h2>Portfolio at a glance</h2><p>Loan relationships are surfaced with their current dimension links and payment history.</p></div><div className="portfolio-total"><span>Principal tracked</span><strong>{state.rows.length ? `LKR ${state.rows.reduce((total, row) => total + Number(row.amount || 0), 0).toLocaleString()}` : '—'}</strong><b>{state.rows.length ? 'Loaded from warehouse' : 'Awaiting warehouse data'}</b></div></div><section className="panel data-panel"><SectionHeader eyebrow="Loan portfolio" title="Active and historical facilities" action="Export portfolio" />{state.rows.length === 0 ? <EmptyTable loading={state.loading} error={state.error} message="Load fact_loan and fact_loan_payment from the warehouse to inspect facilities." /> : <div className="data-table loan-table"><div className="data-head"><span>Loan ID</span><span>Customer</span><span>Product</span><span>Principal</span><span>Rate</span><span>Paid to date</span><span>Status</span></div>{state.rows.map((row) => <div className="data-row" key={row.id}><span className="mono strong">{row.id}</span><span className="mono">{row.customer}</span><span>{row.type}</span><span className="amount">LKR {Number(row.amount).toLocaleString()}</span><span className="mono">{row.rate}</span><span className="amount">LKR {Number(row.paid).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span><StatusPill tone={row.status === 'Overdue' ? 'danger' : row.status === 'Closed' ? 'native' : 'success'}>{row.status}</StatusPill></div>)}</div>}</section></div>
}

export function QualityView() {
  const [state, setState] = useState({ checks: [], score: null, loading: true, error: '' })
  useEffect(() => {
    warehouseApi.quality().then((data) => setState({ checks: data.checks || [], score: data.score, loading: false, error: '' })).catch((error) => setState({ checks: [], score: null, loading: false, error: error.message }))
  }, [])
  const passed = state.checks.filter((check) => check.result === 'Passed').length
  return <div className="view-stack"><div className="quality-summary"><div><span className="eyebrow">Validation status</span><h2>{state.error ? 'Validation unavailable.' : state.checks.length ? 'Trust, with receipts.' : 'Quality awaits a load.'}</h2><p>Gold checks run after every full refresh and leave an auditable trail in the warehouse.</p></div><div className="quality-score"><strong>{state.score == null ? '—' : state.score}</strong><span>/ 100</span><div className={`score-ring ${state.score == null ? 'empty-ring' : ''}`}><i /></div></div></div><section className="panel checks-panel"><SectionHeader eyebrow="Validation suite" title={state.checks.length ? `${passed} checks passed` : 'No checks recorded'} action="Run checks" />{state.checks.length === 0 ? <div className="empty-data"><strong>{state.loading ? 'Loading quality results' : 'No warehouse quality results yet'}</strong><span>{state.error || 'Run the Gold validation procedure after loading the warehouse.'}</span></div> : <div className="checks-list">{state.checks.map((check) => <div className="check-row" key={check.label}><div className={`check-icon ${check.result === 'Passed' ? 'passed' : 'review'}`}>{check.result === 'Passed' ? '✓' : '!'}</div><div className="check-copy"><strong>{check.label}</strong><span>{check.detail}</span></div><div className="check-bar"><i style={{ width: `${check.score}%` }} /></div><b className="check-score">{check.score}%</b><StatusPill tone={check.result === 'Passed' ? 'success' : 'warning'}>{check.result}</StatusPill></div>)}</div>}</section></div>
}

const queryGroups = [
  { id: 1, title: 'Transaction operations', range: 'Q01-Q04', description: 'Volume, monthly movement, transaction types, and channels.' },
  { id: 2, title: 'Currency and customers', range: 'Q05-Q08', description: 'Currency activity, branches, top customers, and account types.' },
  { id: 3, title: 'Portfolio summaries', range: 'Q09-Q12', description: 'Branch balances, occupations, loan types, and statuses.' },
  { id: 4, title: 'Rates and payments', range: 'Q13-Q16', description: 'High-interest facilities, payment status, methods, and monthly totals.' },
  { id: 5, title: 'Risk and quality', range: 'Q17-Q20', description: 'Customer exposure, overdue loans, quality gaps, and maturities.' },
]

function QueryResult({ rows, index }) {
  if (!rows.length) return <div className="query-result-empty">Q{String(index + 1).padStart(2, '0')} returned no rows.</div>
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))]
  return <div className="query-result"><span className="query-result-label">Q{String(index + 1).padStart(2, '0')} · {rows.length} row{rows.length === 1 ? '' : 's'}</span><div className="query-result-table"><div className="query-result-head">{columns.map((column) => <span key={column}>{column.replaceAll('_', ' ')}</span>)}</div>{rows.slice(0, 50).map((row, rowIndex) => <div className="query-result-row" key={rowIndex}>{columns.map((column) => <span key={column}>{row[column] == null ? '—' : String(row[column])}</span>)}</div>)}</div>{rows.length > 50 && <small className="query-truncated">Showing first 50 rows.</small>}</div>
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

  return <div className="view-stack"><div className="query-intro"><div><span className="eyebrow">SQL / Gold warehouse</span><h2>Five perspectives, one source of truth.</h2><p>Run each member's four-query group independently. Results appear here only when returned by MySQL.</p></div><span className="query-count">20 questions<br /><b>5 groups</b></span></div><div className="query-group-grid">{queryGroups.map((group) => { const state = groupState[group.id] || { loading: false, error: '', results: [] }; return <section className="query-group-card panel" key={group.id}><div className="query-group-top"><span className="query-group-number">0{group.id}</span><span className="query-range">{group.range}</span></div><h3>{group.title}</h3><p>{group.description}</p><button className="query-run-button" onClick={() => runGroup(group.id)} disabled={state.loading}>{state.loading ? 'Running group...' : `Run ${group.range}`}<span>{state.loading ? '◌' : '▶'}</span></button>{state.error && <div className="query-error">Warehouse result unavailable: {state.error}</div>}{state.results.length > 0 && <div className="query-results">{state.results.map((rows, index) => <QueryResult key={index} rows={rows} index={index} />)}</div>}{!state.loading && !state.error && state.results.length === 0 && <div className="query-not-run">Not run yet</div>}</section> })}</div></div>
}
