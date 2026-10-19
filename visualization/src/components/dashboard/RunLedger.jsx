import SectionHeader from '../shared/SectionHeader'

function RunLedger() {
  return (
    <section className="panel ledger-panel">
      <SectionHeader eyebrow="Audit trail" title="Recent runs" action="Full history" />
      <div className="ledger-empty">No ETL runs have been recorded from the warehouse yet.</div>
    </section>
  )
}

export default RunLedger