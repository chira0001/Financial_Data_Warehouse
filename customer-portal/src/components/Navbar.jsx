import React from 'react'
import { BankIcon, ArrowRightIcon, ExternalLinkIcon } from './Icons'

export default function Navbar({ activeTab, setActiveTab }) {
  return (
    <header className="navbar">
      <div className="nav-container">
        <a href="#home" onClick={() => setActiveTab('home')} className="brand">
          <div className="brand-icon">
            <BankIcon size={22} />
          </div>
          <div className="brand-text">
            <h1>Apex Commercial Bank</h1>
            <span>Consumer & Corporate Credit Services</span>
          </div>
        </a>

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

        <div className="nav-cta">
          <button 
            type="button"
            className="btn-primary"
            onClick={() => setActiveTab('apply')}
          >
            <span>Apply Online</span>
            <ArrowRightIcon size={15} />
          </button>
          <a 
            href="http://localhost:5173" 
            target="_blank" 
            rel="noreferrer"
            className="btn-secondary"
            title="Open Internal Data Warehouse Control Room"
          >
            <span>Internal DW Control</span>
            <ExternalLinkIcon size={13} />
          </a>
        </div>
      </div>
    </header>
  )
}
