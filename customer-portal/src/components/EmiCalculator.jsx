import React, { useState, useMemo } from 'react'
import { ArrowRightIcon } from './Icons'

export default function EmiCalculator({ initialProduct, onApplyWithPlan }) {
  const [amount, setAmount] = useState(initialProduct?.minAmount ? Math.max(initialProduct.minAmount, 1000000) : 1500000)
  const [tenureYears, setTenureYears] = useState(initialProduct?.maxTenure ? Math.min(Math.round(initialProduct.maxTenure / 12), 5) : 5)
  const [rate, setRate] = useState(initialProduct?.rate || 8.1)

  // Standard Banking EMI Formula: E = [P * r * (1+r)^n] / [(1+r)^n - 1]
  const { monthlyEmi, totalPayment, totalInterest, principalPct, interestPct } = useMemo(() => {
    const P = Number(amount)
    const annualRate = Number(rate)
    const n = Number(tenureYears) * 12

    if (P <= 0 || n <= 0) {
      return { monthlyEmi: 0, totalPayment: 0, totalInterest: 0, principalPct: 50, interestPct: 50 }
    }

    const r = (annualRate / 12) / 100

    let emi = 0
    if (r === 0) {
      emi = P / n
    } else {
      emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
    }

    const total = emi * n
    const interest = total - P
    const pPct = total > 0 ? Math.round((P / total) * 100) : 100
    const iPct = 100 - pPct

    return {
      monthlyEmi: Math.round(emi),
      totalPayment: Math.round(total),
      totalInterest: Math.round(interest),
      principalPct: pPct,
      interestPct: iPct,
    }
  }, [amount, tenureYears, rate])

  const amountPresets = [
    { label: '500,000', value: 500000 },
    { label: '1,000,000', value: 1000000 },
    { label: '2,500,000', value: 2500000 },
    { label: '5,000,000', value: 5000000 },
    { label: '10,000,000', value: 10000000 },
  ]

  const tenurePresets = [
    { label: '2 Years', value: 2 },
    { label: '5 Years', value: 5 },
    { label: '7 Years', value: 7 },
    { label: '10 Years', value: 10 },
    { label: '15 Years', value: 15 },
    { label: '20 Years', value: 20 },
  ]

  const ratePresets = [
    { label: 'Education (6.87%)', value: 6.87 },
    { label: 'Housing (8.10%)', value: 8.1 },
    { label: 'Vehicle (10.50%)', value: 10.5 },
    { label: 'Business (11.00%)', value: 11.0 },
    { label: 'Personal (12.50%)', value: 12.5 },
  ]

  return (
    <section className="section" id="calculator">
      <div className="section-head">
        <span className="section-tag">Amortization & Schedule Estimation</span>
        <h2>Equated Monthly Installment (EMI) Calculator</h2>
        <p>Project your exact repayment commitments, interest liability, and settlement amortization before submitting an application.</p>
      </div>

      <div className="calc-wrapper">
        <div className="calc-controls">
          {/* Amount Slider */}
          <div className="calc-control">
            <div className="calc-control-head">
              <label>Proposed Principal Amount</label>
              <div className="val-pill">LKR {Number(amount).toLocaleString()}</div>
            </div>
            <input 
              type="range"
              min="100000"
              max="15000000"
              step="50000"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="slider-input"
            />
            <div className="preset-pills">
              {amountPresets.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  className={`preset-pill ${amount === preset.value ? 'active' : ''}`}
                  onClick={() => setAmount(preset.value)}
                >
                  LKR {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tenure Slider */}
          <div className="calc-control">
            <div className="calc-control-head">
              <label>Repayment Term (Years / Months)</label>
              <div className="val-pill">{tenureYears} Years ({tenureYears * 12} Installments)</div>
            </div>
            <input 
              type="range"
              min="1"
              max="20"
              step="1"
              value={tenureYears}
              onChange={(e) => setTenureYears(Number(e.target.value))}
              className="slider-input"
            />
            <div className="preset-pills">
              {tenurePresets.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  className={`preset-pill ${tenureYears === preset.value ? 'active' : ''}`}
                  onClick={() => setTenureYears(preset.value)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Interest Rate */}
          <div className="calc-control">
            <div className="calc-control-head">
              <label>Nominal Annual Interest Rate</label>
              <div className="val-pill">{rate}% p.a.</div>
            </div>
            <input 
              type="range"
              min="5"
              max="20"
              step="0.05"
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              className="slider-input"
            />
            <div className="preset-pills">
              {ratePresets.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  className={`preset-pill ${rate === preset.value ? 'active' : ''}`}
                  onClick={() => setRate(preset.value)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Calculated Result Card */}
        <div className="calc-result-card">
          <div className="emi-main">
            <span>Estimated Equated Monthly Installment</span>
            <div className="emi-amount">LKR {monthlyEmi.toLocaleString()}</div>
            <small style={{ color: 'var(--text-muted)' }}>Fixed over {tenureYears * 12} consecutive calendar months</small>
          </div>

          <div className="calc-breakdown">
            <div className="breakdown-row">
              <span>Principal Disbursement:</span>
              <strong>LKR {Number(amount).toLocaleString()}</strong>
            </div>
            <div className="breakdown-row">
              <span>Total Interest Accrual:</span>
              <strong style={{ color: 'var(--blue-500)' }}>LKR {totalInterest.toLocaleString()}</strong>
            </div>
            <div className="breakdown-row">
              <span>Total Gross Commitment:</span>
              <strong style={{ color: 'var(--emerald-400)' }}>LKR {totalPayment.toLocaleString()}</strong>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-faint)', marginTop: '8px' }}>
                <span>Principal ({principalPct}%)</span>
                <span>Total Interest ({interestPct}%)</span>
              </div>
              <div className="ratio-bar">
                <div className="ratio-principal" style={{ width: `${principalPct}%` }}></div>
                <div className="ratio-interest" style={{ width: `${interestPct}%` }}></div>
              </div>
            </div>
          </div>

          <button 
            type="button"
            className="btn-primary" 
            style={{ width: '100%', padding: '13px', fontSize: '0.95rem' }}
            onClick={() => onApplyWithPlan({ amount, tenureYears, rate })}
          >
            <span>Proceed With This Financing Plan</span>
            <ArrowRightIcon size={16} />
          </button>
        </div>
      </div>
    </section>
  )
}
