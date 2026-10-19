import SectionHeader from '../shared/SectionHeader'

function RunLedger({ runs = [] }) {
  return (
    <section className="panel ledger-panel">
      <SectionHeader eyebrow="Audit trail" title="Recent runs" action="Full history" />
      {runs.length === 0 ? <div className="ledger-empty">No ETL runs have been recorded from the warehouse yet.</div> : <div className="ledger-table"><div className="ledger-head"><span>Time</span><span>Layer</span><span>Status</span><span>Duration</span><span>Message</span></div>{runs.map((run) => <div className="ledger-row" key={`${run.time}-${run.layer}`}><span className="mono">{run.time}</span><span className={`layer-tag ${run.layer.toLowerCase()}`}>{run.layer}</span><span>{run.status}</span><span className="mono">{run.duration}s</span><span>{run.message}</span></div>)}</div>}
    </section>
  )
}

export default RunLedger