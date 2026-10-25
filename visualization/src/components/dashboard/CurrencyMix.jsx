import { useMemo, useState } from 'react'
import SectionHeader from '../shared/SectionHeader'

const topCurrencyColor = '#2b7182'
const comparisonCurrencyColor = '#c96b3d'

function CurrencyMix({ currencies = [] }) {
  const [selectedCode, setSelectedCode] = useState('')
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [activeCode, setActiveCode] = useState('')

  const rankedCurrencies = useMemo(() => currencies
    .map((currency) => ({
      ...currency,
      code: String(currency.code || '').trim().toUpperCase(),
      count: Number.isFinite(Number(currency.value)) ? Number(currency.value) : 0,
    }))
    .filter((currency) => currency.code)
    .sort((left, right) => right.count - left.count || left.code.localeCompare(right.code)), [currencies])
  const topCurrencies = rankedCurrencies.slice(0, 5)
  const selectedCurrency = rankedCurrencies.find((currency) => currency.code === selectedCode)
  const displayCurrencies = selectedCurrency && !topCurrencies.some((currency) => currency.code === selectedCurrency.code)
    ? [...topCurrencies, selectedCurrency].sort((left, right) => right.count - left.count || left.code.localeCompare(right.code))
    : topCurrencies
  const maximum = Math.max(...displayCurrencies.map((currency) => currency.count), 0)
  const filteredCurrencies = rankedCurrencies.filter((currency) => currency.code.includes(search.trim().toUpperCase()))

  const selectCurrency = (code) => {
    setSelectedCode(code)
    setSearch('')
    setIsOpen(false)
    setActiveCode('')
  }

  return (
    <section className="panel currency-panel">
      <SectionHeader eyebrow="Dimension / currency" title="Top 5 Currencies by Occurrence" />
      {rankedCurrencies.length === 0 ? <div className="empty-data"><strong>No currency data yet</strong><span>Currency activity will appear after the warehouse load.</span></div> : <>
        <div className="currency-chart-toolbar">
          <label className="currency-search-label" htmlFor="currency-comparison">Compare a currency</label>
          <div className="currency-search">
            <input
              id="currency-comparison"
              type="search"
              value={isOpen ? search : selectedCode}
              placeholder={`Search ${rankedCurrencies.length} currencies`}
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={isOpen}
              aria-controls="currency-options"
              aria-activedescendant={isOpen && activeCode ? `currency-option-${activeCode}` : undefined}
              onFocus={() => {
                setSearch('')
                setIsOpen(true)
                setActiveCode('')
              }}
              onBlur={() => setIsOpen(false)}
              onChange={(event) => {
                setSearch(event.target.value)
                setIsOpen(true)
                setActiveCode('')
              }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  setIsOpen(false)
                  setActiveCode('')
                } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                  event.preventDefault()
                  setIsOpen(true)
                  const currentIndex = filteredCurrencies.findIndex((currency) => currency.code === activeCode)
                  const direction = event.key === 'ArrowDown' ? 1 : -1
                  const nextIndex = currentIndex < 0
                    ? direction > 0 ? 0 : filteredCurrencies.length - 1
                    : Math.max(0, Math.min(filteredCurrencies.length - 1, currentIndex + direction))
                  setActiveCode(filteredCurrencies[nextIndex]?.code || '')
                } else if (event.key === 'Enter' && isOpen && activeCode) {
                  event.preventDefault()
                  selectCurrency(activeCode)
                }
              }}
            />
            {selectedCode && <button className="currency-clear" type="button" aria-label="Clear currency comparison" onMouseDown={(event) => event.preventDefault()} onClick={() => selectCurrency('')}>×</button>}
            {isOpen && <ul className="currency-options" id="currency-options" role="listbox" aria-label="Supported currencies">
              {filteredCurrencies.length === 0 ? <li className="currency-no-options">No currencies match your search</li> : filteredCurrencies.map((currency) => (
                <li key={currency.code}>
                  <button
                    type="button"
                    id={`currency-option-${currency.code}`}
                    role="option"
                    aria-selected={currency.code === selectedCode}
                    data-active={currency.code === activeCode}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActiveCode(currency.code)}
                    onClick={() => selectCurrency(currency.code)}
                  >
                    <b>{currency.code}</b><span>{currency.count.toLocaleString()} occurrences</span>
                  </button>
                </li>
              ))}
            </ul>}
          </div>
        </div>
        <div className="currency-chart">
          <div className="currency-bars" role="img" aria-label={`Horizontal bar chart of occurrence counts for ${displayCurrencies.length} currencies${selectedCurrency ? `, comparing ${selectedCurrency.code}` : ''}`}>
            {displayCurrencies.map((currency) => {
              const isComparison = currency.code === selectedCode
              const barColor = isComparison ? comparisonCurrencyColor : topCurrencyColor
              return <div className={`currency-bar-row${isComparison ? ' comparison' : ''}`} key={currency.code} aria-label={`${currency.code}: ${currency.count.toLocaleString()} occurrences${isComparison ? ', comparison currency' : ''}`}>
                <b className="currency-code">{currency.code}</b>
                <div className="currency-bar-track">
                  <span style={{ width: `${maximum ? (currency.count / maximum) * 100 : 0}%`, background: barColor }} />
                </div>
                <b className="currency-count">{currency.count.toLocaleString()}</b>
              </div>
            })}
          </div>
          {displayCurrencies.length > 0 && <div className="currency-axis" aria-hidden="true">
            <span className="currency-axis-title">Number of occurrences</span>
            <span className="currency-axis-ticks"><span>0</span><span>{Math.round(maximum / 2).toLocaleString()}</span><span>{maximum.toLocaleString()}</span></span>
          </div>}
          <div className="currency-chart-legend">
            <span><i /> Top 5</span>
            <span><i className="comparison-key" /> Selected comparison</span>
          </div>
        </div>
      </>}
    </section>
  )
}


export default CurrencyMix
