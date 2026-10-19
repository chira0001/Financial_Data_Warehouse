import SectionHeader from '../shared/SectionHeader'

function VolumeChart({ volume = [] }) {
  return (
    <section className="panel chart-panel">
      <SectionHeader eyebrow="Flow rate" title="Transaction volume" action="Explore" />
      {volume.length === 0 ? <div className="empty-data"><strong>No transaction volume yet</strong><span>Run the warehouse load to populate this chart.</span></div> : <div className="bar-chart" aria-label="Monthly transaction volume chart">
        {[25, 50, 75].map((line) => <span className="chart-line" style={{ bottom: `${line}%` }} key={line} />)}
        {volume.map((bar) => <div className="bar-column" key={bar.label}><div className="bar" style={{ height: `${bar.value}%` }} /><span>{bar.label}</span></div>)}
      </div>}
    </section>
  )
}

export default VolumeChart