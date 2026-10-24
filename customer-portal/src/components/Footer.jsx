import React from 'react'

export default function Footer() {
  return (
    <footer className="portal-footer">
      <div className="footer-links">
        <a href="#products">Retail Credit Facilities</a>
        <span>•</span>
        <a href="#calculator">Amortization Calculator</a>
        <span>•</span>
        <a href="#apply">Electronic Application</a>
        <span>•</span>
        <a href="#track">Facility Servicing</a>
        <span>•</span>
        <a href="http://localhost:5173" target="_blank" rel="noreferrer">Internal DW Control Room</a>
      </div>
      <p style={{ marginBottom: '8px', color: 'var(--text-muted)' }}>
        Apex Commercial Bank PLC • Licensed Commercial Bank supervised by the Central Bank of Sri Lanka (CBSL).
      </p>
      <p style={{ fontSize: '0.78rem', color: 'var(--text-faint)' }}>
        Retail Credit Operations Platform • Financial Data Warehouse Academic Architecture.
      </p>
    </footer>
  )
}
