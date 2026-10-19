import SectionHeader from '../shared/SectionHeader'

function EmptyTable({ message }) {
  return <div className="empty-table"><strong>No warehouse records available</strong><span>{message}</span></div>
}

export function TransactionsView() {
  return <div className="view-stack"><div className="view-toolbar"><div className="search-field disabled-search"><span>⌕</span><span>Search becomes available after warehouse data loads</span></div><button className="filter-button" disabled>All currencies <span>⌄</span></button><button className="filter-button" disabled>Last 30 days <span>⌄</span></button></div><section className="panel data-panel"><SectionHeader eyebrow="Gold / fact_transaction" title="Transaction ledger" action="Export CSV" /><EmptyTable message="Load fact_transaction from the warehouse to inspect transactions." /></section></div>
}

export function LoansView() {
  return <div className="view-stack"><div className="portfolio-banner"><div><span className="eyebrow">Gold / fact_loan</span><h2>Portfolio at a glance</h2><p>Loan relationships will appear here when the warehouse portfolio is available.</p></div><div className="portfolio-total"><span>Principal tracked</span><strong>—</strong><b>Awaiting warehouse data</b></div></div><section className="panel data-panel"><SectionHeader eyebrow="Loan portfolio" title="Active and historical facilities" action="Export portfolio" /><EmptyTable message="Load fact_loan and fact_loan_payment from the warehouse to inspect facilities." /></section></div>
}

export function QualityView() {
  return <div className="view-stack"><div className="quality-summary"><div><span className="eyebrow">Validation status</span><h2>Quality awaits a load.</h2><p>Warehouse validation results will be shown after the Gold layer has been populated.</p></div><div className="quality-score"><strong>—</strong><span>/ 100</span><div className="score-ring empty-ring"><i /></div></div></div><section className="panel checks-panel"><SectionHeader eyebrow="Validation suite" title="No checks recorded" action="Run checks" /><div className="empty-data"><strong>No warehouse quality results yet</strong><span>Run the Gold validation procedure after loading the warehouse.</span></div></section></div>
}
