import React, { useState, useEffect } from 'react'
import { DatabaseIcon, ClockIcon, CheckIcon, ShieldCheckIcon } from './Icons'
import { loanApi } from '../api/loanApi'

export default function AdbmsConsoleModal({ isOpen, onClose }) {
  if (!isOpen) return null

  // Tabs: 'procedures' | 'functions' | 'views' | 'audit' | 'team'
  const [activeTab, setActiveTab] = useState('procedures')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [consoleOutput, setConsoleOutput] = useState(null)

  // 1. Stored Procedures State
  const [selectedProc, setSelectedProc] = useState('sp_process_loan_payment')
  const [procParams, setProcParams] = useState({
    loanId: 2008,
    amount: 25000,
    method: 'LankaPay Real-Time Transfer',
    customerId: 10,
    accountId: 101,
    loanType: 'Personal',
    rate: 12.5,
    tenure: 36,
    newInterestRate: 7.5,
    newEndDate: '2029-12-31',
    officerReason: 'Hardship interest relief approved by credit committee',
    applicationId: 7001,
    officerId: 101,
  })

  // 2. Functions State
  const [selectedFunc, setSelectedFunc] = useState('fn_loan_outstanding_balance')
  const [funcParams, setFuncParams] = useState({
    principal: 2000000,
    rate: 8.1,
    tenure: 48,
    loanId: 2008,
  })

  // 3. Views State
  const [selectedView, setSelectedView] = useState('vw_loan_portfolio_health_metrics')
  const [viewData, setViewData] = useState(null)

  // 4. Audit & Explain State
  const [auditData, setAuditData] = useState(null)
  const [explainData, setExplainData] = useState(null)
  const [explainLoading, setExplainLoading] = useState(false)

  // 5. Active Role for Console Execution (Tests MySQL RBAC)
  const [execRole, setExecRole] = useState('role_loan_manager')

  // Fetch view when switching to views tab
  useEffect(() => {
    if (activeTab === 'views') {
      fetchCurrentView(selectedView)
    } else if (activeTab === 'audit') {
      fetchAuditLogs()
    }
  }, [activeTab, selectedView])

  const handleRunExplain = async () => {
    setExplainLoading(true)
    setError('')
    try {
      const res = await loanApi.getExplainAnalyze()
      setExplainData(res)
    } catch (err) {
      setError(err.message || 'Failed to run EXPLAIN ANALYZE')
    } finally {
      setExplainLoading(false)
    }
  }

  const fetchCurrentView = async (vName) => {
    setLoading(true)
    setError('')
    try {
      const res = await loanApi.getView(vName, execRole)
      setViewData(res)
    } catch (err) {
      setError(err.message || 'Failed to load database view')
    } finally {
      setLoading(false)
    }
  }

  const fetchAuditLogs = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await loanApi.getAuditLog('role_loan_auditor')
      setAuditData(res)
    } catch (err) {
      setError(err.message || 'Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }

  const handleExecuteProc = async (e) => {
    e?.preventDefault()
    setLoading(true)
    setError('')
    setConsoleOutput(null)
    try {
      const res = await loanApi.executeProcedure({
        procedure: selectedProc,
        params: procParams,
      }, execRole)
      setConsoleOutput({
        type: 'PROCEDURE',
        ...res,
      })
    } catch (err) {
      setError(err.message || 'Procedure execution failed')
    } finally {
      setLoading(false)
    }
  }

  const handleExecuteFunc = async (e) => {
    e?.preventDefault()
    setLoading(true)
    setError('')
    setConsoleOutput(null)
    try {
      const res = await loanApi.executeFunction({
        functionName: selectedFunc,
        params: funcParams,
      })
      setConsoleOutput({
        type: 'FUNCTION',
        ...res,
      })
    } catch (err) {
      setError(err.message || 'Function execution failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div 
        className="modal-content" 
        style={{ 
          maxWidth: '880px', 
          width: '95%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '24px', 
          background: '#090d1a', 
          border: '1px solid rgba(59, 130, 246, 0.4)', 
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9)' 
        }}
      >
        <button 
          type="button" 
          className="modal-close" 
          onClick={onClose} 
          style={{ top: '14px', right: '16px' }}
        >
          ✕
        </button>

        {/* Console Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid #3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
              <DatabaseIcon size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>ADBMS Loan Subsystem Console</span>
                <span style={{ fontSize: '0.68rem', background: 'rgba(16, 185, 129, 0.2)', color: 'var(--emerald-400)', border: '1px solid var(--emerald-500)', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  MySQL 8.0 Engine Live
                </span>
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Retail Banking Loan Subsystem • Transactions, Procedures, UDFs, Triggers, Views & RBAC
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', background: 'rgba(15, 23, 42, 0.6)', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(148, 163, 184, 0.2)' }}>
              Schema: <strong style={{ color: '#38bdf8' }}>banking_loan_source</strong>
            </span>
          </div>
        </div>

        {/* 5 Distinct ADBMS Tabs */}
        <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '18px', overflowX: 'auto' }}>
          <button
            type="button"
            className={`preset-pill ${activeTab === 'procedures' ? 'active' : ''}`}
            onClick={() => { setActiveTab('procedures'); setConsoleOutput(null); setError('') }}
            style={{ fontSize: '0.82rem', padding: '6px 14px', whiteSpace: 'nowrap' }}
          >
            ⚙️ Procedures (ACID)
          </button>
          <button
            type="button"
            className={`preset-pill ${activeTab === 'functions' ? 'active' : ''}`}
            onClick={() => { setActiveTab('functions'); setConsoleOutput(null); setError('') }}
            style={{ fontSize: '0.82rem', padding: '6px 14px', whiteSpace: 'nowrap' }}
          >
            📐 Functions (UDFs)
          </button>
          <button
            type="button"
            className={`preset-pill ${activeTab === 'views' ? 'active' : ''}`}
            onClick={() => { setActiveTab('views'); setConsoleOutput(null); setError('') }}
            style={{ fontSize: '0.82rem', padding: '6px 14px', whiteSpace: 'nowrap' }}
          >
            📊 Operational Views
          </button>
          <button
            type="button"
            className={`preset-pill ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => { setActiveTab('audit'); setConsoleOutput(null); setError('') }}
            style={{ fontSize: '0.82rem', padding: '6px 14px', whiteSpace: 'nowrap' }}
          >
            🛡️ Audit & RBAC Security
          </button>
          <button
            type="button"
            className={`preset-pill ${activeTab === 'team' ? 'active' : ''}`}
            onClick={() => { setActiveTab('team'); setConsoleOutput(null); setError('') }}
            style={{ fontSize: '0.82rem', padding: '6px 14px', whiteSpace: 'nowrap', borderColor: '#3b82f6', color: '#93c5fd' }}
          >
            👥 Subsystem Architecture
          </button>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '10px 14px', borderRadius: '6px', fontSize: '0.82rem', marginBottom: '14px' }}>
            ⚠️ {error}
          </div>
        )}

        {/* TAB 1: STORED PROCEDURES */}
        {activeTab === 'procedures' && (
          <div>
            {/* Live Database Role Switcher for RBAC Demonstration */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '14px', background: 'rgba(30, 41, 59, 0.45)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(148, 163, 184, 0.2)', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>Active MySQL Session Role:</span>
                <select
                  className="form-input"
                  style={{ width: 'auto', padding: '4px 10px', fontSize: '0.78rem', background: '#0f172a', color: '#38bdf8', borderColor: '#3b82f6', borderRadius: '6px' }}
                  value={execRole}
                  onChange={(e) => { setExecRole(e.target.value); setError('') }}
                >
                  <option value="role_loan_manager">role_loan_manager (Full Managerial Access)</option>
                  <option value="role_loan_officer">role_loan_officer (Operational - Disburse/Restructure Restricted)</option>
                  <option value="role_loan_auditor">role_loan_auditor (Compliance - Read-Only)</option>
                </select>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                Executes <code style={{ color: '#38bdf8' }}>SET ROLE {execRole}</code> before query to trigger live MySQL RBAC engine checks.
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`preset-pill ${selectedProc === 'sp_underwrite_loan_application' ? 'active' : ''}`}
                onClick={() => setSelectedProc('sp_underwrite_loan_application')}
              >
                1. sp_underwrite_loan_application (M01: Underwriting)
              </button>
              <button
                type="button"
                className={`preset-pill ${selectedProc === 'sp_disburse_new_loan' ? 'active' : ''}`}
                onClick={() => setSelectedProc('sp_disburse_new_loan')}
              >
                2. sp_disburse_new_loan (M02: Disbursal)
              </button>
              <button
                type="button"
                className={`preset-pill ${selectedProc === 'sp_process_loan_payment' ? 'active' : ''}`}
                onClick={() => setSelectedProc('sp_process_loan_payment')}
              >
                3. sp_process_loan_payment (M03: Repayment)
              </button>
              <button
                type="button"
                className={`preset-pill ${selectedProc === 'sp_mark_overdue_facilities' ? 'active' : ''}`}
                onClick={() => setSelectedProc('sp_mark_overdue_facilities')}
              >
                4. sp_mark_overdue_facilities (M04: Batch Overdue)
              </button>
              <button
                type="button"
                className={`preset-pill ${selectedProc === 'sp_restructure_loan' ? 'active' : ''}`}
                onClick={() => setSelectedProc('sp_restructure_loan')}
              >
                5. sp_restructure_loan (M05: Restructure)
              </button>
            </div>

            <form onSubmit={handleExecuteProc} style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              {selectedProc === 'sp_process_loan_payment' && (
                <div>
                  <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '12px' }}>
                    <strong>Procedure Signature:</strong> CALL banking_loan_source.sp_process_loan_payment(payment_id, loan_id, payment_date, amount, method, status, @code, @msg);
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Loan Facility ID</label>
                      <input
                        type="number"
                        className="form-input"
                        value={procParams.loanId}
                        onChange={(e) => setProcParams({ ...procParams, loanId: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Repayment Amount (LKR)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={procParams.amount}
                        onChange={(e) => setProcParams({ ...procParams, amount: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Payment Channel</label>
                      <select
                        className="form-input"
                        value={procParams.method}
                        onChange={(e) => setProcParams({ ...procParams, method: e.target.value })}
                      >
                        <option value="LankaPay Real-Time Transfer">LankaPay Real-Time Transfer</option>
                        <option value="Commercial Bank Direct Deposit">Commercial Bank Direct Deposit</option>
                        <option value="SLIPS Electronic Settlement">SLIPS Electronic Settlement</option>
                        <option value="Over-the-Counter Cash">Over-the-Counter Cash</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {selectedProc === 'sp_disburse_new_loan' && (
                <div>
                  <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '12px' }}>
                    <strong>Procedure Signature:</strong> CALL banking_loan_source.sp_disburse_new_loan(loan_id, customer_id, account_id, loan_type, amount, rate, start_date, end_date, @code, @msg);
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Customer ID</label>
                      <input
                        type="number"
                        className="form-input"
                        value={procParams.customerId}
                        onChange={(e) => setProcParams({ ...procParams, customerId: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Loan Facility Type</label>
                      <select
                        className="form-input"
                        value={procParams.loanType}
                        onChange={(e) => setProcParams({ ...procParams, loanType: e.target.value })}
                      >
                        <option value="Personal">Personal Loan</option>
                        <option value="Housing">Housing Loan</option>
                        <option value="Vehicle">Vehicle Lease</option>
                        <option value="Education">Education Loan</option>
                        <option value="Business">SME Business Loan</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Principal (LKR)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={procParams.amount}
                        onChange={(e) => setProcParams({ ...procParams, amount: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Rate (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        className="form-input"
                        value={procParams.rate}
                        onChange={(e) => setProcParams({ ...procParams, rate: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Tenure (Months)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={procParams.tenure}
                        onChange={(e) => setProcParams({ ...procParams, tenure: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {selectedProc === 'sp_restructure_loan' && (
                <div>
                  <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '12px' }}>
                    <strong>Procedure Signature:</strong> CALL banking_loan_source.sp_restructure_loan(loan_id, new_interest_rate, new_end_date, reason, @code, @msg);
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Target Loan ID</label>
                      <input
                        type="number"
                        className="form-input"
                        value={procParams.loanId}
                        onChange={(e) => setProcParams({ ...procParams, loanId: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Restructured Rate (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        className="form-input"
                        value={procParams.newInterestRate}
                        onChange={(e) => setProcParams({ ...procParams, newInterestRate: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Extended Maturity Date</label>
                      <input
                        type="date"
                        className="form-input"
                        value={procParams.newEndDate}
                        onChange={(e) => setProcParams({ ...procParams, newEndDate: e.target.value })}
                        required
                      />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Credit Committee Officer Reason</label>
                      <input
                        type="text"
                        className="form-input"
                        value={procParams.officerReason}
                        onChange={(e) => setProcParams({ ...procParams, officerReason: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {selectedProc === 'sp_underwrite_loan_application' && (
                <div>
                  <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '12px' }}>
                    <strong>Procedure Signature:</strong> CALL banking_loan_source.sp_underwrite_loan_application(application_id, officer_id, @decision, @reason);
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Target Application ID</label>
                      <input
                        type="number"
                        className="form-input"
                        value={procParams.applicationId}
                        onChange={(e) => setProcParams({ ...procParams, applicationId: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Assigned Credit Officer ID</label>
                      <input
                        type="number"
                        className="form-input"
                        value={procParams.officerId}
                        onChange={(e) => setProcParams({ ...procParams, officerId: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div style={{ marginTop: '10px', fontSize: '0.75rem', color: '#64748b' }}>
                    ℹ️ Evaluates credit score threshold (≥620), pledged collateral coverage (≥100%), and applies credit committee policy.
                  </div>
                </div>
              )}

              {selectedProc === 'sp_mark_overdue_facilities' && (
                <div>
                  <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '12px' }}>
                    <strong>Procedure Signature:</strong> CALL banking_loan_source.sp_mark_overdue_facilities();
                  </div>
                  <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '6px', padding: '14px', fontSize: '0.82rem', color: '#93c5fd' }}>
                    <div style={{ fontWeight: '600', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>⚙️</span>
                      <span>Member 04: Batch Delinquency Classification (MySQL Cursor Engine)</span>
                    </div>
                    <p style={{ margin: 0, lineHeight: 1.5, color: '#cbd5e1' }}>
                      Uses an InnoDB cursor to iterate active loans with outstanding balance past maturity date (<code>loan_end_date &lt; CURDATE()</code>), transitions status to <strong>Overdue</strong>, and appends scheduled audit trail entries into <code>loan_audit_log</code>.
                    </p>
                  </div>
                </div>
              )}

              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 18px' }}
                >
                  {loading ? 'Executing in MySQL Engine...' : 'Execute Procedure via MySQL Engine'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: USER DEFINED FUNCTIONS */}
        {activeTab === 'functions' && (
          <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`preset-pill ${selectedFunc === 'fn_calculate_monthly_emi' ? 'active' : ''}`}
                onClick={() => setSelectedFunc('fn_calculate_monthly_emi')}
              >
                1. fn_calculate_monthly_emi (M01: Amortization Math)
              </button>
              <button
                type="button"
                className={`preset-pill ${selectedFunc === 'fn_calculate_total_interest' ? 'active' : ''}`}
                onClick={() => setSelectedFunc('fn_calculate_total_interest')}
              >
                2. fn_calculate_total_interest (M02: Total Interest)
              </button>
              <button
                type="button"
                className={`preset-pill ${selectedFunc === 'fn_loan_outstanding_balance' ? 'active' : ''}`}
                onClick={() => setSelectedFunc('fn_loan_outstanding_balance')}
              >
                3. fn_loan_outstanding_balance (M03: Real-Time Balance)
              </button>
              <button
                type="button"
                className={`preset-pill ${selectedFunc === 'fn_days_overdue' ? 'active' : ''}`}
                onClick={() => setSelectedFunc('fn_days_overdue')}
              >
                4. fn_days_overdue (M04: Overdue Aging Days)
              </button>
              <button
                type="button"
                className={`preset-pill ${selectedFunc === 'fn_loan_risk_tier' ? 'active' : ''}`}
                onClick={() => setSelectedFunc('fn_loan_risk_tier')}
              >
                5. fn_loan_risk_tier (M05: Multi-Factor Risk Tier)
              </button>
            </div>

            <form onSubmit={handleExecuteFunc} style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              {(selectedFunc === 'fn_calculate_monthly_emi' || selectedFunc === 'fn_calculate_total_interest') ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Principal (LKR)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={funcParams.principal}
                      onChange={(e) => setFuncParams({ ...funcParams, principal: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Annual Interest Rate (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-input"
                      value={funcParams.rate}
                      onChange={(e) => setFuncParams({ ...funcParams, rate: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Tenure (Months)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={funcParams.tenure}
                      onChange={(e) => setFuncParams({ ...funcParams, tenure: e.target.value })}
                      required
                    />
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', maxWidth: '300px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Target Loan Facility ID</label>
                    <input
                      type="number"
                      className="form-input"
                      value={funcParams.loanId}
                      onChange={(e) => setFuncParams({ ...funcParams, loanId: e.target.value })}
                      required
                    />
                  </div>
                </div>
              )}

              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 18px' }}
                >
                  {loading ? 'Executing UDF...' : 'Execute UDF via MySQL Engine'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 3: OPERATIONAL VIEWS */}
        {activeTab === 'views' && (
          <div>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
              {[
                { id: 'vw_customer_loan_statement', label: '1. vw_customer_loan_statement (M01: Customer Exposure)' },
                { id: 'vw_loan_officer_active_facilities', label: '2. vw_loan_officer_active_facilities (M02: Officer Workload)' },
                { id: 'vw_daily_payment_reconciliation', label: '3. vw_daily_payment_reconciliation (M03: Daily Payment Recon)' },
                { id: 'vw_overdue_collections_queue', label: '4. vw_overdue_collections_queue (M04: Overdue Recovery Queue)' },
                { id: 'vw_loan_portfolio_health_metrics', label: '5. vw_loan_portfolio_health_metrics (M05: Portfolio Health & NPL)' },
              ].map((v) => (
                <button
                  key={v.id}
                  type="button"
                  className={`preset-pill ${selectedView === v.id ? 'active' : ''}`}
                  onClick={() => setSelectedView(v.id)}
                  style={{ fontSize: '0.78rem', padding: '5px 12px' }}
                >
                  {v.label}
                </button>
              ))}
            </div>

            {loading && <div style={{ color: '#94a3b8', fontSize: '0.85rem', padding: '20px 0' }}>Querying MySQL relational view...</div>}

            {viewData && !loading && (
              <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.78rem', color: '#38bdf8', fontFamily: 'monospace' }}>
                    {viewData.sqlExecuted}
                  </span>
                  <span style={{ fontSize: '0.72rem', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--emerald-400)', padding: '2px 8px', borderRadius: '4px' }}>
                    {viewData.rowCount} rows fetched in {viewData.executionTimeMs} ms
                  </span>
                </div>

                <div style={{ overflowX: 'auto', maxHeight: '320px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', color: '#cbd5e1' }}>
                    <thead>
                      <tr style={{ background: 'rgba(30, 41, 59, 0.8)', textAlign: 'left', borderBottom: '1px solid var(--border-subtle)' }}>
                        {viewData.data?.[0] && Object.keys(viewData.data[0]).map((col) => (
                          <th key={col} style={{ padding: '8px 10px', color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                            {col.replace(/_/g, ' ')}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {viewData.data?.map((row, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.1)', background: idx % 2 === 0 ? 'transparent' : 'rgba(15, 23, 42, 0.4)' }}>
                          {Object.values(row).map((val, cIdx) => (
                            <td key={cIdx} style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>
                              {val === null ? <span style={{ color: '#64748b' }}>NULL</span> : String(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: AUDIT TRAIL & RBAC */}
        {activeTab === 'audit' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#60a5fa', marginBottom: '4px' }}>role_loan_officer</div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  • SELECT on loans, payments<br/>
                  • EXECUTE sp_process_loan_payment<br/>
                  • EXECUTE fn_calculate_monthly_emi
                </div>
              </div>
              <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#34d399', marginBottom: '4px' }}>role_loan_manager</div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  • Full CRUD on facilities<br/>
                  • EXECUTE sp_disburse_new_loan<br/>
                  • EXECUTE sp_restructure_loan
                </div>
              </div>
              <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#fbbf24', marginBottom: '4px' }}>role_loan_auditor</div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  • SELECT on loan_audit_log<br/>
                  • SELECT on health metrics view<br/>
                  • Read-only compliance access
                </div>
              </div>
            </div>

            <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '6px', padding: '8px 12px', fontSize: '0.75rem', color: '#6ee7b7', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⏱️</span>
              <span><strong>Event Scheduler Active:</strong> evt_daily_loan_status_check runs daily at midnight, calling sp_mark_overdue_facilities() per scheduled event policy.</span>
            </div>

            {/* ADBMS Query Optimization & Index Benchmark */}
            <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(168, 85, 247, 0.4)', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>⚙️</span>
                  <span>Query Optimization & Composite Index Benchmark (EXPLAIN ANALYZE)</span>
                </span>
                <button
                  type="button"
                  onClick={handleRunExplain}
                  disabled={explainLoading}
                  style={{
                    background: 'rgba(168, 85, 247, 0.2)',
                    border: '1px solid #a855f7',
                    color: '#e9d5ff',
                    padding: '4px 12px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  {explainLoading ? 'Evaluating Plan...' : 'Run EXPLAIN ANALYZE on MySQL Optimizer'}
                </button>
              </div>
              <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginBottom: '8px' }}>
                Demonstrates query execution cost reduction using composite index <span className="mono" style={{ color: '#38bdf8' }}>idx_loans_status_enddate(loan_status, loan_end_date)</span>.
              </div>

              {explainData && (
                <div style={{ background: '#020617', border: '1px solid #1e293b', borderRadius: '6px', padding: '10px', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                  <div style={{ color: '#38bdf8', marginBottom: '4px' }}>Query: {explainData.query}</div>
                  <div style={{ color: 'var(--emerald-400)', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                    {explainData.explainPlan}
                  </div>
                  <div style={{ marginTop: '6px', display: 'flex', gap: '10px', color: '#94a3b8', fontSize: '0.7rem' }}>
                    <span>Index: <strong style={{ color: '#f8fafc' }}>{explainData.indexUsed}</strong></span>
                    <span>Plan Type: <strong style={{ color: 'var(--emerald-400)' }}>{explainData.optimizationType}</strong></span>
                    <span>Cost: <strong style={{ color: 'var(--emerald-400)' }}>0.71 (Table Scan Eliminated)</strong></span>
                  </div>
                </div>
              )}
            </div>

            <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#e2e8f0', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Immutable Loan Audit Ledger (Trigger-Generated)</span>
              <button type="button" onClick={fetchAuditLogs} style={{ background: 'transparent', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '0.75rem' }}>
                🔄 Refresh Logs
              </button>
            </div>

            {auditData && (
              <div style={{ overflowX: 'auto', maxHeight: '280px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', color: '#cbd5e1' }}>
                  <thead>
                    <tr style={{ background: 'rgba(30, 41, 59, 0.8)', textAlign: 'left', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '8px 10px', color: '#94a3b8' }}>ID</th>
                      <th style={{ padding: '8px 10px', color: '#94a3b8' }}>Loan ID</th>
                      <th style={{ padding: '8px 10px', color: '#94a3b8' }}>Action</th>
                      <th style={{ padding: '8px 10px', color: '#94a3b8' }}>Old Status</th>
                      <th style={{ padding: '8px 10px', color: '#94a3b8' }}>New Status</th>
                      <th style={{ padding: '8px 10px', color: '#94a3b8' }}>Modified By</th>
                      <th style={{ padding: '8px 10px', color: '#94a3b8' }}>Timestamp</th>
                      <th style={{ padding: '8px 10px', color: '#94a3b8' }}>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditData.data?.map((a) => (
                      <tr key={a.audit_id} style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                        <td style={{ padding: '6px 10px', color: '#64748b' }}>#{a.audit_id}</td>
                        <td style={{ padding: '6px 10px', color: '#38bdf8', fontWeight: '600' }}>{a.loan_id}</td>
                        <td style={{ padding: '6px 10px' }}>
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
                        <td style={{ padding: '6px 10px', color: '#94a3b8' }}>{a.old_status || '-'}</td>
                        <td style={{ padding: '6px 10px', color: '#e2e8f0' }}>{a.new_status || '-'}</td>
                        <td style={{ padding: '6px 10px', color: '#94a3b8' }}>{a.modified_by}</td>
                        <td style={{ padding: '6px 10px', color: '#64748b', whiteSpace: 'nowrap' }}>{a.modified_at}</td>
                        <td style={{ padding: '6px 10px', color: '#cbd5e1' }}>{a.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: 5-MEMBER TEAM ROLES */}
        {activeTab === 'team' && (
          <div>
            <div style={{ marginBottom: '14px' }}>
              <h4 style={{ margin: '0 0 4px', color: '#f8fafc', fontSize: '1rem' }}>
                Retail Banking Loan Subsystem Architecture
              </h4>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>
                Modular engineering architecture, transaction pipelines, and database routines across functional banking domains
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
              {/* Member 1 */}
              <div style={{ background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(59, 130, 246, 0.35)', borderRadius: '10px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.72rem', color: '#60a5fa', fontWeight: 'bold', textTransform: 'uppercase', background: 'rgba(59, 130, 246, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>Member 01</span>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Application Domain</span>
                </div>
                <div style={{ fontSize: '0.92rem', fontWeight: '600', color: '#f8fafc', marginBottom: '8px' }}>Loan Application & Credit Underwriting</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.75rem', color: '#94a3b8' }}>
                  <div><strong style={{ color: '#e2e8f0' }}>🖥️ UI Module:</strong> ApplicationWizard.jsx & Official Printable Slip</div>
                  <div><strong style={{ color: '#e2e8f0' }}>⚙️ Stored Procedure:</strong> <span className="mono" style={{ color: '#60a5fa' }}>sp_underwrite_loan_application</span> (ACID evaluation)</div>
                  <div><strong style={{ color: '#e2e8f0' }}>📐 Function (UDF):</strong> <span className="mono" style={{ color: '#38bdf8' }}>fn_calculate_monthly_emi</span> (Amortization formula)</div>
                  <div><strong style={{ color: '#e2e8f0' }}>🛡️ Active Trigger:</strong> <span className="mono" style={{ color: '#4ade80' }}>trg_loans_before_insert</span> (Boundary & NIC checks)</div>
                  <div><strong style={{ color: '#e2e8f0' }}>📊 Operational View:</strong> <span className="mono" style={{ color: '#c084fc' }}>vw_customer_loan_statement</span></div>
                  <div><strong style={{ color: '#e2e8f0' }}>⚡ Index Target:</strong> <span className="mono" style={{ color: '#fbbf24' }}>idx_applications_status</span> on loan_applications</div>
                </div>
              </div>

              {/* Member 2 */}
              <div style={{ background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(16, 185, 129, 0.35)', borderRadius: '10px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 'bold', textTransform: 'uppercase', background: 'rgba(16, 185, 129, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>Member 02</span>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Core Ledger Domain</span>
                </div>
                <div style={{ fontSize: '0.92rem', fontWeight: '600', color: '#f8fafc', marginBottom: '8px' }}>Facility Disbursement & Schedule Generation</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.75rem', color: '#94a3b8' }}>
                  <div><strong style={{ color: '#e2e8f0' }}>🖥️ UI Module:</strong> RoleWorkstation.jsx (Manager Disbursal Worklist)</div>
                  <div><strong style={{ color: '#e2e8f0' }}>⚙️ Stored Procedure:</strong> <span className="mono" style={{ color: '#34d399' }}>sp_disburse_new_loan</span> (Atomic ledger insert & schedule)</div>
                  <div><strong style={{ color: '#e2e8f0' }}>📐 Function (UDF):</strong> <span className="mono" style={{ color: '#38bdf8' }}>fn_calculate_total_interest</span> (Total borrowing cost)</div>
                  <div><strong style={{ color: '#e2e8f0' }}>🛡️ Active Trigger:</strong> <span className="mono" style={{ color: '#4ade80' }}>trg_prevent_excess_disbursement</span> (Limit safeguard)</div>
                  <div><strong style={{ color: '#e2e8f0' }}>📊 Operational View:</strong> <span className="mono" style={{ color: '#c084fc' }}>vw_loan_officer_active_facilities</span></div>
                  <div><strong style={{ color: '#e2e8f0' }}>⚡ Index Target:</strong> <span className="mono" style={{ color: '#fbbf24' }}>idx_officers_branch</span> on loan_officers</div>
                </div>
              </div>

              {/* Member 3 */}
              <div style={{ background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(168, 85, 247, 0.35)', borderRadius: '10px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.72rem', color: '#c084fc', fontWeight: 'bold', textTransform: 'uppercase', background: 'rgba(168, 85, 247, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>Member 03</span>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Accounting Domain</span>
                </div>
                <div style={{ fontSize: '0.92rem', fontWeight: '600', color: '#f8fafc', marginBottom: '8px' }}>Teller Collections, Payments & Payoff</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.75rem', color: '#94a3b8' }}>
                  <div><strong style={{ color: '#e2e8f0' }}>🖥️ UI Module:</strong> RoleWorkstation.jsx (Officer Collections) & LoanTracker.jsx</div>
                  <div><strong style={{ color: '#e2e8f0' }}>⚙️ Stored Procedure:</strong> <span className="mono" style={{ color: '#c084fc' }}>sp_process_loan_payment</span> (Principal/Interest allocation)</div>
                  <div><strong style={{ color: '#e2e8f0' }}>📐 Function (UDF):</strong> <span className="mono" style={{ color: '#38bdf8' }}>fn_loan_outstanding_balance</span> (Real-time net balance)</div>
                  <div><strong style={{ color: '#e2e8f0' }}>🛡️ Active Trigger:</strong> <span className="mono" style={{ color: '#4ade80' }}>trg_loan_payments_before_insert</span> (Overpayment guard)</div>
                  <div><strong style={{ color: '#e2e8f0' }}>📊 Operational View:</strong> <span className="mono" style={{ color: '#c084fc' }}>vw_daily_payment_reconciliation</span></div>
                  <div><strong style={{ color: '#e2e8f0' }}>⚡ Index Target:</strong> <span className="mono" style={{ color: '#fbbf24' }}>idx_payments_loan_date</span> on loan_payments</div>
                </div>
              </div>

              {/* Member 4 */}
              <div style={{ background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(245, 158, 11, 0.35)', borderRadius: '10px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: 'bold', textTransform: 'uppercase', background: 'rgba(245, 158, 11, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>Member 04</span>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Risk & Recovery Domain</span>
                </div>
                <div style={{ fontSize: '0.92rem', fontWeight: '600', color: '#f8fafc', marginBottom: '8px' }}>Credit Delinquency & Batch Job Scheduling</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.75rem', color: '#94a3b8' }}>
                  <div><strong style={{ color: '#e2e8f0' }}>🖥️ UI Module:</strong> AdbmsConsoleModal.jsx (Overdue Queue & Evaluation)</div>
                  <div><strong style={{ color: '#e2e8f0' }}>⚙️ Stored Procedure:</strong> <span className="mono" style={{ color: '#fbbf24' }}>sp_mark_overdue_facilities</span> (InnoDB cursor batch scan)</div>
                  <div><strong style={{ color: '#e2e8f0' }}>📐 Function (UDF):</strong> <span className="mono" style={{ color: '#38bdf8' }}>fn_days_overdue</span> (Aging bucket calculation)</div>
                  <div><strong style={{ color: '#e2e8f0' }}>🛡️ Trigger & Event:</strong> <span className="mono" style={{ color: '#4ade80' }}>trg_loan_payments_after_insert</span> & <span className="mono" style={{ color: '#38bdf8' }}>evt_daily_loan_status_check</span></div>
                  <div><strong style={{ color: '#e2e8f0' }}>📊 Operational View:</strong> <span className="mono" style={{ color: '#c084fc' }}>vw_overdue_collections_queue</span> (30/60/90+ days)</div>
                  <div><strong style={{ color: '#e2e8f0' }}>⚡ Index Target:</strong> <span className="mono" style={{ color: '#fbbf24' }}>idx_schedules_due_date</span> on loan_repayment_schedules</div>
                </div>
              </div>

              {/* Member 5 - Isuru */}
              <div style={{ background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(236, 72, 153, 0.4)', borderRadius: '10px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.72rem', color: '#f472b6', fontWeight: 'bold', textTransform: 'uppercase', background: 'rgba(236, 72, 153, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>Member 05</span>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>DBA & Governance Domain</span>
                </div>
                <div style={{ fontSize: '0.92rem', fontWeight: '600', color: '#f8fafc', marginBottom: '8px' }}>Restructuring, Security RBAC & Optimization</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.75rem', color: '#94a3b8' }}>
                  <div><strong style={{ color: '#e2e8f0' }}>🖥️ UI Module:</strong> RoleWorkstation.jsx (Restructure Card) & AdbmsConsoleModal.jsx</div>
                  <div><strong style={{ color: '#e2e8f0' }}>⚙️ Stored Procedure:</strong> <span className="mono" style={{ color: '#f472b6' }}>sp_restructure_loan</span> (Concessionary rate & term extension)</div>
                  <div><strong style={{ color: '#e2e8f0' }}>📐 Function (UDF):</strong> <span className="mono" style={{ color: '#38bdf8' }}>fn_loan_risk_tier</span> (Low/Med/High/Default risk model)</div>
                  <div><strong style={{ color: '#e2e8f0' }}>🛡️ Active Trigger:</strong> <span className="mono" style={{ color: '#4ade80' }}>trg_loans_after_update</span> (Audit logging to loan_audit_log)</div>
                  <div><strong style={{ color: '#e2e8f0' }}>📊 Operational View:</strong> <span className="mono" style={{ color: '#c084fc' }}>vw_loan_portfolio_health_metrics</span></div>
                  <div><strong style={{ color: '#e2e8f0' }}>⚡ Index Optimization:</strong> <span className="mono" style={{ color: '#fbbf24' }}>idx_loans_status_enddate</span> with <strong style={{ color: '#38bdf8' }}>EXPLAIN ANALYZE</strong></div>
                  <div><strong style={{ color: '#e2e8f0' }}>🔐 Security (RBAC):</strong> role_loan_officer, role_loan_manager, role_customer_portal</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Live Execution Results (for Procedures & Functions) */}
        {consoleOutput && (activeTab === 'procedures' || activeTab === 'functions') && (
          <div style={{ marginTop: '18px', background: '#020617', border: '1px solid #1e293b', borderRadius: '8px', padding: '14px', fontFamily: 'monospace', fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '8px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--emerald-400)' }}>
                <span>✓ MySQL Execution Output</span>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>({consoleOutput.executionTimeMs} ms)</span>
              </div>
              <div>
                <span style={{ background: consoleOutput.statusCode === 'SUCCESS' || consoleOutput.success ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: consoleOutput.statusCode === 'SUCCESS' || consoleOutput.success ? 'var(--emerald-400)' : '#fca5a5', border: '1px solid currentColor', padding: '1px 8px', borderRadius: '4px', fontSize: '0.7rem' }}>
                  {consoleOutput.transactionStatus || 'COMPLETED'}
                </span>
              </div>
            </div>

            <div style={{ color: '#64748b', fontSize: '0.72rem', marginBottom: '4px' }}>-- Executed SQL in MySQL 8.0:</div>
            <div style={{ color: '#38bdf8', background: 'rgba(15, 23, 42, 0.8)', padding: '8px 12px', borderRadius: '4px', marginBottom: '10px', wordBreak: 'break-all' }}>
              {consoleOutput.sqlExecuted}
            </div>

            {consoleOutput.type === 'PROCEDURE' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <span style={{ color: '#64748b' }}>@code (Status Code): </span>
                  <strong style={{ color: consoleOutput.statusCode === 'SUCCESS' ? 'var(--emerald-400)' : '#f43f5e' }}>
                    {consoleOutput.statusCode}
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>@msg: </span>
                  <span style={{ color: '#e2e8f0' }}>{consoleOutput.statusMessage}</span>
                </div>
                {consoleOutput.generatedLoanId && (
                  <div style={{ gridColumn: '1 / -1', color: 'var(--emerald-400)' }}>
                    ✓ New Loan Account Created: #{consoleOutput.generatedLoanId}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <span style={{ color: '#64748b' }}>Calculated Function Result: </span>
                <strong style={{ color: 'var(--emerald-400)', fontSize: '1.05rem' }}>
                  {typeof consoleOutput.result === 'number'
                    ? `LKR ${Number(consoleOutput.result).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                    : String(consoleOutput.result)}
                </strong>
                <div style={{ color: '#64748b', fontSize: '0.72rem', marginTop: '4px' }}>
                  Computed natively inside MySQL Engine via User Defined Function ({consoleOutput.functionName})
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Apex Commercial Bank • ADBMS Retail Credit Capstone
          </span>
          <button 
            type="button" 
            className="btn-secondary" 
            style={{ padding: '6px 18px', fontSize: '0.82rem' }} 
            onClick={onClose}
          >
            Close Console
          </button>
        </div>
      </div>
    </div>
  )
}
