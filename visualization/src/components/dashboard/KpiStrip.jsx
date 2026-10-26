const kpis = [
  { label: 'Transactions loaded', tone: 'cyan' },
  { label: 'Reporting volume', tone: 'lime' },
  { label: 'Quality score', tone: 'amber' },
  { label: 'Pipeline latency', tone: 'coral' },
]

function formatVolume(value) {
  if (value === null || value === undefined) return '—'
  if (value >= 1000000000) return `LKR ${(value / 1000000000).toFixed(2)}B`
  if (value >= 1000000) return `LKR ${(value / 1000000).toFixed(2)}M`
  return `LKR ${value.toLocaleString()}`
}

function KpiStrip({ metrics }) {
  const values = [metrics?.transactions ?? null, formatVolume(metrics?.reportingVolume), metrics?.qualityScore == null ? null : `${metrics.qualityScore}%`, metrics?.pipelineLatency == null ? null : `${metrics.pipelineLatency}s`]

  return (
    <section className="kpi-grid" aria-label="Warehouse key performance indicators">
      {kpis.map((kpi, index) => (
        <article className={`kpi-card ${kpi.tone}`} key={kpi.label}>
          <div className="kpi-top"><span>{kpi.label}</span></div>
          <strong>{values[index] ?? '—'}</strong>
          <p><span>{metrics ? 'Loaded from warehouse' : 'Awaiting warehouse data'}</span></p>
        </article>
      ))}
    </section>
  )
}

export default KpiStrip