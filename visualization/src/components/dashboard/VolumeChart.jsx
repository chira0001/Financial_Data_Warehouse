import SectionHeader from '../shared/SectionHeader'

function VolumeChart() {
  return (
    <section className="panel chart-panel">
      <SectionHeader eyebrow="Flow rate" title="Transaction volume" action="Explore" />
      <div className="empty-data"><strong>No transaction volume yet</strong><span>Run the warehouse load to populate this chart.</span></div>
    </section>
  )
}

export default VolumeChart