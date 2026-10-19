import SectionHeader from '../shared/SectionHeader'

function CurrencyMix({ currencies = [] }) {
  return (
    <section className="panel currency-panel">
      <SectionHeader eyebrow="Dimension / currency" title="Reporting mix" action="View rates" />
      {currencies.length === 0 ? <div className="empty-data"><strong>No currency mix yet</strong><span>Exchange-rate facts will appear after the warehouse load.</span></div> : <div className="currency-list">{currencies.map((currency) => <div className="currency-row" key={currency.code}><span className="currency-dot cyan" /><b>{currency.code}</b><span>{currency.name}</span><strong>{currency.value}</strong><div className="mini-track"><i className="cyan" style={{ width: `${Math.min(currency.value * 2, 100)}%` }} /></div></div>)}</div>}
    </section>
  )
}

export default CurrencyMix