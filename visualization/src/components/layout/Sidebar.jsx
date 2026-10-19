const navItems = [
  { id: 'overview', label: 'Overview', mark: '01' },
  { id: 'transactions', label: 'Transactions', mark: '02' },
  { id: 'loans', label: 'Loan portfolio', mark: '03' },
  { id: 'quality', label: 'Data quality', mark: '04' },
  { id: 'queries', label: 'Business queries', mark: '05' },
]

function Sidebar({ activeView, onNavigate }) {
  return (
    <aside className="sidebar">
      <div className="brand-lockup">
        <div className="brand-mark" aria-hidden="true"><span /></div>
        <div>
          <p className="brand-name">Ledgerline</p>
          <p className="brand-subtitle">Warehouse control</p>
        </div>
      </div>

      <div className="workspace-switcher">
        <span className="status-dot" />
        <div>
          <span className="eyebrow">Workspace</span>
          <strong>financial_dw</strong>
        </div>
        <span className="chevron">⌄</span>
      </div>

      <nav className="primary-nav" aria-label="Primary navigation">
        <span className="nav-label">Control room</span>
        {navItems.map((item) => (
          <button
            className={`nav-item ${activeView === item.id ? 'active' : ''}`}
            key={item.id}
            onClick={() => onNavigate(item.id)}
          >
            <span className="nav-mark">{item.mark}</span>
            <span>{item.label}</span>
            {activeView === item.id && <span className="nav-active-line" />}
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="source-card">
          <span className="eyebrow">Warehouse status</span>
          <strong>Awaiting connection</strong>
          <div className="source-meter"><span /></div>
          <small>No warehouse data loaded</small>
        </div>
        <div className="user-chip">
          <span className="avatar">PA</span>
          <div><strong>Pasindu</strong><small>Data engineer</small></div>
          <span className="more">•••</span>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar