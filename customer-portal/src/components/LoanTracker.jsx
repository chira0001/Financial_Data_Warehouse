import React, { useState, useEffect } from 'react'
import { SearchIcon, CreditCardIcon, CheckIcon, ClockIcon } from './Icons'
import { loanApi } from '../api/loanApi'

export default function LoanTracker({ initialLoanId }) {
  const [searchQuery, setSearchQuery] = useState(initialLoanId ? String(initialLoanId) : '1001')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  // Pay Modal state
  const [payModalLoan, setPayModalLoan] = useState(null)
  const [payAmount, setPayAmount] = useState(45000)
  const [payMethod, setPayMethod] = useState('LankaPay Real-Time Transfer')
  const [payLoading, setPayLoading] = useState(false)
  const [payReceipt, setPayReceipt] = useState(null)

  const handleSearch = async (idToSearch) => {
    const q = idToSearch || searchQuery
    if (!q) return
    setLoading(true)
    setError('')
    try {
      const res = await loanApi.lookup(q)
      if (res && res.loans && res.loans.length > 0) {
        setData(res)
      } else {
        setError(`No credit facilities registered under reference: ${q}`)
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
      handleSearch('1001')
    }
  }, [initialLoanId])

  const handleOpenPay = (loan) => {
    setPayModalLoan(loan)
    const approx = Math.round(Number(loan.loan_amount) / 36)
    setPayAmount(approx > 0 ? approx : 45000)
    setPayReceipt(null)
  }

  const handleConfirmPayment = async (e) => {
    e.preventDefault()
    if (!payModalLoan) return
    setPayLoading(true)
    try {
      const res = await loanApi.pay({
        loanId: payModalLoan.loan_id,
        paymentAmount: payAmount,
        paymentMethod: payMethod,
      })
      if (res.success) {
        setPayReceipt(res)
        handleSearch(String(payModalLoan.loan_id))
      }
    } catch (err) {
      alert('Settlement processing failed: ' + err.message)
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
            placeholder="Enter Facility Account ID (e.g. 1001, 1002, 2001) or Customer CIF (e.g. 1, C0001)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button type="button" className="btn-primary" onClick={() => handleSearch()} disabled={loading}>
            <SearchIcon size={16} />
            <span>{loading ? 'Searching...' : 'Search Account'}</span>
          </button>
        </div>

        {error && (
          <div style={{ background: 'rgba(244, 63, 94, 0.12)', border: '1px solid var(--rose-500)', color: '#fca5a5', padding: '14px 18px', borderRadius: '10px', marginBottom: '24px', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        {/* Loan Details List */}
        {data && data.loans && data.loans.map((loan) => (
          <div key={loan.loan_id} className="loan-detail-card">
            <div className="loan-detail-top">
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Facility Account: #{loan.loan_id} • Borrower CIF: C{String(loan.customer_id).padStart(4, '0')}
                </span>
                <h3 style={{ fontSize: '1.55rem', marginTop: '4px' }}>
                  {loan.loan_type} Loan Facility
                </h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className={`status-pill status-${(loan.loan_status || 'active').toLowerCase()}`}>
                  ● {loan.loan_status}
                </span>
                <button 
                  type="button"
                  className="btn-primary" 
                  style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                  onClick={() => handleOpenPay(loan)}
                >
                  <CreditCardIcon size={14} />
                  <span>Settle Installment</span>
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

            {/* Payments Table */}
            <div>
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
          </div>
        ))}
      </div>

      {/* Pay Installment Modal */}
      {payModalLoan && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button type="button" className="modal-close" onClick={() => setPayModalLoan(null)}>✕</button>

            {payReceipt ? (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', border: '2px solid var(--emerald-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--emerald-400)' }}>
                  <CheckIcon size={26} />
                </div>
                <h3>Settlement Executed Successfully</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '8px 0 16px' }}>
                  Your monthly loan repayment has been registered and reconciled in the banking ledger.
                </p>
                <div className="success-ref" style={{ margin: '10px 0' }}>
                  Electronic Receipt: {payReceipt.receiptNo}
                </div>
                <button 
                  type="button"
                  className="btn-primary" 
                  style={{ width: '100%', marginTop: '16px' }}
                  onClick={() => setPayModalLoan(null)}
                >
                  Close Receipt
                </button>
              </div>
            ) : (
              <form onSubmit={handleConfirmPayment}>
                <h3 style={{ marginBottom: '6px' }}>Execute Installment Settlement</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
                  Facility Ref: #{payModalLoan.loan_id} ({payModalLoan.loan_type} Loan)
                </p>

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
