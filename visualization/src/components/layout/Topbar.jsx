function Topbar({ activeView, isRunning, onRun }) {
  const titles = {
    overview: ['Warehouse pulse', 'Operational view across every layer'],
    transactions: ['Transaction explorer', 'Trace currency, channel, and reporting value'],
    loans: ['Loan portfolio', 'Follow balances from source to Gold'],
    quality: ['Quality center', 'Checks that keep analytics trustworthy'],
  }
  const [title, subtitle] = titles[activeView]

  return (
    <header className="topbar">
      <div className="page-title">
        <span className="crumb">Financial data warehouse <b>/</b> Control room</span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="topbar-actions">
        <div className="live-badge"><span className="pulse-dot" /> Warehouse not connected</div>
        <button className={`run-button ${isRunning ? 'running' : ''}`} onClick={onRun} disabled={isRunning}>
          <span className="run-icon">{isRunning ? '◌' : '▶'}</span>
          {isRunning ? 'Running pipeline' : 'Run pipeline'}
        </button>
      </div>
    </header>
  )
}

export default Topbar