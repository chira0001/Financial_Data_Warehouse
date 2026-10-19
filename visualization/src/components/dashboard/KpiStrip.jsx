const kpis = [
  { label: 'Transactions loaded', tone: 'cyan' },
  { label: 'Reporting volume', tone: 'lime' },
  { label: 'Quality score', tone: 'amber' },
  { label: 'Pipeline latency', tone: 'coral' },
]

function KpiStrip() {
  return (
    <section className="kpi-grid" aria-label="Warehouse key performance indicators">
      {kpis.map((kpi) => (
        <article className={`kpi-card ${kpi.tone}`} key={kpi.label}>
          <div className="kpi-top"><span>{kpi.label}</span><span className="kpi-spark">↗</span></div>
          <strong>—</strong>
          <p><span>Awaiting warehouse data</span></p>
        </article>
      ))}
    </section>
  )
}

export default KpiStrip