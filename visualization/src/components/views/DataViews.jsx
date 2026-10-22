import { useEffect, useState } from 'react'
import { warehouseApi } from '../../api/warehouseApi'
import SectionHeader from '../shared/SectionHeader'
import StatusPill from '../shared/StatusPill'

const formatCurrency = (value) => `LKR ${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`

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

  const totalVolume = state.rows.reduce((total, row) => total + Number(row.lkr || 0), 0)
  const averageValue = state.rows.length ? totalVolume / state.rows.length : 0
  const byType = Object.values(state.rows.reduce((groups, row) => {
    const label = row.type || 'Unspecified'
    groups[label] = groups[label] || { label, count: 0, volume: 0 }
    groups[label].count += 1
    groups[label].volume += Number(row.lkr || 0)
    return groups
  }, {})).sort((a, b) => b.volume - a.volume)
  const byCurrency = Object.values(state.rows.reduce((groups, row) => {
    const label = row.currency || 'Unspecified'
    groups[label] = groups[label] || { label, count: 0, volume: 0 }
    groups[label].count += 1
    groups[label].volume += Number(row.lkr || 0)
    return groups
  }, {})).sort((a, b) => b.volume - a.volume)

  return <div className="view-stack">
    <div className="view-toolbar"><label className="search-field"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search transaction, account, currency..." /></label><span className="result-count">{state.rows.length} matching records · up to 100 analyzed</span></div>
    <div className="summary-metric-grid">
      <article className="summary-metric"><span>Matched transactions</span><strong>{state.rows.length.toLocaleString()}</strong><small>{query ? `Search: “${query}”` : 'Latest warehouse records'}</small></article>
      <article className="summary-metric"><span>Reporting value</span><strong>{formatCurrency(totalVolume)}</strong><small>Total across matched records</small></article>
      <article className="summary-metric"><span>Average transaction</span><strong>{formatCurrency(averageValue)}</strong><small>Mean reporting value per record</small></article>
    </div>
    {state.rows.length === 0 ? <EmptyResults loading={state.loading} error={state.error} message="Load fact_transaction to summarize transaction activity." /> : <div className="summary-grid">
      <section className="panel summary-panel"><SectionHeader eyebrow="Transaction mix / type" title="Value by transaction type" /><RankedBars rows={byType} valueKey="volume" valueFormatter={formatCurrency} />{byType[0] && <p className="summary-note">{byType[0].label} leads with {byType[0].count.toLocaleString()} transactions in the matched records.</p>}</section>
      <section className="panel summary-panel"><SectionHeader eyebrow="Currency mix / reporting value" title="Activity by currency" /><RankedBars rows={byCurrency} valueKey="count" valueFormatter={(value) => `${value.toLocaleString()} txns`} />{byCurrency[0] && <p className="summary-note">{byCurrency[0].label} is the most frequent currency in this result set.</p>}</section>
      <section className="panel summary-panel summary-wide"><SectionHeader eyebrow="Recent activity / fact_transaction" title="Latest transaction highlights" /><div className="highlight-list">{state.rows.slice(0, 5).map((row) => <article className="highlight-card" key={row.id}><div><strong>{row.type || 'Transaction'}</strong><span>{row.date} · Account {row.account || '—'}</span></div><strong>{formatCurrency(row.lkr)}</strong></article>)}</div></section>
    </div>}
  </div>
}

export function LoansView() {
  const [state, setState] = useState({ rows: [], loading: true, error: '' })
  useEffect(() => {
    warehouseApi.loans().then((data) => setState({ rows: data.rows || [], loading: false, error: '' })).catch((error) => setState({ rows: [], loading: false, error: error.message }))
  }, [])

  const principal = state.rows.reduce((total, row) => total + Number(row.amount || 0), 0)
  const paid = state.rows.reduce((total, row) => total + Number(row.paid || 0), 0)
  const averageRate = state.rows.length ? state.rows.reduce((total, row) => total + (Number.parseFloat(row.rate || 0) || 0), 0) / state.rows.length : 0
  const products = Object.values(state.rows.reduce((groups, row) => {
    const label = row.type || 'Unspecified'
    groups[label] = groups[label] || { label, count: 0, principal: 0 }
    groups[label].count += 1
    groups[label].principal += Number(row.amount || 0)
    return groups
  }, {})).sort((a, b) => b.principal - a.principal)
  const statuses = Object.values(state.rows.reduce((groups, row) => {
    const label = row.status || 'Unspecified'
    groups[label] = groups[label] || { label, count: 0, principal: 0 }
    groups[label].count += 1
    groups[label].principal += Number(row.amount || 0)
    return groups
  }, {})).sort((a, b) => b.count - a.count)
  const largestLoans = [...state.rows].sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0)).slice(0, 4)

  return <div className="view-stack">
    <div className="portfolio-banner"><div><span className="eyebrow">Gold / fact_loan</span><h2>Portfolio at a glance</h2><p>Exposure, repayment progress, pricing, and status summarized from the loan facts.</p></div><div className="portfolio-total"><span>Principal tracked</span><strong>{state.rows.length ? formatCurrency(principal) : '—'}</strong><b>{state.rows.length.toLocaleString()} facilities analyzed</b></div></div>
    {state.rows.length === 0 ? <EmptyResults loading={state.loading} error={state.error} message="Load fact_loan and fact_loan_payment to summarize the portfolio." /> : <>
      <div className="summary-metric-grid">
        <article className="summary-metric"><span>Facilities</span><strong>{state.rows.length.toLocaleString()}</strong><small>Active and historical loans</small></article>
        <article className="summary-metric"><span>Payments tracked</span><strong>{formatCurrency(paid)}</strong><small>{principal ? `${((paid / principal) * 100).toFixed(1)}% of principal value` : 'No principal recorded'}</small></article>
        <article className="summary-metric"><span>Average interest rate</span><strong>{averageRate.toFixed(2)}%</strong><small>Across loaded facilities</small></article>
      </div>
      <div className="summary-grid">
        <section className="panel summary-panel"><SectionHeader eyebrow="Product exposure / fact_loan" title="Principal by loan product" /><RankedBars rows={products} valueKey="principal" valueFormatter={formatCurrency} />{products[0] && <p className="summary-note">{products[0].label} is the largest product, accounting for {((products[0].principal / principal) * 100).toFixed(1)}% of principal.</p>}</section>
        <section className="panel summary-panel"><SectionHeader eyebrow="Portfolio health / loan status" title="Facilities by status" /><RankedBars rows={statuses} valueKey="count" valueFormatter={(value) => `${value.toLocaleString()} loans`} />{statuses[0] && <p className="summary-note">{statuses[0].label} is the most common status across the portfolio.</p>}</section>
        <section className="panel summary-panel summary-wide"><SectionHeader eyebrow="Exposure watch / largest principal" title="Largest facilities" /><div className="highlight-list">{largestLoans.map((loan) => <article className="highlight-card" key={loan.id}><div><strong>{loan.type || 'Loan'} · #{loan.id}</strong><span>{loan.status || 'Unspecified'} · Customer {loan.customer || '—'} · {loan.rate || '—'} rate</span></div><strong>{formatCurrency(loan.amount)}</strong></article>)}</div></section>
      </div>
    </>}
  </div>
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
      {points.map((point) => <text className="query-line-x-tick" key={`label-${point.label}-${point.x}`} x={point.x} y="187" textAnchor="middle">{point.label}</text>)}
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
  const displayRows = primaryMeasure
    ? [...rows].sort((a, b) => Number(b[primaryMeasure] || 0) - Number(a[primaryMeasure] || 0)).slice(0, 8)
    : []
  const timeSeries = columns.some((column) => /^(calendar_)?(year|month|date|full_date|transaction_date)$/i.test(column))
  const performanceRows = timeSeries ? rows.slice(0, 12) : displayRows
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
      {rows.length > performanceRows.length && !showDistributionLine && !showMaturityLine && <small className="query-truncated">Line chart shows {performanceRows.length} of {rows.length.toLocaleString()} results.</small>}
    </> : <div className="query-category-cards">{rows.slice(0, 8).map((row, rowIndex) => <article key={rowIndex}><span>{categoryLabel(row, rowIndex)}</span><strong>{columns.filter((column) => column !== categories[0] && !/(^|_)(id|key)(_|$)|date/i.test(column)).map((column) => row[column] == null ? null : `${column.replaceAll('_', ' ')}: ${row[column]}`).filter(Boolean).slice(0, 2).join(' · ') || 'Category result'}</strong></article>)}</div>}
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

  return <div className="view-stack"><div className="query-intro"><div><span className="eyebrow">SQL / Gold warehouse</span><h2>Five perspectives, one source of truth.</h2><p>Run each member's four-query group independently. Results are distilled into key metrics, category summaries, and ranked comparisons.</p></div><span className="query-count">20 questions<br /><b>5 groups</b></span></div><div className="query-group-grid">{queryGroups.map((group) => { const state = groupState[group.id] || { loading: false, error: '', results: [] }; return <section className="query-group-card panel" key={group.id}><div className="query-group-top"><span className="query-group-number">0{group.id}</span><span className="query-range">{group.range}</span></div><h3>{group.title}</h3><p>{group.description}</p><button className="query-run-button" onClick={() => runGroup(group.id)} disabled={state.loading}>{state.loading ? 'Running group...' : `Run ${group.range}`}<span>{state.loading ? '◌' : '▶'}</span></button>{state.error && <div className="query-error">Warehouse result unavailable: {state.error}</div>}{state.results.length > 0 && <div className="query-results">{state.results.map((rows, index) => <QueryResult key={index} rows={rows} index={index} groupId={group.id} />)}</div>}{!state.loading && !state.error && state.results.length === 0 && <div className="query-not-run">Not run yet</div>}</section> })}</div></div>
}
