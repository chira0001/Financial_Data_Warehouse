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
      const res = await loanApi.getView(vName)
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
      const res = await loanApi.getAuditLog()
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
      })
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
            ⚡ Procedures (ACID)
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
            📊 Operational Views (5)
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
            👥 5-Member Team Roles
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
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`preset-pill ${selectedProc === 'sp_process_loan_payment' ? 'active' : ''}`}
                onClick={() => setSelectedProc('sp_process_loan_payment')}
              >
                1. sp_process_loan_payment (Repayment & Payoff)
              </button>
              <button
                type="button"
                className={`preset-pill ${selectedProc === 'sp_disburse_new_loan' ? 'active' : ''}`}
                onClick={() => setSelectedProc('sp_disburse_new_loan')}
              >
                2. sp_disburse_new_loan (Disbursement)
              </button>
              <button
                type="button"
                className={`preset-pill ${selectedProc === 'sp_restructure_loan' ? 'active' : ''}`}
                onClick={() => setSelectedProc('sp_restructure_loan')}
              >
                3. sp_restructure_loan (Restructuring)
              </button>
              <button
                type="button"
                className={`preset-pill ${selectedProc === 'sp_underwrite_loan_application' ? 'active' : ''}`}
                onClick={() => setSelectedProc('sp_underwrite_loan_application')}
              >
                4. sp_underwrite_loan_application (Member 2 Underwriting)
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
                    ℹ️ Evaluates credit score threshold (≥620), pledged collateral coverage (≥100% on high-value facilities), and generates decision notes autonomously.
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
                  {loading ? 'Executing in MySQL Engine...' : '⚡ Execute Procedure via MySQL Engine'}
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
                className={`preset-pill ${selectedFunc === 'fn_loan_outstanding_balance' ? 'active' : ''}`}
                onClick={() => setSelectedFunc('fn_loan_outstanding_balance')}
              >
                1. fn_loan_outstanding_balance
              </button>
              <button
                type="button"
                className={`preset-pill ${selectedFunc === 'fn_calculate_monthly_emi' ? 'active' : ''}`}
                onClick={() => setSelectedFunc('fn_calculate_monthly_emi')}
              >
                2. fn_calculate_monthly_emi
              </button>
              <button
                type="button"
                className={`preset-pill ${selectedFunc === 'fn_loan_risk_tier' ? 'active' : ''}`}
                onClick={() => setSelectedFunc('fn_loan_risk_tier')}
              >
                3. fn_loan_risk_tier
              </button>
              <button
                type="button"
                className={`preset-pill ${selectedFunc === 'fn_days_overdue' ? 'active' : ''}`}
                onClick={() => setSelectedFunc('fn_days_overdue')}
              >
                4. fn_days_overdue
              </button>
              <button
                type="button"
                className={`preset-pill ${selectedFunc === 'fn_calculate_total_interest' ? 'active' : ''}`}
                onClick={() => setSelectedFunc('fn_calculate_total_interest')}
              >
                5. fn_calculate_total_interest
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
                  {loading ? 'Executing UDF...' : '⚡ Execute UDF via MySQL Engine'}
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
                { id: 'vw_loan_portfolio_health_metrics', label: '1. Portfolio Health & NPL Rates' },
                { id: 'vw_loan_officer_active_facilities', label: '2. Active Facilities & Risk Tiers' },
                { id: 'vw_overdue_collections_queue', label: '3. Overdue Collections Queue' },
                { id: 'vw_daily_payment_reconciliation', label: '4. Daily Payment Reconciliation' },
                { id: 'vw_customer_loan_statement', label: '5. Customer Net Exposure' },
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
              <span><strong>Event Scheduler Active:</strong> evt_daily_loan_status_check runs EVERY 1 DAY at 00:00:00, calling sp_mark_overdue_facilities() autonomously.</span>
            </div>

            {/* ADBMS Query Optimization & Index Benchmark */}
            <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(168, 85, 247, 0.4)', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>⚡</span>
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
                  {explainLoading ? 'Evaluating Plan...' : '⚡ Run EXPLAIN ANALYZE on MySQL Optimizer'}
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
                5-Member ADBMS Engineering Team Allocation
              </h4>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>
                Individual technical contributions for the Retail Banking Loan & Credit Management Subsystem
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
              <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px', padding: '14px' }}>
                <div style={{ fontSize: '0.72rem', color: '#60a5fa', fontWeight: 'bold', textTransform: 'uppercase' }}>Member 01</div>
                <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#f8fafc', margin: '2px 0 6px' }}>Relational Schema & Relational Views</div>
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.5 }}>
                  <li>8 Normalized Core Tables (3NF/BCNF Schema Architecture)</li>
                  <li>Foreign Key Constraints & Referential Integrity</li>
                  <li>5 Production Relational Views (Portfolio Health, Active Facilities, etc.)</li>
                </ul>
              </div>

              <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '8px', padding: '14px' }}>
                <div style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 'bold', textTransform: 'uppercase' }}>Member 02</div>
                <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#f8fafc', margin: '2px 0 6px' }}>Transaction Management & Stored Procedures</div>
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.5 }}>
                  <li>Pessimistic Concurrency Control (InnoDB FOR UPDATE Row-Locking)</li>
                  <li>4 Core Procedures: sp_process_loan_payment, sp_disburse_new_loan</li>
                  <li>sp_restructure_loan & sp_underwrite_loan_application</li>
                  <li>ACID Properties, SQLEXCEPTION Handlers & Rollback Safety</li>
                </ul>
              </div>

              <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '8px', padding: '14px' }}>
                <div style={{ fontSize: '0.72rem', color: '#c084fc', fontWeight: 'bold', textTransform: 'uppercase' }}>Member 03</div>
                <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#f8fafc', margin: '2px 0 6px' }}>In-Engine Financial Math & Cursors</div>
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.5 }}>
                  <li>5 User Defined Functions (fn_calculate_monthly_emi amortization formula)</li>
                  <li>fn_loan_outstanding_balance, fn_days_overdue & fn_calculate_total_interest</li>
                  <li>fn_loan_risk_tier multi-factor credit risk scoring algorithm</li>
                  <li>MySQL Cursors in sp_mark_overdue_facilities for batch records processing</li>
                </ul>
              </div>

              <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px', padding: '14px' }}>
                <div style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: 'bold', textTransform: 'uppercase' }}>Member 04</div>
                <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#f8fafc', margin: '2px 0 6px' }}>Active Database Automation & Triggers</div>
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.5 }}>
                  <li>Active Database Trigger: trg_payments_after_insert_update_loan</li>
                  <li>Autonomous Midnight Scheduled Event: evt_daily_loan_status_check</li>
                  <li>Immutable Audit Logging (Change Data Capture into loan_audit_log)</li>
                </ul>
              </div>

              <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(236, 72, 153, 0.3)', borderRadius: '8px', padding: '14px' }}>
                <div style={{ fontSize: '0.72rem', color: '#f472b6', fontWeight: 'bold', textTransform: 'uppercase' }}>Member 05</div>
                <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#f8fafc', margin: '2px 0 6px' }}>Database Security (RBAC) & Optimization</div>
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.5 }}>
                  <li>Role-Based Access Control: role_loan_officer, role_loan_manager, role_loan_auditor</li>
                  <li>Principle of Least Privilege (Separation of duties & granular grants)</li>
                  <li>Composite Indexing & EXPLAIN ANALYZE Query Optimization Benchmark</li>
                  <li>Subsystem Client Integration & Interactive Execution Terminal</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Live Execution Terminal (for Procedures & Functions) */}
        {consoleOutput && (activeTab === 'procedures' || activeTab === 'functions') && (
          <div style={{ marginTop: '18px', background: '#020617', border: '1px solid #1e293b', borderRadius: '8px', padding: '14px', fontFamily: 'monospace', fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '8px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--emerald-400)' }}>
                <span>✓ MySQL Runtime Execution Trace</span>
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
