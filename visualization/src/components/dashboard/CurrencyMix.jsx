import SectionHeader from '../shared/SectionHeader'

const colors = ['#6f8f3f', '#2b7182', '#c96b3d', '#bd4a4a', '#8390a0', '#b6a34a', '#8064a2', '#558b6e']

function CurrencyMix({ currencies = [] }) {
  const total = currencies.reduce((sum, currency) => sum + Number(currency.value || 0), 0)
  const slices = currencies.map((currency, index) => ({ ...currency, count: Number(currency.value || 0), color: colors[index % colors.length] }))
    .filter((currency) => currency.count > 0)
  const gradientStops = slices.reduce((result, currency) => {
    const end = result.percent + (currency.count / total) * 100
    return { percent: end, stops: [...result.stops, `${currency.color} ${result.percent}% ${end}%`] }
  }, { percent: 0, stops: [] }).stops.join(', ')

  return (
    <section className="panel currency-panel">
      <SectionHeader eyebrow="Dimension / currency" title="Transaction currency mix" />
      {slices.length === 0 ? <div className="empty-data"><strong>No currency mix yet</strong><span>Currency activity will appear after the warehouse load.</span></div> : <div className="currency-summary">
        <div className="currency-donut" style={{ background: `conic-gradient(${gradientStops})` }} role="img" aria-label="Donut chart showing transactions by currency">
          <div><strong>{total.toLocaleString()}</strong><span>transactions</span></div>
        </div>
        <div className="currency-legend">{slices.map((currency) => <div className="currency-legend-item" key={currency.code}>
          <i style={{ background: currency.color }} /><b>{currency.code}</b><span>{((currency.count / total) * 100).toFixed(1)}%</span><small>{currency.count.toLocaleString()}</small>
        </div>)}</div>
      </div>}
    </section>
  )
}

export default CurrencyMix