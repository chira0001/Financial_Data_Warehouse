import { useEffect, useState } from 'react'
import { warehouseApi } from '../../api/warehouseApi'
import SectionHeader from '../shared/SectionHeader'

const currency = (value, compact = false) => {
  const amount = Number(value || 0)
  if (compact && amount >= 1_000_000_000) return `LKR ${(amount / 1_000_000_000).toFixed(1)}B`
  if (compact && amount >= 1_000_000) return `LKR ${(amount / 1_000_000).toFixed(1)}M`
  return `LKR ${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

const chartColors = ['#6f8f3f', '#2b7182', '#c96b3d', '#bd4a4a', '#8390a0', '#b6a34a']

function MetricCard({ label, value, detail, tone }) {
  return <article className={`control-metric ${tone}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>
}

function PortfolioTreemap({ rows }) {
  const total = rows.reduce((sum, row) => sum + Number(row.principal || 0), 0)
  return (
    <section className="panel control-panel">
      <SectionHeader eyebrow="Product performance / fact_loan" title="Loan portfolio by product" />
      {rows.length === 0 ? <div className="empty-data"><strong>No loan product data yet</strong><span>Load the Gold warehouse to populate this view.</span></div> : <div className="portfolio-treemap" role="img" aria-label="Treemap of loan principal by product">
        {rows.map((row, index) => {
          const principal = Number(row.principal || 0)
          return <div className={`treemap-tile tile-${index % 5}`} key={row.label} style={{ flexGrow: Math.max(principal, 1) }} title={`${row.label}: ${currency(principal)} · ${Number(row.loan_count || 0)} loans`}>
            <strong>{row.label || 'Unspecified'}</strong><span>{currency(principal, true)}</span><small>{Number(row.loan_count || 0).toLocaleString()} loans · {total ? ((principal / total) * 100).toFixed(1) : '0.0'}%</small>
          </div>
        })}
      </div>}
    </section>
  )
}

function RegionHeatmap({ rows }) {
  const maximum = Math.max(...rows.map((row) => Number(row.reporting_volume || 0)), 0)
  return (
    <section className="panel control-panel">
      <SectionHeader eyebrow="Regional performance / dim_branch" title="Regional transaction footprint" />
      {rows.length === 0 ? <div className="empty-data"><strong>No regional activity yet</strong><span>Branch transaction facts will appear after the warehouse load.</span></div> : <div className="region-heatmap" role="group" aria-label="Regional transaction volume heatmap">
        {rows.map((row) => {
          const volume = Number(row.reporting_volume || 0)
          const intensity = maximum ? 0.12 + (volume / maximum) * 0.5 : 0.12
          return <article className="region-cell" key={row.label} style={{ backgroundColor: `rgba(43, 113, 130, ${intensity})` }}>
            <span>{row.label || 'Unassigned'}</span><strong>{currency(volume, true)}</strong><small>{Number(row.transaction_count || 0).toLocaleString()} transactions</small>
          </article>
        })}
      </div>}
    </section>
  )
}

function ChannelLollipop({ rows }) {
  const maximum = Math.max(...rows.map((row) => Number(row.transaction_count || 0)), 0)
  return (
    <section className="panel control-panel">
      <SectionHeader eyebrow="Channel performance / fact_transaction" title="Transaction count by channel" />
      {rows.length === 0 ? <div className="empty-data"><strong>No channel activity yet</strong><span>Channel performance will appear after the warehouse load.</span></div> : <div className="lollipop-chart" role="img" aria-label="Lollipop chart comparing transactions by channel">
        {rows.map((row) => {
          const count = Number(row.transaction_count || 0)
          const position = maximum ? (count / maximum) * 100 : 0
          return <div className="lollipop-row" key={row.label}>
            <span className="lollipop-label">{row.label || 'Unspecified'}</span>
            <div className="lollipop-track"><i style={{ width: `${position}%` }} /><b style={{ left: `${position}%` }} /></div>
            <strong>{count.toLocaleString()}</strong>
          </div>
        })}
      </div>}
    </section>
  )
}

function TrendPanel({ rows }) {
  const max = Math.max(...rows.map((row) => Number(row.reporting_volume || 0)), 0)
  const chartPoints = rows.map((row, index) => ({
    ...row,
    x: rows.length === 1 ? 410 : 42 + (index / (rows.length - 1)) * 736,
    y: 192 - (max ? (Number(row.reporting_volume || 0) / max) * 156 : 0),
  }))
  const linePath = chartPoints.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
  const areaPath = chartPoints.length
    ? `${linePath} L ${chartPoints[chartPoints.length - 1].x} 202 L ${chartPoints[0].x} 202 Z`
    : ''

  return (
    <section className="panel control-panel trend-panel">
      <SectionHeader eyebrow="Gold / fact_transaction" title="Monthly reporting volume" />
      {rows.length === 0 ? <div className="empty-data"><strong>No monthly trend yet</strong><span>Transaction history will appear after the warehouse load.</span></div> : <div className="area-chart-wrap">
        <svg className="area-chart" viewBox="0 0 800 230" preserveAspectRatio="none" role="img" aria-label="Area graph of monthly reporting volume">
          <defs><linearGradient id="volume-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#6f8f3f" stopOpacity=".34" /><stop offset="100%" stopColor="#6f8f3f" stopOpacity=".02" /></linearGradient></defs>
          {[36, 88, 140, 192].map((y) => <line className="area-grid-line" key={y} x1="34" x2="790" y1={y} y2={y} />)}
          <path d={areaPath} fill="url(#volume-area)" />
          <path className="area-line" d={linePath} />
          {chartPoints.map((point) => <circle className="area-point" key={point.label} cx={point.x} cy={point.y} r="3.5"><title>{`${point.label}: ${currency(point.reporting_volume)}`}</title></circle>)}
          {chartPoints.map((point) => <text className="area-label" key={`label-${point.label}`} x={point.x} y="222" textAnchor="middle">{point.label}</text>)}
        </svg>
      </div>}
    </section>
  )
}

function DonutPanel({ rows }) {
  const segments = rows.map((row, index) => ({
    ...row,
    value: Number(row.reporting_volume || 0),
    color: chartColors[index % chartColors.length],
  })).filter((row) => row.value > 0)
  const total = segments.reduce((sum, row) => sum + row.value, 0)
  const gradientStops = segments.reduce((result, row) => {
    const end = result.percent + (row.value / total) * 100
    return { percent: end, stops: [...result.stops, `${row.color} ${result.percent}% ${end}%`] }
  }, { stops: [], percent: 0 }).stops.join(', ')

  return (
    <section className="panel control-panel">
      <SectionHeader eyebrow="Transaction mix / fact_transaction" title="Reporting volume by type" />
      {segments.length === 0 ? <div className="empty-data"><strong>No transaction mix yet</strong><span>Transaction types will appear after the warehouse load.</span></div> : <div className="donut-analysis">
        <div className="analysis-donut" style={{ background: `conic-gradient(${gradientStops})` }} role="img" aria-label="Donut chart showing reporting volume by transaction type">
          <div><strong>{currency(total, true)}</strong><span>Total volume</span></div>
        </div>
        <div className="donut-legend">{segments.map((row) => <div className="donut-legend-row" key={row.label}>
          <i style={{ background: row.color }} />
          <span>{row.label || 'Unspecified'}</span>
          <strong>{((row.value / total) * 100).toFixed(1)}%</strong>
        </div>)}</div>
      </div>}
    </section>
  )
}

function ControlRoomView({ refreshKey }) {
  const [state, setState] = useState({ data: null, loading: true, error: '' })

  useEffect(() => {
    let active = true
    warehouseApi.analytics()
      .then((data) => { if (active) setState({ data, loading: false, error: '' }) })
      .catch((error) => { if (active) setState((current) => ({ ...current, loading: false, error: error.message })) })
    return () => { active = false }
  }, [refreshKey])

  const data = state.data
  const summary = data?.summary

  return (
    <div className="view-stack control-room">
      {state.error && <div className="api-error"><strong>Analytics unavailable</strong><span>{state.error}</span></div>}
      {state.loading && !data && <div className="control-loading">Loading analytics from the Gold warehouse…</div>}
      <div className="control-intro"><div><span className="eyebrow">Executive overview / Gold layer</span><h2>Business performance at a glance</h2><p>Decision-ready indicators and dimensional analysis, queried directly from the financial warehouse.</p></div><span className="control-source">WAREHOUSE QUERY RESULTS</span></div>
      <section className="control-metrics" aria-label="Executive performance metrics">
        <MetricCard tone="cyan" label="Transactions processed" value={summary ? Number(summary.transaction_count).toLocaleString() : '—'} detail="All transaction facts" />
        <MetricCard tone="lime" label="Reporting volume" value={summary ? currency(summary.reporting_volume, true) : '—'} detail="Transaction value in LKR" />
        <MetricCard tone="amber" label="Loan principal" value={summary ? currency(summary.loan_principal, true) : '—'} detail="Total portfolio principal" />
        <MetricCard tone="coral" label="Active branches" value={summary ? Number(summary.active_branches).toLocaleString() : '—'} detail="Branches with transactions" />
      </section>
      <TrendPanel rows={data?.monthlyTrend || []} />
      {data && <section className="control-insights" aria-label="Key business insights">
        <div><span className="eyebrow">Portfolio leader</span><strong>{data.loanProducts?.[0]?.label || 'No product data'}</strong><small>{data.loanProducts?.[0] ? `${currency(data.loanProducts[0].principal, true)} principal across ${Number(data.loanProducts[0].loan_count).toLocaleString()} loans` : 'Load Gold loan facts to summarize products'}</small></div>
        <div><span className="eyebrow">Top region</span><strong>{data.regions?.[0]?.label || 'No region data'}</strong><small>{data.regions?.[0] ? `${currency(data.regions[0].reporting_volume, true)} transaction volume` : 'Load branch transaction facts to summarize regions'}</small></div>
        <div><span className="eyebrow">Leading channel</span><strong>{data.channels?.[0]?.label || 'No channel data'}</strong><small>{data.channels?.[0] ? `${Number(data.channels[0].transaction_count).toLocaleString()} transactions` : 'Load transaction facts to summarize channels'}</small></div>
      </section>}
      <div className="control-grid">
        <PortfolioTreemap rows={data?.loanProducts || []} />
        <DonutPanel rows={data?.transactionTypes || []} />
        <RegionHeatmap rows={data?.regions || []} />
        <ChannelLollipop rows={data?.channels || []} />
      </div>
    </div>
  )
}

export default ControlRoomView
