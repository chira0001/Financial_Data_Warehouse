import SectionHeader from '../shared/SectionHeader'

function RunLedger({ runs = [] }) {
  const totalRuns = runs.reduce((total, run) => total + Number(run.run_count || 0), 0)
  const successfulRuns = runs.reduce((total, run) => total + (String(run.status).toLowerCase() === 'success' ? Number(run.run_count || 0) : 0), 0)
  const averageDuration = totalRuns ? runs.reduce((total, run) => total + Number(run.average_duration || 0) * Number(run.run_count || 0), 0) / totalRuns : 0
  const latestRun = runs.map((run) => run.latest_run).filter(Boolean).sort().at(-1)

  return (
    <section className="panel ledger-panel">
      <SectionHeader eyebrow="Audit trail" title="Pipeline history summary" />
      {runs.length === 0 ? <div className="ledger-empty">No ETL runs have been recorded from the warehouse yet.</div> : <>
        <div className="run-summary">
          <div><span>Successful runs</span><strong>{successfulRuns.toLocaleString()} / {totalRuns.toLocaleString()}</strong></div>
          <div><span>Average duration</span><strong>{averageDuration.toFixed(1)}s</strong></div>
          <div><span>Latest run</span><strong>{latestRun || '—'}</strong></div>
        </div>
        <div className="run-activity">{runs.map((run) => <article className="run-activity-card" key={`${run.layer}-${run.status}`}>
          <span className={`run-layer-marker ${run.layer.toLowerCase()}`} />
          <div><div className="run-activity-heading"><strong>{run.layer} layer · {Number(run.run_count).toLocaleString()} runs</strong><span className={`run-status ${String(run.status).toLowerCase()}`}>{run.status}</span></div><p>{Number(run.run_count).toLocaleString()} runs with an average duration of {Number(run.average_duration || 0).toFixed(1)}s.</p><small>Most recent: {run.latest_run || '—'}</small></div>
        </article>)}</div>
      </>}
    </section>
  )
}

export default RunLedger