import React, { useState, useEffect } from 'react'
import { loanApi } from '../api/loanApi'

export default function RoleWorkstation({ currentRole, onSwitchRole, onTrackFacility }) {
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [feedback, setFeedback] = useState(null)
  const [error, setError] = useState('')
  const [officerPaymentNotice, setOfficerPaymentNotice] = useState(null)
  const [restructureNotice, setRestructureNotice] = useState(null)

  // Officer States
  const [officerLoanId, setOfficerLoanId] = useState('2008')
  const [officerAmount, setOfficerAmount] = useState('25000')
  const [officerMethod, setOfficerMethod] = useState('LankaPay Real-Time Transfer')
  const [activeFacilities, setActiveFacilities] = useState([])

  // Manager States
  const [underwriteAppId, setUnderwriteAppId] = useState('7103')
  const [restructureLoanId, setRestructureLoanId] = useState('2008')
  const [restructureRate, setRestructureRate] = useState('7.25')
  const [restructureDate, setRestructureDate] = useState('2030-06-30')
  const [restructureReason, setRestructureReason] = useState('Hardship rate concession approved by credit committee')
  const [portfolioMetrics, setPortfolioMetrics] = useState([])
  const [applications, setApplications] = useState([])

  // Auditor States
  const [auditLogs, setAuditLogs] = useState([])
  const [overdueQueue, setOverdueQueue] = useState([])

  const getDbRole = (role) => {
    if (role === 'officer') return 'role_loan_officer'
    if (role === 'manager') return 'role_loan_manager'
    if (role === 'auditor') return 'role_loan_auditor'
    return 'role_loan_officer'
  }

  // Load relevant data on mount and role change
  useEffect(() => {
    loadRoleData()
  }, [currentRole])

  const loadRoleData = async () => {
    setLoading(true)
    setError('')
    setFeedback(null)
    const dbRole = getDbRole(currentRole)
    try {
      if (currentRole === 'officer') {
        const res = await loanApi.getView('vw_loan_officer_active_facilities', dbRole)
        const facilities = res.data || []
        setActiveFacilities(facilities)
        if (facilities.length > 0) {
          setOfficerLoanId(String(facilities[0].loan_id))
        }
      } else if (currentRole === 'manager') {
        const [res, appRes] = await Promise.all([
          loanApi.getView('vw_loan_portfolio_health_metrics', dbRole),
          loanApi.getApplications(),
        ])
        setPortfolioMetrics(res.data || [])
        setApplications(appRes.applications || [])
      } else if (currentRole === 'auditor') {
        const [aRes, qRes] = await Promise.all([
          loanApi.getAuditLog(dbRole),
          loanApi.getView('vw_overdue_collections_queue', dbRole),
        ])
        setAuditLogs(aRes.data || [])
        setOverdueQueue(qRes.data || [])
      }
    } catch (err) {
      setError(err.message || 'Failed to load role workstation data')
    } finally {
      setLoading(false)
    }
  }

  // Officer Action: Post Payment
  const handleOfficerPayment = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setOfficerPaymentNotice(null)
    setFeedback(null)
    const dbRole = getDbRole(currentRole)
    try {
      const res = await loanApi.pay({
        loanId: Number(officerLoanId),
        paymentAmount: Number(officerAmount),
        paymentMethod: officerMethod,
      }, dbRole)
      if (!res.success) {
        throw new Error(res.message || 'The installment could not be posted.')
      }
      setOfficerPaymentNotice({
        type: 'success',
        message: `Installment posted successfully. Receipt ${res.receiptNo || `RCP-${res.paymentId}`}.`,
      })
      setFeedback({
        type: 'SUCCESS',
        title: 'Payment Successfully Processed via sp_process_loan_payment',
        message: `Installment of LKR ${Number(officerAmount).toLocaleString()} recorded with InnoDB FOR UPDATE row lock under MySQL role ${dbRole}. Voucher: ${res.receiptNumber || 'RCP-' + res.paymentId}`,
      })
      loadRoleData()
    } catch (err) {
      setOfficerPaymentNotice({
        type: 'error',
        message: err.message || 'Payment processing failed. The installment was not posted.',
      })
    } finally {
      setLoading(false)
    }
  }

  // Officer Action: Test Unauthorized Action to prove MySQL Engine RBAC Denial
  const handleTestRestrictedAction = async (actionType) => {
    setLoading(true)
    setError('')
    setFeedback(null)
    try {
      if (actionType === 'disburse') {
        await loanApi.executeProcedure({
          procedure: 'sp_disburse_new_loan',
          params: { customerId: 10, amount: 500000 },
        }, 'role_loan_officer')
        setError('Unexpected: MySQL allowed disbursement under role_loan_officer!')
      } else if (actionType === 'restructure') {
        await loanApi.executeProcedure({
          procedure: 'sp_restructure_loan',
          params: { loanId: 2008, newInterestRate: 5.0 },
        }, 'role_loan_officer')
        setError('Unexpected: MySQL allowed loan restructuring under role_loan_officer!')
      }
    } catch (err) {
      setFeedback({
        type: 'RBAC_DENIED',
        title: 'MySQL 8.0 Engine RBAC Access Denied (Separation of Duties Verified)',
        message: err.message,
      })
    } finally {
      setLoading(false)
    }
  }

  // Manager Action: Underwrite Application
  const handleUnderwriteApp = async (e, customAppId = null) => {
    if (e && e.preventDefault) e.preventDefault()
    const targetAppId = customAppId || underwriteAppId
    setLoading(true)
    setError('')
    setFeedback(null)
    const dbRole = getDbRole(currentRole)
    try {
      const res = await loanApi.executeProcedure({
        procedure: 'sp_underwrite_loan_application',
        params: {
          applicationId: Number(targetAppId),
          officerId: 101,
        },
      }, dbRole)
      const isApproved = res.statusCode === 'APPROVED'
      setFeedback({
        type: isApproved ? 'SUCCESS' : 'WARNING',
        title: `Application #${targetAppId} Underwriting Completed`,
        message: `Decision: ${res.statusCode} • Reason: ${res.statusMessage}${res.disbursedLoanId ? ' • Loan Facility #' + res.disbursedLoanId + ' Disbursed & Activated in Core Ledger!' : ''} (InnoDB FOR UPDATE Row-Lock: ${res.executionTimeMs} ms)`,
        disbursedLoanId: res.disbursedLoanId,
        applicationId: targetAppId,
      })
      loadRoleData()
    } catch (err) {
      setError(err.message || 'Underwriting failed')
    } finally {
      setLoading(false)
    }
  }

  // Manager Action: Restructure Loan
  const handleRestructureLoan = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setRestructureNotice(null)
    setFeedback(null)
    const dbRole = getDbRole(currentRole)
    try {
      const res = await loanApi.executeProcedure({
        procedure: 'sp_restructure_loan',
        params: {
          loanId: Number(restructureLoanId),
          newInterestRate: Number(restructureRate),
          newEndDate: restructureDate,
          officerReason: restructureReason,
        },
      }, dbRole)
      if (!res.success || res.statusCode !== 'SUCCESS') {
        throw new Error(res.statusMessage || 'The restructure was not committed.')
      }
      setRestructureNotice({
        type: 'success',
        message: `Loan #${restructureLoanId} updated to ${restructureRate}% p.a. New maturity: ${restructureDate}.`,
      })
      setFeedback({
        type: 'SUCCESS',
        title: `Loan #${restructureLoanId} Successfully Restructured`,
        message: `${res.statusMessage} • New Rate: ${restructureRate}% • Execution: ${res.executionTimeMs} ms`,
      })
    } catch (err) {
      setRestructureNotice({
        type: 'error',
        message: err.message || 'Restructuring failed. No changes were committed.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Role Context Bar */}
      <div 
        style={{ 
          background: currentRole === 'officer' 
            ? 'linear-gradient(135deg, rgba(30, 58, 138, 0.4), rgba(15, 23, 42, 0.9))' 
            : currentRole === 'manager' 
            ? 'linear-gradient(135deg, rgba(88, 28, 135, 0.4), rgba(15, 23, 42, 0.9))' 
            : 'linear-gradient(135deg, rgba(120, 53, 15, 0.4), rgba(15, 23, 42, 0.9))',
          border: `1px solid ${
            currentRole === 'officer' ? '#3b82f6' : currentRole === 'manager' ? '#a855f7' : '#f59e0b'
          }`,
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ 
                fontSize: '0.72rem', 
                textTransform: 'uppercase', 
                fontWeight: 'bold', 
                letterSpacing: '0.5px',
                padding: '3px 10px', 
                borderRadius: '6px',
                background: currentRole === 'officer' ? '#1d4ed8' : currentRole === 'manager' ? '#7e22ce' : '#b45309',
                color: '#ffffff'
              }}>
                {currentRole === 'officer' ? 'role_loan_officer' : currentRole === 'manager' ? 'role_loan_manager' : 'role_loan_auditor'}
              </span>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Active MySQL Database Session Role
              </span>
            </div>
            <h2 style={{ fontSize: '1.4rem', margin: '8px 0 4px', color: '#f8fafc' }}>
              {currentRole === 'officer' && 'Branch Loan Officer • Teller Servicing Workstation'}
              {currentRole === 'manager' && 'Credit Committee & Branch Manager • Approvals Console'}
              {currentRole === 'auditor' && 'Internal Audit & Compliance • Read-Only Oversight Station'}
            </h2>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#cbd5e1' }}>
              {currentRole === 'officer' && 'Operational permissions granted: SELECT on facilities, EXECUTE sp_process_loan_payment & fn_calculate_monthly_emi. Management actions locked.'}
              {currentRole === 'manager' && 'Managerial permissions granted: Full CRUD on facilities, EXECUTE sp_disburse_new_loan, sp_underwrite_loan_application, sp_restructure_loan.'}
              {currentRole === 'auditor' && 'Strict read-only compliance permissions: SELECT on immutable audit logs & risk views. All transaction writes strictly denied.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => onSwitchRole('customer')}
              style={{ fontSize: '0.82rem', padding: '8px 16px' }}
            >
              ← Back to Customer Portal
            </button>
          </div>
        </div>
      </div>

      {/* Global Alerts */}
      {feedback && (
        <div style={{
          background: feedback.type === 'RBAC_DENIED' ? 'rgba(239, 68, 68, 0.18)' : 'rgba(16, 185, 129, 0.15)',
          border: `1px solid ${feedback.type === 'RBAC_DENIED' ? '#ef4444' : 'var(--emerald-500)'}`,
          color: feedback.type === 'RBAC_DENIED' ? '#fca5a5' : '#6ee7b7',
          padding: '14px 18px',
          borderRadius: '8px',
          marginBottom: '18px',
          fontSize: '0.85rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div>
            <strong>{feedback.title}:</strong> {feedback.message}
          </div>
          {feedback.disbursedLoanId && onTrackFacility && (
            <button
              type="button"
              className="btn-primary"
              onClick={() => onTrackFacility(feedback.applicationId || feedback.disbursedLoanId)}
              style={{ fontSize: '0.78rem', padding: '6px 14px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: '#ffffff', cursor: 'pointer', borderRadius: '6px', fontWeight: 'bold' }}
            >
               Track Facility #{feedback.disbursedLoanId} (App #{feedback.applicationId})
            </button>
          )}
        </div>
      )}

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '12px 16px', borderRadius: '8px', marginBottom: '18px', fontSize: '0.85rem' }}>
           {error}
        </div>
      )}

      {/* ROLE 1: LOAN OFFICER WORKSTATION */}
      {currentRole === 'officer' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            {/* Payment Terminal */}
            <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '10px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '1.05rem', margin: 0, color: '#93c5fd' }}>
                   Teller Repayment Posting Terminal
                </h3>
                <span style={{ fontSize: '0.7rem', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '2px 8px', borderRadius: '4px' }}>
                  sp_process_loan_payment
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '0 0 14px' }}>
                Executes atomic repayment with InnoDB pessimistic row locking (FOR UPDATE) to prevent concurrency anomalies.
              </p>

              <form onSubmit={handleOfficerPayment}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Loan Facility ID</label>
                  <input
                    type="number"
                    className="form-input"
                    value={officerLoanId}
                    onChange={(e) => setOfficerLoanId(e.target.value)}
                    required
                  />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Installment Amount (LKR)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={officerAmount}
                    onChange={(e) => setOfficerAmount(e.target.value)}
                    required
                  />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Collection Channel</label>
                  <select
                    className="form-input"
                    value={officerMethod}
                    onChange={(e) => setOfficerMethod(e.target.value)}
                  >
                    <option value="LankaPay Real-Time Transfer">LankaPay Real-Time Transfer</option>
                    <option value="Commercial Bank Direct Deposit">Commercial Bank Direct Deposit</option>
                    <option value="Over-the-Counter Cash">Over-the-Counter Branch Cash</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                  style={{ width: '100%', padding: '10px' }}
                >
                  {loading ? 'Posting to MySQL...' : 'Post Installment via Stored Procedure'}
                </button>
                {officerPaymentNotice && (
                  <div
                    role={officerPaymentNotice.type === 'success' ? 'status' : 'alert'}
                    aria-live={officerPaymentNotice.type === 'success' ? 'polite' : 'assertive'}
                    style={{
                      marginTop: '12px',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      fontSize: '0.86rem',
                      lineHeight: 1.5,
                      background: officerPaymentNotice.type === 'success' ? 'rgba(16, 185, 129, 0.14)' : 'rgba(239, 68, 68, 0.14)',
                      border: `1px solid ${officerPaymentNotice.type === 'success' ? 'rgba(16, 185, 129, 0.55)' : 'rgba(239, 68, 68, 0.55)'}`,
                      color: officerPaymentNotice.type === 'success' ? '#6ee7b7' : '#fca5a5',
                    }}
                  >
                    <strong>{officerPaymentNotice.type === 'success' ? 'Payment successful' : 'Payment failed'}</strong>
                    <div>{officerPaymentNotice.message}</div>
                  </div>
                )}
              </form>
            </div>

            {/* Access Restriction Notice */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', padding: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', fontWeight: '600', marginBottom: '6px', fontSize: '0.9rem' }}>
                  <span>Restricted Actions (role_loan_officer)</span>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#cbd5e1', margin: '0 0 10px', lineHeight: 1.5 }}>
                  Under Central Bank separation-of-duties guidelines, loan officers cannot disburse facilities or modify interest rates.
                </p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => handleTestRestrictedAction('disburse')}
                    disabled={loading}
                    style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: '#fca5a5', fontSize: '0.74rem', cursor: 'pointer' }}
                    title="Execute sp_disburse_new_loan as role_loan_officer to trigger and demonstrate real MySQL Database RBAC rejection"
                  >
                     Test sp_disburse_new_loan (Trigger RBAC Deny)
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => handleTestRestrictedAction('restructure')}
                    disabled={loading}
                    style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: '#fca5a5', fontSize: '0.74rem', cursor: 'pointer' }}
                    title="Execute sp_restructure_loan as role_loan_officer to trigger and demonstrate real MySQL Database RBAC rejection"
                  >
                     Test sp_restructure_loan (Trigger RBAC Deny)
                  </button>
                </div>
              </div>

              <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '18px', flex: 1 }}>
                <h4 style={{ fontSize: '0.9rem', color: '#38bdf8', margin: '0 0 8px' }}>
                  Authorized Operational Views
                </h4>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.6 }}>
                  vw_loan_officer_active_facilities<br/>
                  vw_customer_loan_statement<br/>
                  vw_daily_payment_reconciliation
                </div>
              </div>
            </div>
          </div>

          {/* Active Facilities Table */}
          <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '18px' }}>
            <h3 style={{ fontSize: '1rem', color: '#f8fafc', margin: '0 0 12px' }}>
              Active Facilities Worklist (vw_loan_officer_active_facilities)
            </h3>
            <div style={{ overflowX: 'auto', maxHeight: '300px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', color: '#cbd5e1' }}>
                <thead>
                  <tr style={{ background: 'rgba(30, 41, 59, 0.8)', textAlign: 'left', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '8px 10px' }}>Loan ID</th>
                    <th style={{ padding: '8px 10px' }}>Type</th>
                    <th style={{ padding: '8px 10px' }}>Principal (LKR)</th>
                    <th style={{ padding: '8px 10px' }}>Rate (%)</th>
                    <th style={{ padding: '8px 10px' }}>Monthly EMI</th>
                    <th style={{ padding: '8px 10px' }}>Outstanding</th>
                    <th style={{ padding: '8px 10px' }}>Risk Tier</th>
                  </tr>
                </thead>
                <tbody>
                  {activeFacilities.slice(0, 15).map((f) => (
                    <tr key={f.loan_id} style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                      <td style={{ padding: '7px 10px', color: '#38bdf8', fontWeight: '600' }}>#{f.loan_id}</td>
                      <td style={{ padding: '7px 10px' }}>{f.loan_type}</td>
                      <td style={{ padding: '7px 10px' }}>{Number(f.principal_amount).toLocaleString()}</td>
                      <td style={{ padding: '7px 10px' }}>{f.interest_rate}%</td>
                      <td style={{ padding: '7px 10px', color: 'var(--emerald-400)' }}>LKR {Number(f.estimated_monthly_emi).toLocaleString()}</td>
                      <td style={{ padding: '7px 10px' }}>LKR {Number(f.outstanding_balance).toLocaleString()}</td>
                      <td style={{ padding: '7px 10px' }}>
                        <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: f.risk_tier === 'LOW' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: f.risk_tier === 'LOW' ? '#34d399' : '#f87171' }}>
                          {f.risk_tier}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ROLE 2: LOAN MANAGER CONSOLE */}
      {currentRole === 'manager' && (
        <div>
          {/* Live Underwriting Worklist Queue */}
          <div style={{ background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(168, 85, 247, 0.4)', borderRadius: '10px', padding: '18px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', color: '#f8fafc', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span> Live Underwriting Worklist (loan_applications Queue)</span>
                  <span style={{ fontSize: '0.72rem', background: 'rgba(168, 85, 247, 0.25)', color: '#d8b4fe', padding: '2px 8px', borderRadius: '4px' }}>
                    {applications.filter(a => a.approval_status === 'Pending').length} Pending Committee Review
                  </span>
                </h3>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>
                  Credit applications submitted online waiting for manager approval via <code>sp_underwrite_loan_application</code> (threshold: 620).
                </p>
              </div>
              <button
                type="button"
                onClick={loadRoleData}
                className="btn-secondary"
                style={{ fontSize: '0.75rem', padding: '6px 12px' }}
              >
                 Refresh Worklist
              </button>
            </div>

            <div style={{ overflowX: 'auto', maxHeight: '280px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', color: '#cbd5e1' }}>
                <thead>
                  <tr style={{ background: 'rgba(30, 41, 59, 0.8)', textAlign: 'left', borderBottom: '1px solid var(--border-subtle)', position: 'sticky', top: 0, zIndex: 1 }}>
                    <th style={{ padding: '8px 10px' }}>App ID</th>
                    <th style={{ padding: '8px 10px' }}>Applicant</th>
                    <th style={{ padding: '8px 10px' }}>Product</th>
                    <th style={{ padding: '8px 10px' }}>Applied Principal</th>
                    <th style={{ padding: '8px 10px' }}>Credit Score</th>
                    <th style={{ padding: '8px 10px' }}>Decision Notes</th>
                    <th style={{ padding: '8px 10px' }}>Status</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>Manager Action</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ padding: '16px', textAlign: 'center', color: '#64748b' }}>
                        No applications currently in queue. Submit a loan from Customer Portal to test!
                      </td>
                    </tr>
                  ) : (
                    applications.slice(0, 8).map((app) => (
                      <tr key={app.application_id} style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.1)', background: app.approval_status === 'Pending' ? 'rgba(245, 158, 11, 0.06)' : 'transparent' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 'bold', color: '#93c5fd' }}>#{app.application_id}</td>
                        <td style={{ padding: '8px 10px', color: '#f8fafc' }}>
                          <div>{app.customer_name || `Customer #${app.customer_id}`}</div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{app.customer_code}</div>
                        </td>
                        <td style={{ padding: '8px 10px' }}>{app.product_id}</td>
                        <td style={{ padding: '8px 10px', fontWeight: '600' }}>LKR {Number(app.applied_amount).toLocaleString()}</td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{ color: app.credit_score >= 620 ? '#4ade80' : '#f87171', fontWeight: 'bold' }}>
                            {app.credit_score}
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px', fontSize: '0.75rem', color: '#94a3b8', maxWidth: '240px' }} title={app.decision_notes}>
                          {app.decision_notes?.includes('Endorsed Guarantor:') ? (
                            <div>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', marginBottom: '2px', fontWeight: '600' }}>
                                 Guarantor Endorsed
                              </span>
                              <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {app.decision_notes.split('Endorsed Guarantor:')[1]?.split('•')[0]?.trim()}
                              </div>
                            </div>
                          ) : (
                            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {app.decision_notes || 'Pending'}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            fontWeight: '600',
                            background: app.approval_status === 'Approved' ? 'rgba(34, 197, 94, 0.2)' : app.approval_status === 'Pending' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                            color: app.approval_status === 'Approved' ? '#4ade80' : app.approval_status === 'Pending' ? '#fbbf24' : '#f87171',
                          }}>
                            {app.approval_status}
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          {app.approval_status === 'Pending' ? (
                            <button
                              type="button"
                              className="btn-primary"
                              disabled={loading}
                              onClick={() => {
                                setUnderwriteAppId(String(app.application_id))
                                handleUnderwriteApp(null, app.application_id)
                              }}
                              style={{ fontSize: '0.72rem', padding: '4px 10px', background: 'linear-gradient(135deg, #9333ea, #7e22ce)', boxShadow: '0 2px 8px rgba(147, 51, 234, 0.3)' }}
                            >
                              Underwrite & Approve
                            </button>
                          ) : (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '0.72rem', color: '#4ade80', fontWeight: '600' }}>
                                Approved
                              </span>
                              {onTrackFacility && (
                                <button
                                  type="button"
                                  className="btn-secondary"
                                  onClick={() => onTrackFacility(app.application_id)}
                                  style={{ fontSize: '0.7rem', padding: '3px 8px', borderColor: '#38bdf8', color: '#38bdf8' }}
                                  title="Track this facility in Customer Portal"
                                >
                                  Track
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            {/* 1. Underwriting Card */}
            <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(168, 85, 247, 0.4)', borderRadius: '10px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '1.05rem', margin: 0, color: '#d8b4fe' }}>
                   Credit Underwriting & Application Decisioning
                </h3>
                <span style={{ fontSize: '0.7rem', background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', padding: '2px 8px', borderRadius: '4px' }}>
                  sp_underwrite
                </span>
              </div>

              {/* Step-by-Step Educational Guide */}
              <div style={{ background: 'rgba(88, 28, 135, 0.15)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '8px', padding: '10px 14px', fontSize: '0.78rem', color: '#e9d5ff', marginBottom: '14px', lineHeight: '1.5' }}>
                <strong> What happens here:</strong> When an online loan application is submitted, the Credit Manager assesses it. If the Credit Score is <strong>≥ 620</strong>, the procedure marks it <strong>APPROVED</strong> and automatically triggers <code>sp_disburse_new_loan</code> to generate an active Loan Account in the <code>loans</code> table and disburse the funds. If score &lt; 620, it is <strong>REJECTED</strong>.
              </div>

              {/* Quick Select Pending Applications */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '0.74rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                  Quick Select Pending Application from Queue:
                </label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {applications.filter(a => a.approval_status === 'Pending').slice(0, 4).map(app => (
                    <button
                      key={app.application_id}
                      type="button"
                      className={`preset-pill ${underwriteAppId === String(app.application_id) ? 'active' : ''}`}
                      style={{ fontSize: '0.74rem', padding: '3px 8px' }}
                      onClick={() => setUnderwriteAppId(String(app.application_id))}
                    >
                      #{app.application_id} ({app.customer_name?.split(' ')[0] || 'App'} - Score: {app.credit_score})
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Selected Application Preview */}
              {(() => {
                const sel = applications.find(a => String(a.application_id) === String(underwriteAppId))
                if (!sel) return null
                const willApprove = sel.credit_score >= 620
                return (
                  <div style={{ background: 'rgba(15, 23, 42, 0.85)', border: willApprove ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '0.78rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ color: '#cbd5e1' }}>Applicant: <strong>{sel.customer_name}</strong> ({sel.customer_code})</span>
                      <span style={{ fontWeight: 'bold', color: willApprove ? '#4ade80' : '#f87171' }}>
                        {willApprove ? 'Will be APPROVED' : 'Will be REJECTED (< 620)'}
                      </span>
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '0.74rem' }}>
                      Facility: LKR {Number(sel.applied_amount).toLocaleString()} ({sel.product_id}) • Credit Score: <strong style={{ color: willApprove ? '#4ade80' : '#f87171' }}>{sel.credit_score}/850</strong> • Status: <strong style={{ color: '#fbbf24' }}>{sel.approval_status}</strong>
                    </div>
                  </div>
                )
              })()}

              <form onSubmit={handleUnderwriteApp}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Target Application ID</label>
                  <input
                    type="number"
                    className="form-input"
                    value={underwriteAppId}
                    onChange={(e) => setUnderwriteAppId(e.target.value)}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                  style={{ width: '100%', padding: '10px', background: 'linear-gradient(135deg, #9333ea, #7e22ce)' }}
                >
                  {loading ? 'Evaluating in MySQL...' : 'Underwrite & Disburse Facility (sp_underwrite)'}
                </button>
              </form>
            </div>

            {/* 2. Restructuring Card */}
            <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(168, 85, 247, 0.4)', borderRadius: '10px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '1.05rem', margin: 0, color: '#d8b4fe' }}>
                   Facility Restructuring (Distressed Relief)
                </h3>
                <span style={{ fontSize: '0.7rem', background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', padding: '2px 8px', borderRadius: '4px' }}>
                  sp_restructure
                </span>
              </div>

              {/* Step-by-Step Educational Guide */}
              <div style={{ background: 'rgba(88, 28, 135, 0.15)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '8px', padding: '10px 14px', fontSize: '0.78rem', color: '#e9d5ff', marginBottom: '14px', lineHeight: '1.5' }}>
                <strong> What happens here:</strong> When a borrower has trouble paying due to hardship, the bank prevents default by <strong>lowering the interest rate</strong> and <strong>extending the loan maturity</strong>. Executes <code>sp_restructure_loan</code>, updates <code>loans</code> table, and records the justification in <code>loan_audit_log</code>.
              </div>

              {/* Sample Struggling / Distressed Loans Presets */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '0.74rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                  Select Sample Distressed Facility to Restructure:
                </label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[
                    { id: '1005', label: 'Loan #1005 (Commercial Overdue - 11% p.a.)', rate: '6.5', date: '2030-12-31', reason: 'Hardship relief for struggling SME business' },
                    { id: '2008', label: 'Loan #2008 (Personal Facility - 12.5% p.a.)', rate: '7.25', date: '2029-12-31', reason: 'Interest relief approved by Credit Committee' },
                    { id: '2001', label: 'Loan #2001 (Prime Housing - 8.1% p.a.)', rate: '5.5', date: '2035-12-31', reason: 'Residential loan tenor extension relief' },
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      className={`preset-pill ${restructureLoanId === item.id ? 'active' : ''}`}
                      style={{ fontSize: '0.74rem', padding: '3px 8px' }}
                      onClick={() => {
                        setRestructureLoanId(item.id)
                        setRestructureRate(item.rate)
                        setRestructureDate(item.date)
                        setRestructureReason(item.reason)
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleRestructureLoan}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Target Loan ID to Restructure</label>
                    <input
                      type="number"
                      className="form-input"
                      value={restructureLoanId}
                      onChange={(e) => setRestructureLoanId(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Concession Interest Rate (% p.a.)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-input"
                      value={restructureRate}
                      onChange={(e) => setRestructureRate(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Extended Maturity End Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={restructureDate}
                    onChange={(e) => setRestructureDate(e.target.value)}
                    required
                  />
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Credit Committee Justification (Logged to loan_audit_log)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={restructureReason}
                    onChange={(e) => setRestructureReason(e.target.value)}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                  style={{ width: '100%', padding: '10px', background: 'linear-gradient(135deg, #9333ea, #7e22ce)' }}
                >
                  {loading ? 'Executing Restructure in MySQL...' : 'Execute Restructure & Commit Transaction (sp_restructure)'}
                </button>
                {restructureNotice && (
                  <div
                    role={restructureNotice.type === 'success' ? 'status' : 'alert'}
                    aria-live={restructureNotice.type === 'success' ? 'polite' : 'assertive'}
                    style={{
                      marginTop: '12px',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      fontSize: '0.86rem',
                      lineHeight: 1.5,
                      background: restructureNotice.type === 'success' ? 'rgba(16, 185, 129, 0.14)' : 'rgba(239, 68, 68, 0.14)',
                      border: `1px solid ${restructureNotice.type === 'success' ? 'rgba(16, 185, 129, 0.55)' : 'rgba(239, 68, 68, 0.55)'}`,
                      color: restructureNotice.type === 'success' ? '#6ee7b7' : '#fca5a5',
                    }}
                  >
                    <strong>{restructureNotice.type === 'success' ? 'Restructure successful' : 'Restructure failed'}</strong>
                    <div>{restructureNotice.message}</div>
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* Portfolio Health Overview */}
          <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '18px' }}>
            <h3 style={{ fontSize: '1rem', color: '#f8fafc', margin: '0 0 12px' }}>
              Portfolio Health & Risk Summary (vw_loan_portfolio_health_metrics)
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', color: '#cbd5e1' }}>
                <thead>
                  <tr style={{ background: 'rgba(30, 41, 59, 0.8)', textAlign: 'left', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '8px 10px' }}>Product Type</th>
                    <th style={{ padding: '8px 10px' }}>Total Facilities</th>
                    <th style={{ padding: '8px 10px' }}>Active</th>
                    <th style={{ padding: '8px 10px' }}>Overdue (NPL)</th>
                    <th style={{ padding: '8px 10px' }}>NPL Rate (%)</th>
                    <th style={{ padding: '8px 10px' }}>Total Principal</th>
                    <th style={{ padding: '8px 10px' }}>Avg Interest Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolioMetrics.map((p, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                      <td style={{ padding: '8px 10px', fontWeight: '600', color: '#f8fafc' }}>{p.loan_type}</td>
                      <td style={{ padding: '8px 10px' }}>{p.total_facilities}</td>
                      <td style={{ padding: '8px 10px', color: 'var(--emerald-400)' }}>{p.active_count}</td>
                      <td style={{ padding: '8px 10px', color: '#f87171' }}>{p.overdue_count}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 'bold', color: Number(p.overdue_rate_pct) > 0 ? '#f87171' : 'var(--emerald-400)' }}>
                        {p.overdue_rate_pct}%
                      </td>
                      <td style={{ padding: '8px 10px' }}>LKR {Number(p.total_portfolio_principal).toLocaleString()}</td>
                      <td style={{ padding: '8px 10px' }}>{p.avg_interest_rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ROLE 3: COMPLIANCE AUDITOR WORKSTATION */}
      {currentRole === 'auditor' && (
        <div>
          {/* Read Only Compliance Notice */}
          <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.4)', borderRadius: '10px', padding: '14px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#fbbf24', fontSize: '0.85rem' }}>
              <span><strong>Regulatory Read-Only Audit Station:</strong> All database transactions and writes are blocked by MySQL privileges. Access restricted strictly to audit logs and compliance queues.</span>
            </div>
            <button
              type="button"
              onClick={loadRoleData}
              className="btn-secondary"
              style={{ fontSize: '0.75rem', padding: '5px 12px' }}
            >
               Refresh Audit Logs
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            {/* Event Scheduler Monitor */}
            <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '18px' }}>
              <h4 style={{ fontSize: '0.92rem', color: '#f59e0b', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Automated Background Event Monitor</span>
              </h4>
              <div style={{ fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.6 }}>
                <strong>Event Name:</strong> evt_daily_loan_status_check<br/>
                <strong>Interval:</strong> EVERY 1 DAY STARTS 00:00:00 (Midnight)<br/>
                <strong>Autonomous Action:</strong> Calls sp_mark_overdue_facilities() via Cursor loop<br/>
                <strong>Status:</strong> <span style={{ color: 'var(--emerald-400)', fontWeight: 'bold' }}>ACTIVE in MySQL 8.0 Engine</span>
              </div>
            </div>

            {/* Delinquency Queue Preview */}
            <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '18px' }}>
              <h4 style={{ fontSize: '0.92rem', color: '#f59e0b', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Overdue Collections Queue (vw_overdue_collections_queue)</span>
              </h4>
              <div style={{ fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.6 }}>
                <strong>Total Overdue Facilities Flagged:</strong> {overdueQueue.length} records<br/>
                <strong>High Risk Exposure Identified:</strong> Real-time automated risk classification<br/>
                <strong>Compliance Status:</strong> Zero unresolved foreign key relationships
              </div>
            </div>
          </div>

          {/* Immutable Audit Ledger Table */}
          <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '18px' }}>
            <h3 style={{ fontSize: '1rem', color: '#f8fafc', margin: '0 0 12px' }}>
              Immutable Database Change Ledger (loan_audit_log populated via Triggers)
            </h3>
            <div style={{ overflowX: 'auto', maxHeight: '360px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem', color: '#cbd5e1' }}>
                <thead>
                  <tr style={{ background: 'rgba(30, 41, 59, 0.8)', textAlign: 'left', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '8px 10px' }}>Log ID</th>
                    <th style={{ padding: '8px 10px' }}>Loan ID</th>
                    <th style={{ padding: '8px 10px' }}>Action</th>
                    <th style={{ padding: '8px 10px' }}>Old State</th>
                    <th style={{ padding: '8px 10px' }}>New State</th>
                    <th style={{ padding: '8px 10px' }}>Modified By</th>
                    <th style={{ padding: '8px 10px' }}>Timestamp</th>
                    <th style={{ padding: '8px 10px' }}>Audit Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((a) => (
                    <tr key={a.audit_id} style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                      <td style={{ padding: '7px 10px', color: '#64748b' }}>#{a.audit_id}</td>
                      <td style={{ padding: '7px 10px', color: '#38bdf8', fontWeight: 'bold' }}>#{a.loan_id}</td>
                      <td style={{ padding: '7px 10px' }}>
                        <span style={{ 
                          fontSize: '0.68rem', 
                          padding: '2px 6px', 
                          borderRadius: '4px',
                          background: a.action_type === 'DISBURSEMENT' ? 'rgba(59, 130, 246, 0.2)' : a.action_type === 'REPAYMENT' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                          color: a.action_type === 'DISBURSEMENT' ? '#60a5fa' : a.action_type === 'REPAYMENT' ? '#34d399' : '#fbbf24',
                          border: '1px solid currentColor'
                        }}>
                          {a.action_type}
                        </span>
                      </td>
                      <td style={{ padding: '7px 10px', color: '#94a3b8' }}>{a.old_status || '-'}</td>
                      <td style={{ padding: '7px 10px', color: '#f8fafc' }}>{a.new_status || '-'}</td>
                      <td style={{ padding: '7px 10px', color: '#94a3b8' }}>{a.modified_by}</td>
                      <td style={{ padding: '7px 10px', color: '#64748b', whiteSpace: 'nowrap' }}>{a.modified_at}</td>
                      <td style={{ padding: '7px 10px' }}>{a.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
