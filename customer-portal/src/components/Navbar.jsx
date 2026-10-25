import React from 'react'
import { BankIcon, ArrowRightIcon, ExternalLinkIcon } from './Icons'

export default function Navbar({ activeTab, setActiveTab, onOpenConsole, currentRole, setCurrentRole }) {
  return (
    <header className="navbar">
      <div className="nav-container">
        <a href="#home" onClick={() => { setActiveTab('home'); setCurrentRole('customer'); }} className="brand">
          <div className="brand-icon">
            <BankIcon size={22} />
          </div>
          <div className="brand-text">
            <h1>Apex Commercial Bank</h1>
            <span>Consumer & Corporate Credit Services</span>
          </div>
        </a>

        {currentRole === 'customer' ? (
          <nav className="nav-links">
            <button 
              type="button"
              className={`nav-btn ${activeTab === 'home' ? 'active' : ''}`}
              onClick={() => setActiveTab('home')}
            >
              Loan Facilities
            </button>
            <button 
              type="button"
              className={`nav-btn ${activeTab === 'calculator' ? 'active' : ''}`}
              onClick={() => setActiveTab('calculator')}
            >
              EMI Calculator
            </button>
            <button 
              type="button"
              className={`nav-btn ${activeTab === 'apply' ? 'active' : ''}`}
              onClick={() => setActiveTab('apply')}
            >
              Apply Online
            </button>
            <button 
              type="button"
              className={`nav-btn ${activeTab === 'track' ? 'active' : ''}`}
              onClick={() => setActiveTab('track')}
            >
              Track Facility
            </button>
          </nav>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ 
              fontSize: '0.78rem', 
              padding: '4px 12px', 
              borderRadius: '20px', 
              background: currentRole === 'officer' ? 'rgba(59, 130, 246, 0.2)' : currentRole === 'manager' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(245, 158, 11, 0.2)',
              color: currentRole === 'officer' ? '#93c5fd' : currentRole === 'manager' ? '#d8b4fe' : '#fde68a',
              border: '1px solid currentColor',
              fontWeight: '600'
            }}>
              🔒 Active Staff Workstation Mode: {currentRole === 'officer' ? 'role_loan_officer' : currentRole === 'manager' ? 'role_loan_manager' : 'role_loan_auditor'}
            </span>
          </div>
        )}

        <div className="nav-cta">
          {/* Role Persona Switcher */}
          <div style={{ position: 'relative' }}>
            <select
              value={currentRole}
              onChange={(e) => setCurrentRole(e.target.value)}
              style={{
                background: currentRole === 'customer' 
                  ? 'rgba(15, 23, 42, 0.8)' 
                  : currentRole === 'officer' 
                  ? 'rgba(30, 58, 138, 0.5)' 
                  : currentRole === 'manager' 
                  ? 'rgba(88, 28, 135, 0.5)' 
                  : 'rgba(120, 53, 15, 0.5)',
                border: `1px solid ${
                  currentRole === 'customer' 
                    ? 'var(--border-subtle)' 
                    : currentRole === 'officer' 
                    ? '#3b82f6' 
                    : currentRole === 'manager' 
                    ? '#a855f7' 
                    : '#f59e0b'
                }`,
                color: currentRole === 'customer' 
                  ? '#cbd5e1' 
                  : currentRole === 'officer' 
                  ? '#93c5fd' 
                  : currentRole === 'manager' 
                  ? '#d8b4fe' 
                  : '#fde68a',
                padding: '7px 12px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer',
              }}
              title="Switch RBAC Persona View (Customer / Loan Officer / Manager / Auditor)"
            >
              <option value="customer">👤 Persona: Customer</option>
              <option value="officer">🔵 Staff: Loan Officer (Teller)</option>
              <option value="manager">🟣 Staff: Loan Manager (Approvals)</option>
              <option value="auditor">🟡 Staff: Loan Auditor (Compliance)</option>
            </select>
          </div>

          <button 
            type="button"
            className="btn-secondary"
            onClick={onOpenConsole}
            style={{ borderColor: 'rgba(59, 130, 246, 0.5)', background: 'rgba(59, 130, 246, 0.12)', color: '#93c5fd', fontWeight: '600' }}
            title="Open Interactive ADBMS Stored Procedure & Function Console"
          >
            <span style={{ color: '#60a5fa' }}>⚡</span>
            <span>ADBMS Console</span>
          </button>
          {currentRole === 'customer' && (
            <button 
              type="button"
              className="btn-primary"
              onClick={() => setActiveTab('apply')}
            >
              <span>Apply Online</span>
              <ArrowRightIcon size={15} />
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
