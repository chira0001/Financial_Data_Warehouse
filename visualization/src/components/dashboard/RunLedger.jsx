import SectionHeader from '../shared/SectionHeader'

function RunLedger({ runs = [] }) {
  const successfulRuns = runs.filter((run) => String(run.status).toLowerCase() === 'success').length
  const averageDuration = runs.length ? runs.reduce((total, run) => total + Number(run.duration || 0), 0) / runs.length : 0

  return (
    <section className="panel ledger-panel">
      <SectionHeader eyebrow="Audit trail" title="Recent pipeline activity" />
      {runs.length === 0 ? <div className="ledger-empty">No ETL runs have been recorded from the warehouse yet.</div> : <>
        <div className="run-summary">
          <div><span>Successful runs</span><strong>{successfulRuns} / {runs.length}</strong></div>
          <div><span>Average duration</span><strong>{averageDuration.toFixed(1)}s</strong></div>
          <div><span>Latest run</span><strong>{runs[0]?.time || '—'}</strong></div>
        </div>
        <div className="run-activity">{runs.slice(0, 5).map((run, index) => <article className="run-activity-card" key={`${run.time}-${run.layer}-${index}`}>
          <span className={`run-layer-marker ${run.layer.toLowerCase()}`} />
          <div><div className="run-activity-heading"><strong>{run.layer} layer</strong><span className={`run-status ${String(run.status).toLowerCase()}`}>{run.status}</span></div><p>{run.message || 'Warehouse pipeline event'}</p><small>{run.time} · {Number(run.duration || 0)}s duration</small></div>
        </article>)}</div>
      </>}
    </section>
  )
}

export default RunLedger