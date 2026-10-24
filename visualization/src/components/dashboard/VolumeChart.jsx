import SectionHeader from '../shared/SectionHeader'

const chartWidth = 640
const chartHeight = 240
const chartPadding = { top: 18, right: 16, bottom: 38, left: 54 }
const compactNumber = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 })

function VolumeChart({ volume = [] }) {
  const points = volume.map((point) => ({
    label: point.label,
    value: Number.isFinite(Number(point.value)) ? Number(point.value) : 0,
  }))
  const total = points.reduce((sum, point) => sum + point.value, 0)
  const maximum = Math.max(...points.map((point) => point.value), 0)
  const chartMaximum = maximum || 1
  const plotWidth = chartWidth - chartPadding.left - chartPadding.right
  const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom
  const coordinates = points.map((point, index) => ({
    ...point,
    x: chartPadding.left + (points.length > 1 ? (index / (points.length - 1)) * plotWidth : plotWidth / 2),
    y: chartPadding.top + plotHeight - (point.value / chartMaximum) * plotHeight,
  }))
  const linePath = coordinates.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
  const labelStep = Math.max(1, Math.ceil(points.length / 6))
  const average = points.length ? Math.round(total / points.length) : 0

  return (
    <section className="panel chart-panel">
      <SectionHeader eyebrow="Monthly activity" title="Transaction count trend" />
      {points.length === 0 ? <div className="empty-data"><strong>No transaction volume yet</strong><span>Run the warehouse load to populate this chart.</span></div> : <>
        <div className="chart-summary"><strong>{total.toLocaleString()}</strong><span>transactions in {points.length} periods</span><b>{average.toLocaleString()} avg / period</b></div>
        <svg className="trend-chart" viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label={`Line chart showing monthly transaction count across ${points.length} periods`}>
          {[0, 0.5, 1].map((ratio) => {
            const y = chartPadding.top + plotHeight * ratio
            const value = chartMaximum * (1 - ratio)
            return <g key={ratio}>
              <line className="trend-gridline" x1={chartPadding.left} x2={chartWidth - chartPadding.right} y1={y} y2={y} />
              <text className="trend-axis-label" x={chartPadding.left - 8} y={y + 4} textAnchor="end">{compactNumber.format(value)}</text>
            </g>
          })}
          {coordinates.length > 1 && <path className="trend-line" d={linePath} />}
          {coordinates.map((point, index) => <g key={`${point.label}-${index}`}>
            <circle className="trend-point" cx={point.x} cy={point.y} r="4">
              <title>{`${point.label}: ${point.value.toLocaleString()} transactions`}</title>
            </circle>
            {(index % labelStep === 0 || index === coordinates.length - 1) && <text className="trend-axis-label trend-period-label" x={point.x} y={chartHeight - 10} textAnchor="middle">{point.label}</text>}
          </g>)}
        </svg>
      </>}
    </section>
  )
}

export default VolumeChart
