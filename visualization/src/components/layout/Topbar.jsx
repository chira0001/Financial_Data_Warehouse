function Topbar({ activeView, isRunning, onRun, connectionStatus }) {
  const titles = {
    overview: ['Warehouse pulse', 'Operational view across every layer'],
    transactions: ['Transaction explorer', 'Trace currency, channel, and reporting value'],
    loans: ['Loan portfolio', 'Follow balances from source to Gold'],
    quality: ['Quality center', 'Checks that keep analytics trustworthy'],
    queries: ['Business queries', 'Run each group against the Gold warehouse'],
    analytics: ['Executive analytics', 'Performance, portfolio, regional, and trend analysis from Gold'],
  }
  const [title, subtitle] = titles[activeView]
  const connectionCopy = {
    checking: 'Checking database',
    connected: 'Warehouse connected',
    disconnected: 'Warehouse disconnected',
  }[connectionStatus]

  return (
    <header className="topbar">
      <div className="page-title">
        <span className="crumb">Financial data warehouse <b>/</b> Control room</span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="topbar-actions">
        <div className={`live-badge ${connectionStatus}`} role="status" aria-live="polite"><span className="pulse-dot" /> {connectionCopy}</div>
        <button className={`run-button ${isRunning ? 'running' : ''}`} onClick={onRun} disabled={isRunning}>
          <span className="run-icon">{isRunning ? '◌' : '▶'}</span>
          {isRunning ? 'Running pipeline' : 'Run pipeline'}
        </button>
      </div>
    </header>
  )
}

export default Topbar