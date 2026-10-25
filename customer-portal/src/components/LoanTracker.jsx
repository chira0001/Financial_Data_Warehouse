import React, { useState, useEffect } from 'react'
import { SearchIcon, CreditCardIcon, CheckIcon, ClockIcon, PrinterIcon, DatabaseIcon } from './Icons'
import { loanApi } from '../api/loanApi'

export default function LoanTracker({ initialLoanId, onSwitchToManager }) {
  const [searchQuery, setSearchQuery] = useState(initialLoanId ? String(initialLoanId) : '7106')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  // Pay Modal state
  const [payModalLoan, setPayModalLoan] = useState(null)
  const [payAmount, setPayAmount] = useState(45000)
  const [payMethod, setPayMethod] = useState('LankaPay Real-Time Transfer')
  const [payLoading, setPayLoading] = useState(false)
  const [payReceipt, setPayReceipt] = useState(null)
  const [payError, setPayError] = useState('')
  const [copiedVoucher, setCopiedVoucher] = useState(false)

  const quickDemoFacilities = [
    { label: 'Application #7106 → Facility #2015 (Approved)', id: '7106' },
    { label: 'Application #7103 (Pending Underwriting)', id: '7103' },
    { label: 'Loan #2001 (Core Active Facility)', id: '2001' },
    { label: 'Loan #1005 (Commercial Overdue Facility)', id: '1005' },
    { label: 'Loan #1010 (Prime Residential Facility)', id: '1010' },
  ]

  const handleSearch = async (idToSearch) => {
    const q = idToSearch || searchQuery
    if (!q) return
    setLoading(true)
    setError('')
    try {
      const res = await loanApi.lookup(q)
      if (res && ((res.loans && res.loans.length > 0) || res.application)) {
        setData(res)
      } else {
        setError(`No active credit facilities or applications registered under reference: ${q}`)
        setData(null)
      }
    } catch (err) {
      setError(err.message || 'Unable to retrieve loan data.')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (initialLoanId) {
      setSearchQuery(String(initialLoanId))
      handleSearch(String(initialLoanId))
    } else {
      handleSearch('2001')
    }
  }, [initialLoanId])

  const handleOpenPay = (loan) => {
    setPayModalLoan(loan)
    const approx = Math.round(Number(loan.loan_amount) / 36)
    setPayAmount(approx > 0 ? approx : 45000)
    setPayReceipt(null)
    setPayError('')
    setCopiedVoucher(false)
  }

  const handleConfirmPayment = async (e) => {
    e.preventDefault()
    if (!payModalLoan) return
    setPayLoading(true)
    setPayError('')
    try {
      const res = await loanApi.pay({
        loanId: payModalLoan.loan_id,
        paymentAmount: payAmount,
        paymentMethod: payMethod,
      })
      if (res.success) {
        setPayReceipt({
          ...res,
          amount: payAmount,
          method: payMethod,
          date: new Date().toISOString().split('T')[0],
          loanId: payModalLoan.loan_id,
          loanType: payModalLoan.loan_type,
          customerName: payModalLoan.customer_name || 'Valued Customer',
        })
        handleSearch(String(payModalLoan.loan_id))
      }
    } catch (err) {
      setPayError(err.message || 'Settlement processing failed. Please verify facility terms.')
    } finally {
      setPayLoading(false)
    }
  }

  return (
    <section className="section" id="track">
      <div className="section-head">
        <span className="section-tag">Self-Service Account Servicing</span>
        <h2>Facility Status & Settlement History</h2>
        <p>Inspect active amortization schedules, outstanding principal balances, and execute electronic installment payments.</p>
      </div>

      <div className="track-wrapper">
        {/* Search Bar */}
        <div className="search-box">
          <input 
            type="text" 
            placeholder="Enter Facility Account ID (e.g. 2001, 1001, 1005) or Customer CIF (e.g. C0001)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button type="button" className="btn-primary" onClick={() => handleSearch()} disabled={loading}>
            <SearchIcon size={16} />
            <span>{loading ? 'Searching...' : 'Search Account'}</span>
          </button>
        </div>

        {/* Sample Active Account Lookup */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '24px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>Sample Facility Accounts:</span>
          {quickDemoFacilities.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`preset-pill ${searchQuery === f.id ? 'active' : ''}`}
              style={{ fontSize: '0.78rem', padding: '4px 10px' }}
              onClick={() => {
                setSearchQuery(f.id)
                handleSearch(f.id)
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ background: 'rgba(244, 63, 94, 0.12)', border: '1px solid var(--rose-500)', color: '#fca5a5', padding: '14px 18px', borderRadius: '10px', marginBottom: '24px', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        {/* Application Status Card (When facility is Pending Underwriting) */}
        {data && data.isApplicationOnly && data.application && (
          <div style={{ background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(245, 158, 11, 0.4)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.8rem', color: '#fde68a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Application Reference: #{data.application.application_id} • Borrower CIF: {data.application.customer_code}
                  </span>
                  <span style={{ fontSize: '0.72rem', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.4)', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                    🟡 {data.application.approval_status} Underwriting Review
                  </span>
                </div>
                <h3 style={{ fontSize: '1.4rem', margin: '2px 0 6px', color: '#f8fafc' }}>
                  {data.application.product_id} Loan Application
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '0.86rem', margin: 0 }}>
                  Applicant: <strong style={{ color: '#f8fafc' }}>{data.application.customer_name}</strong> • Branch: {data.application.branch_id || 'B001 (Colombo)'} • Sector: {data.application.occupation || 'Salaried'}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Date Received</span>
                <span style={{ fontSize: '0.9rem', color: '#f8fafc', fontWeight: '600' }}>{data.application.application_date || 'Today'}</span>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="loan-metrics-grid" style={{ marginBottom: '18px' }}>
              <div className="metric-cell">
                <span>Requested Principal</span>
                <strong style={{ color: '#f8fafc' }}>LKR {Number(data.application.applied_amount).toLocaleString()}</strong>
              </div>
              <div className="metric-cell">
                <span>Requested Tenure</span>
                <strong>{data.application.requested_tenure_months || 36} Months</strong>
              </div>
              <div className="metric-cell">
                <span>Credit Score Assessed</span>
                <strong style={{ color: data.application.credit_score >= 620 ? '#4ade80' : '#f87171' }}>
                  {data.application.credit_score} / 850
                </strong>
              </div>
              <div className="metric-cell">
                <span>Eligibility Status</span>
                <strong style={{ color: data.application.credit_score >= 620 ? '#4ade80' : '#fbbf24' }}>
                  {data.application.credit_score >= 620 ? 'Pre-Qualified (Score ≥ 620)' : 'Requires Special Review'}
                </strong>
              </div>
            </div>

            {/* Governance Info Box */}
            <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '8px', padding: '14px 18px', fontSize: '0.84rem', color: '#fef08a' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>⚖️ Underwriting Pipeline Stage:</div>
              <p style={{ margin: 0, color: '#e2e8f0', lineHeight: '1.4' }}>
                {data.application.decision_notes || 'Application queued in MySQL database waiting for Credit Committee authorization.'}
                <br />
                <span style={{ color: '#fbbf24', fontSize: '0.8rem', display: 'inline-block', marginTop: '6px' }}>
                  To disburse this loan into the core ledger, switch to <strong>"🟣 Staff: Loan Manager"</strong> in the top navbar and click <strong>"⚡ Underwrite & Approve"</strong> in the Live Underwriting Worklist.
                </span>
              </p>

              {data.application.decision_notes && data.application.decision_notes.includes('Endorsed Guarantor:') && (
                <div style={{ marginTop: '12px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '8px', padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: '#34d399', fontWeight: 'bold', fontSize: '0.82rem' }}>
                      🛡️ Nominated Guarantor (Pending Credit Committee Verification)
                    </span>
                    <span style={{ fontSize: '0.68rem', color: '#6ee7b7', background: 'rgba(16, 185, 129, 0.25)', padding: '2px 8px', borderRadius: '4px' }}>
                      Large Facility Endorsement
                    </span>
                  </div>
                  <div style={{ color: '#f1f5f9', fontSize: '0.82rem', lineHeight: '1.4' }}>
                    {data.application.decision_notes.split('Endorsed Guarantor:')[1]?.split('•')[0]?.trim()}
                  </div>
                </div>
              )}

              {onSwitchToManager && (
                <div style={{ marginTop: '14px' }}>
                  <button
                    type="button"
                    onClick={onSwitchToManager}
                    className="btn-primary"
                    style={{ fontSize: '0.78rem', padding: '6px 14px', background: 'linear-gradient(135deg, #9333ea, #7e22ce)' }}
                  >
                    🟣 Switch to Loan Manager & Underwrite Application #{data.application.application_id} ➔
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Approved & Disbursed Application Banner (Connecting Application ID to Disbursed Loan Facility) */}
        {data && data.application && data.loans && data.loans.length > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(6, 78, 59, 0.25))',
            border: '1px solid rgba(16, 185, 129, 0.45)',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '22px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.35)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 'bold', background: 'rgba(16, 185, 129, 0.3)', color: '#4ade80', padding: '3px 10px', borderRadius: '4px', border: '1px solid #10b981' }}>
                    ✓ APPLICATION APPROVED & FACILITY DISBURSED
                  </span>
                  <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                    Application Ref: <strong style={{ color: '#93c5fd' }}>#{data.application.application_id}</strong>
                  </span>
                  <span style={{ color: '#64748b' }}>➔</span>
                  <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                    Active Facility Account: <strong style={{ color: '#4ade80' }}>#{data.loans[0].loan_id}</strong>
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#cbd5e1' }}>
                  Borrower: <strong style={{ color: '#f8fafc' }}>{data.application.customer_name}</strong> ({data.application.customer_code}) • Decision: <strong>{data.application.decision_notes || 'Approved by Credit Committee'}</strong> • Sanctioned by Credit Committee and disbursed into Core Banking Ledger.
                </p>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', background: 'rgba(15, 23, 42, 0.7)', padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(148, 163, 184, 0.2)' }}>
                ℹ️ Searchable using either App ID <strong>#{data.application.application_id}</strong> or Facility ID <strong>#{data.loans[0].loan_id}</strong>
              </div>
            </div>
          </div>
        )}

        {/* Loan Details List */}
        {data && data.loans && data.loans.map((loan) => (
          <div key={loan.loan_id} className="loan-detail-card">
            <div className="loan-detail-top">
              <div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Facility Account: #{loan.loan_id} • Borrower CIF: C{String(loan.customer_id).padStart(4, '0')}
                  </span>
                  {data.application && (
                    <span style={{ fontSize: '0.72rem', background: 'rgba(168, 85, 247, 0.2)', color: '#d8b4fe', border: '1px solid rgba(168, 85, 247, 0.4)', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                      📋 Originated from App #{data.application.application_id}
                    </span>
                  )}
                  <span style={{ fontSize: '0.72rem', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--emerald-400)', border: '1px solid var(--emerald-500)', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                    KYC Verified
                  </span>
                </div>
                <h3 style={{ fontSize: '1.55rem', marginTop: '2px' }}>
                  {loan.loan_type} Loan Facility
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', marginTop: '4px' }}>
                  Account Holder: <strong style={{ color: 'var(--text-main)' }}>{loan.customer_name || 'Chaminda Silva'}</strong> • Branch: {loan.branch_id || 'B001 (Colombo)'} • Sector: {loan.occupation || 'Private Sector Salaried'}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className={`status-pill status-${(loan.loan_status || 'active').toLowerCase()}`}>
                  ● {loan.loan_status}
                </span>
                <button 
                  type="button"
                  className={loan.loan_status === 'Closed' ? 'btn-secondary' : 'btn-primary'} 
                  style={{ padding: '8px 16px', fontSize: '0.85rem', opacity: loan.loan_status === 'Closed' ? 0.6 : 1, cursor: loan.loan_status === 'Closed' ? 'not-allowed' : 'pointer' }}
                  onClick={() => handleOpenPay(loan)}
                  disabled={loan.loan_status === 'Closed'}
                  title={loan.loan_status === 'Closed' ? 'Facility is closed and fully settled' : 'Pay installment'}
                >
                  <CreditCardIcon size={14} />
                  <span>{loan.loan_status === 'Closed' ? 'Fully Settled (Closed)' : 'Settle Installment'}</span>
                </button>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="loan-metrics-grid">
              <div className="metric-cell">
                <span>Sanctioned Principal</span>
                <strong>LKR {Number(loan.loan_amount).toLocaleString()}</strong>
              </div>
              <div className="metric-cell">
                <span>Nominal Rate</span>
                <strong>{loan.interest_rate}% p.a.</strong>
              </div>
              <div className="metric-cell">
                <span>Total Recovered</span>
                <strong style={{ color: 'var(--emerald-400)' }}>
                  LKR {Number(loan.total_paid).toLocaleString()}
                </strong>
              </div>
              <div className="metric-cell">
                <span>Outstanding Balance</span>
                <strong style={{ color: 'var(--blue-500)' }}>
                  LKR {Number(loan.balance_remaining).toLocaleString()}
                </strong>
              </div>
              <div className="metric-cell">
                <span>Contract Expiry Date</span>
                <strong>{loan.loan_end_date || '2028-12-31'}</strong>
              </div>
            </div>

            {/* Progress Box */}
            <div className="loan-progress-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Amortization Repayment Progress</span>
                <strong style={{ color: 'var(--emerald-400)' }}>{loan.progress_pct}% Principal Settled</strong>
              </div>
              <div style={{ height: '9px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '5px', overflow: 'hidden' }}>
                <div style={{ width: `${loan.progress_pct}%`, height: '100%', background: 'linear-gradient(90deg, var(--emerald-500), #34d399)' }}></div>
              </div>
            </div>

            {/* Pledged Collateral & Guarantor Security (Member 2 Domain) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginBottom: '24px' }}>
              {/* Collateral Card */}
              <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px', padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#93c5fd' }}>🏢 Pledged Collateral Security</span>
                  <span style={{ fontSize: '0.68rem', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '2px 6px', borderRadius: '4px' }}>
                    loan_collaterals
                  </span>
                </div>
                {data.collaterals && data.collaterals.filter((c) => c.loan_id === loan.loan_id).length > 0 ? (
                  data.collaterals.filter((c) => c.loan_id === loan.loan_id).map((c) => (
                    <div key={c.collateral_id} style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                      <div style={{ fontWeight: '600', color: '#f8fafc' }}>{c.collateral_type}: {c.collateral_description}</div>
                      <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '4px' }}>
                        Valuation: <strong style={{ color: 'var(--emerald-400)' }}>LKR {Number(c.valuation_amount).toLocaleString()}</strong> • Ref: <span className="mono">{c.document_reference}</span>
                      </div>
                      <div style={{ color: '#64748b', fontSize: '0.72rem' }}>
                        Assessed by: {c.valuer_name} ({c.status})
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                    Standard unsecured retail credit facility (Assessed on borrower monthly cash flow).
                  </div>
                )}
              </div>

              {/* Guarantor Card */}
              <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#34d399' }}>👤 Registered Guarantor</span>
                  <span style={{ fontSize: '0.68rem', background: 'rgba(16, 185, 129, 0.2)', color: 'var(--emerald-400)', padding: '2px 6px', borderRadius: '4px' }}>
                    loan_guarantors
                  </span>
                </div>
                {data.guarantors && data.guarantors.filter((g) => g.loan_id === loan.loan_id).length > 0 ? (
                  data.guarantors.filter((g) => g.loan_id === loan.loan_id).map((g) => (
                    <div key={g.guarantor_id} style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                      <div style={{ fontWeight: '600', color: '#f8fafc' }}>{g.guarantor_name} <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>({g.relationship_to_borrower})</span></div>
                      <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '4px' }}>
                        NIC: <span className="mono">{g.nic_number}</span> • Monthly Income: LKR {Number(g.monthly_income).toLocaleString()}
                        {Number(g.guarantee_amount) > 0 && (
                          <span> • Guarantee Liability: <strong style={{ color: 'var(--emerald-400)' }}>LKR {Number(g.guarantee_amount).toLocaleString()}</strong></span>
                        )}
                      </div>
                      <div style={{ color: '#64748b', fontSize: '0.72rem' }}>
                        Employer: {g.employer_name} • Contact: {g.phone_number}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                    Direct primary borrower obligation without third-party guarantee endorsement.
                  </div>
                )}
              </div>
            </div>

            {/* Payments Table */}
            <div style={{ marginBottom: '28px' }}>
              <h4 style={{ fontSize: '1.02rem', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ClockIcon size={16} />
                <span>Verified Repayment Ledger</span>
                <small style={{ fontSize: '0.78rem', color: 'var(--text-faint)', fontWeight: 'normal' }}>
                  ({data.payments ? data.payments.filter((p) => p.loan_id === loan.loan_id).length : 0} transaction receipts)
                </small>
              </h4>

              {data.payments && data.payments.filter((p) => p.loan_id === loan.loan_id).length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table className="payment-table">
                    <thead>
                      <tr>
                        <th>Receipt ID</th>
                        <th>Settlement Date</th>
                        <th>Transacted Amount (LKR)</th>
                        <th>Payment Instrument</th>
                        <th>Reconciliation Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.payments.filter((p) => p.loan_id === loan.loan_id).map((p) => (
                        <tr key={p.payment_id}>
                          <td className="mono" style={{ color: 'var(--text-muted)' }}>RCP-{p.payment_id}</td>
                          <td className="mono">{p.payment_date}</td>
                          <td style={{ fontWeight: '600', color: 'var(--text-main)' }}>
                            LKR {Number(p.payment_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td>{p.payment_method}</td>
                          <td>
                            <span style={{ color: p.payment_status === 'Paid' ? 'var(--emerald-400)' : 'var(--amber-500)', fontSize: '0.8rem', fontWeight: 'bold' }}>
                              ● {p.payment_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ color: 'var(--text-faint)', fontSize: '0.88rem', padding: '12px 0' }}>
                  No installment payments recorded yet for this facility. Click <strong>"Settle Installment"</strong> to execute an online payment.
                </p>
              )}
            </div>

            {/* ADBMS Compliance Audit Trail Box */}
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px', padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <h4 style={{ fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: '8px', color: '#93c5fd' }}>
                  <DatabaseIcon size={16} />
                  <span>Database Audit Trail & State Transitions (MySQL loan_audit_log)</span>
                </h4>
                <span style={{ fontSize: '0.72rem', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', border: '1px solid #3b82f6', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                  ADBMS Core Feature: Triggers & Change Log
                </span>
              </div>

              {data.auditLogs && data.auditLogs.filter((a) => a.loan_id === loan.loan_id).length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table className="payment-table" style={{ fontSize: '0.82rem' }}>
                    <thead>
                      <tr>
                        <th>Log ID</th>
                        <th>Action Type</th>
                        <th>State Transition</th>
                        <th>Transacted / Disbursed</th>
                        <th>Modified By</th>
                        <th>Timestamp</th>
                        <th>Audit Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.auditLogs.filter((a) => a.loan_id === loan.loan_id).map((a) => (
                        <tr key={a.audit_id}>
                          <td className="mono" style={{ color: '#93c5fd' }}>#{a.audit_id}</td>
                          <td>
                            <span style={{ background: a.action_type === 'DISBURSEMENT' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)', color: a.action_type === 'DISBURSEMENT' ? 'var(--emerald-400)' : '#60a5fa', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>
                              {a.action_type}
                            </span>
                          </td>
                          <td className="mono">
                            {a.old_status || 'INIT'} → <strong style={{ color: 'var(--emerald-400)' }}>{a.new_status}</strong>
                          </td>
                          <td>
                            {a.new_amount ? `LKR ${Number(a.new_amount).toLocaleString()}` : '—'}
                          </td>
                          <td className="mono" style={{ color: 'var(--text-faint)' }}>{a.modified_by || 'system'}</td>
                          <td className="mono" style={{ color: 'var(--text-muted)' }}>{a.modified_at}</td>
                          <td style={{ color: 'var(--text-main)', maxWidth: '240px' }}>{a.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ color: 'var(--text-faint)', fontSize: '0.84rem' }}>
                  Audit log records are recorded automatically by MySQL stored procedures (<code style={{ color: '#93c5fd' }}>sp_disburse_new_loan</code> and <code style={{ color: '#93c5fd' }}>sp_process_loan_payment</code>).
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pay Installment Modal */}
      {payModalLoan && (
        <div className="modal-overlay">
          <div className="modal-content print-target">
            <button type="button" className="modal-close no-print" onClick={() => setPayModalLoan(null)}>✕</button>

            {payReceipt ? (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div className="no-print" style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', border: '2px solid var(--emerald-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--emerald-400)' }}>
                  <CheckIcon size={26} />
                </div>
                <h3>Settlement Executed Successfully</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '8px 0 16px' }}>
                  Your monthly loan repayment has been registered, reconciled, and audited in the core banking ledger.
                </p>
                
                {/* Official Banking Voucher */}
                <div style={{ background: 'var(--bg-surface)', border: '1px dashed var(--emerald-500)', padding: '18px', borderRadius: 'var(--radius-sm)', textAlign: 'left', margin: '14px 0', fontSize: '0.88rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px', marginBottom: '8px' }}>
                    <span>Apex Commercial Bank PLC</span>
                    <strong style={{ color: 'var(--emerald-400)' }}>OFFICIAL PAYMENT VOUCHER</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Voucher Reference:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong className="mono" style={{ color: '#93c5fd' }}>{payReceipt.receiptNo}</strong>
                      <button
                        type="button"
                        className="btn-secondary no-print"
                        style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                        onClick={() => {
                          navigator.clipboard.writeText(payReceipt.receiptNo)
                          setCopiedVoucher(true)
                          setTimeout(() => setCopiedVoucher(false), 2000)
                        }}
                      >
                        {copiedVoucher ? 'Copied ✓' : 'Copy'}
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Facility Account:</span>
                    <strong>#{payReceipt.loanId} ({payReceipt.loanType})</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Settled Amount:</span>
                    <strong style={{ color: 'var(--emerald-400)', fontSize: '1.05rem' }}>LKR {Number(payReceipt.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Payment Channel:</span>
                    <span>{payReceipt.method}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Timestamp:</span>
                    <span className="mono">{payReceipt.date}</span>
                  </div>
                  <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)', fontSize: '0.75rem', color: 'var(--text-faint)', textAlign: 'center' }}>
                    Electronically verified and signed by Apex CBSL Core Banking Engine.
                  </div>
                </div>

                <div className="no-print" style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                  <button 
                    type="button"
                    className="btn-secondary" 
                    style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    onClick={() => window.print()}
                  >
                    <PrinterIcon size={16} />
                    <span>Print Slip / PDF</span>
                  </button>
                  <button 
                    type="button"
                    className="btn-primary" 
                    style={{ flex: 1 }}
                    onClick={() => setPayModalLoan(null)}
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleConfirmPayment}>
                <h3 style={{ marginBottom: '6px' }}>Execute Installment Settlement</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
                  Facility Ref: #{payModalLoan.loan_id} ({payModalLoan.loan_type} Loan)
                </p>

                {payError && (
                  <div style={{ background: 'rgba(244, 63, 94, 0.12)', border: '1px solid var(--rose-500)', color: '#fca5a5', padding: '10px 14px', borderRadius: '6px', marginBottom: '16px', fontSize: '0.86rem' }}>
                    {payError}
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label>Installment Remittance Amount (LKR) *</label>
                  <input 
                    type="number" 
                    min="1000"
                    step="500"
                    value={payAmount}
                    onChange={(e) => setPayAmount(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label>Settlement Payment Channel *</label>
                  <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                    <option value="LankaPay Real-Time Transfer">LankaPay Real-Time Interbank Transfer</option>
                    <option value="Debit Card Settlement">Visa / Mastercard Debit Settlement</option>
                    <option value="Automated Standing Order">Automated Standing Order Mandate</option>
                    <option value="Branch Counter Cash">Provincial Branch Cash Deposit</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setPayModalLoan(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={payLoading}>
                    {payLoading ? 'Processing...' : `Confirm LKR ${payAmount.toLocaleString()}`}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
