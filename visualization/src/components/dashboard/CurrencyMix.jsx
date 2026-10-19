import SectionHeader from '../shared/SectionHeader'

function CurrencyMix() {
  return (
    <section className="panel currency-panel">
      <SectionHeader eyebrow="Dimension / currency" title="Reporting mix" action="View rates" />
      <div className="empty-data"><strong>No currency mix yet</strong><span>Exchange-rate facts will appear after the warehouse load.</span></div>
    </section>
  )
}

export default CurrencyMix