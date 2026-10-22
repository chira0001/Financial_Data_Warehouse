import SectionHeader from '../shared/SectionHeader'

function VolumeChart({ volume = [] }) {
  const maximum = Math.max(...volume.map((point) => Number(point.value || 0)), 0)
  const total = volume.reduce((sum, point) => sum + Number(point.value || 0), 0)
  return (
    <section className="panel chart-panel">
      <SectionHeader eyebrow="Monthly activity" title="Transaction count trend" />
      {volume.length === 0 ? <div className="empty-data"><strong>No transaction volume yet</strong><span>Run the warehouse load to populate this chart.</span></div> : <>
        <div className="chart-summary"><strong>{total.toLocaleString()}</strong><span>transactions in {volume.length} periods</span><b>{Math.round(total / volume.length).toLocaleString()} avg / period</b></div>
        <div className="bar-chart" role="img" aria-label="Monthly transaction count bar chart">
          {[25, 50, 75].map((line) => <span className="chart-line" style={{ bottom: `${line}%` }} key={line} />)}
          {volume.map((bar) => <div className="bar-column" key={bar.label} title={`${bar.label}: ${Number(bar.value).toLocaleString()} transactions`}><div className="bar" style={{ height: `${maximum ? (Number(bar.value) / maximum) * 100 : 0}%` }} /><span>{bar.label}</span></div>)}
        </div>
      </>}
    </section>
  )
}

export default VolumeChart