function StatusPill({ children, tone = 'success' }) {
  return <span className={`status-pill ${tone}`}><i />{children}</span>
}

export default StatusPill