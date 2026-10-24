import React from 'react'
import { ArrowRightIcon, CalculatorIcon, ShieldCheckIcon } from './Icons'

export default function Hero({ onExplore, onCalculate, onApply }) {
  return (
    <section className="hero-section">
      <div className="hero-pill">
        <ShieldCheckIcon size={16} />
        <span>Central Bank of Sri Lanka (CBSL) Regulated • Retail & SME Credit Division</span>
      </div>

      <h1 className="hero-title">
        Transparent, Structured Credit Facilities <br />
        <span className="highlight">For Personal Growth & Enterprise Expansion</span>
      </h1>

      <p className="hero-subtitle">
        Explore flexible personal financing, residential mortgages, vehicle leasing, and commercial SME capital with transparent amortization terms, competitive interest rates, and dedicated branch advisory.
      </p>

      <div className="hero-actions">
        <button 
          type="button"
          className="btn-primary" 
          onClick={onApply} 
          style={{ padding: '13px 26px', fontSize: '0.96rem' }}
        >
          <span>Start Online Application</span>
          <ArrowRightIcon size={16} />
        </button>
        <button 
          type="button"
          className="btn-secondary" 
          onClick={onCalculate} 
          style={{ padding: '13px 26px', fontSize: '0.96rem' }}
        >
          <CalculatorIcon size={16} />
          <span>Estimate Monthly EMI</span>
        </button>
      </div>

      <div className="hero-stats">
        <div className="stat-box">
          <div className="stat-num">6.87% - 12.50%</div>
          <div className="stat-label">Competitive Annual Percentage Rates (APR)</div>
        </div>
        <div className="stat-box">
          <div className="stat-num">LKR 4.85 Billion</div>
          <div className="stat-label">Total Cumulative Sanctioned Facilities</div>
        </div>
        <div className="stat-box">
          <div className="stat-num">Up to 20 Years</div>
          <div className="stat-label">Long-Term Flexible Repayment Schedules</div>
        </div>
        <div className="stat-box">
          <div className="stat-num">10 Branches</div>
          <div className="stat-label">Island-Wide Provincial Branch Support</div>
        </div>
      </div>
    </section>
  )
}
