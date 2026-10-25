import React from 'react'

export default function Footer() {
  return (
    <footer className="portal-footer">
      <div className="footer-links">
        <a href="#products">Credit Facilities</a>
        <span>•</span>
        <a href="#calculator">Amortization Calculator</a>
        <span>•</span>
        <a href="#apply">Electronic Application</a>
        <span>•</span>
        <a href="#track">Facility Servicing</a>
        <span>•</span>
        <a href="#privacy">Privacy & Security Policy</a>
        <span>•</span>
        <a href="#terms">Terms of Banking Service</a>
      </div>
      <p style={{ marginBottom: '8px', color: 'var(--text-muted)' }}>
        Apex Commercial Bank PLC • Licensed Commercial Bank supervised by the Central Bank of Sri Lanka (CBSL).
      </p>
      <p style={{ fontSize: '0.78rem', color: 'var(--text-faint)' }}>
        © 2026 Apex Commercial Bank PLC. All Rights Reserved. Member of Sri Lanka Deposit Insurance Scheme.
      </p>
    </footer>
  )
}
