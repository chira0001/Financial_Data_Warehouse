import React, { useState } from 'react'
import { DatabaseIcon, ClockIcon, CheckIcon } from './Icons'
import { loanApi } from '../api/loanApi'

export default function AdbmsConsoleModal({ isOpen, onClose }) {
  if (!isOpen) return null

  const [activeTab, setActiveTab] = useState('procedures') // 'procedures' | 'functions'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [consoleOutput, setConsoleOutput] = useState(null)

  // Stored Procedure Form State
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
  })

  // Function Form State
  const [selectedFunc, setSelectedFunc] = useState('fn_calculate_monthly_emi')
  const [funcParams, setFuncParams] = useState({
    principal: 2000000,
    rate: 8.1,
    tenure: 48,
    loanId: 2008,
  })

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
      <div className="modal-content" style={{ maxWidth: '780px', padding: '24px', background: '#0a0f1d', border: '1px solid rgba(59, 130, 246, 0.4)', boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)' }}>
        <button type="button" className="modal-close" onClick={onClose} style={{ top: '14px', right: '16px' }}>✕</button>

        {/* Console Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid #3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
            <DatabaseIcon size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.25rem', margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>ADBMS Live Database Console</span>
              <span style={{ fontSize: '0.68rem', background: 'rgba(16, 185, 129, 0.2)', color: 'var(--emerald-400)', border: '1px solid var(--emerald-500)', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>
                MySQL 8.0 Live
              </span>
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Interactive Stored Procedure & User Defined Function (UDF) Execution Playground
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '18px' }}>
          <button
            type="button"
            className={`preset-pill ${activeTab === 'procedures' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('procedures')
              setConsoleOutput(null)
              setError('')
            }}
            style={{ fontSize: '0.86rem', padding: '8px 16px' }}
          >
            ⚙️ Stored Procedures (CALL)
          </button>
          <button
            type="button"
            className={`preset-pill ${activeTab === 'functions' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('functions')
              setConsoleOutput(null)
              setError('')
            }}
            style={{ fontSize: '0.86rem', padding: '8px 16px' }}
          >
            🧮 User Defined Functions (UDFs)
          </button>
        </div>

        {error && (
          <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid var(--rose-500)', color: '#fca5a5', padding: '10px 14px', borderRadius: '6px', marginBottom: '14px', fontSize: '0.84rem' }}>
            {error}
          </div>
        )}

        {/* TAB 1: STORED PROCEDURES */}
        {activeTab === 'procedures' && (
          <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`preset-pill ${selectedProc === 'sp_process_loan_payment' ? 'active' : ''}`}
                onClick={() => setSelectedProc('sp_process_loan_payment')}
                style={{ fontSize: '0.8rem' }}
              >
                sp_process_loan_payment
              </button>
              <button
                type="button"
                className={`preset-pill ${selectedProc === 'sp_disburse_new_loan' ? 'active' : ''}`}
                onClick={() => setSelectedProc('sp_disburse_new_loan')}
                style={{ fontSize: '0.8rem' }}
              >
                sp_disburse_new_loan
              </button>
            </div>

            {selectedProc === 'sp_process_loan_payment' ? (
              <form onSubmit={handleExecuteProc} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.78rem' }}>Target Facility ID (loan_id) *</label>
                  <input
                    type="number"
                    value={procParams.loanId}
                    onChange={(e) => setProcParams({ ...procParams, loanId: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.78rem' }}>Payment Amount (LKR) *</label>
                  <input
                    type="number"
                    value={procParams.amount}
                    onChange={(e) => setProcParams({ ...procParams, amount: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group full" style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '0.78rem' }}>Payment Instrument / Method *</label>
                  <select
                    value={procParams.method}
                    onChange={(e) => setProcParams({ ...procParams, method: e.target.value })}
                  >
                    <option value="LankaPay Real-Time Transfer">LankaPay Real-Time Transfer</option>
                    <option value="Debit Card Settlement">Debit Card Settlement</option>
                    <option value="Automated Standing Order">Automated Standing Order</option>
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1', marginTop: '6px' }}>
                  <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
                    {loading ? 'Executing in MySQL Engine...' : '⚡ Call sp_process_loan_payment in MySQL'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleExecuteProc} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.78rem' }}>Facility Type *</label>
                  <select
                    value={procParams.loanType}
                    onChange={(e) => setProcParams({ ...procParams, loanType: e.target.value })}
                  >
                    <option value="Personal">Personal Loan</option>
                    <option value="Housing">Housing Loan</option>
                    <option value="Vehicle">Vehicle Loan</option>
                    <option value="Business">Business Loan</option>
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.78rem' }}>Principal Amount (LKR) *</label>
                  <input
                    type="number"
                    value={procParams.amount}
                    onChange={(e) => setProcParams({ ...procParams, amount: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.78rem' }}>Interest Rate (%) *</label>
                  <input
                    type="number"
                    step="0.1"
                    value={procParams.rate}
                    onChange={(e) => setProcParams({ ...procParams, rate: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.78rem' }}>Tenure (Months) *</label>
                  <input
                    type="number"
                    value={procParams.tenure}
                    onChange={(e) => setProcParams({ ...procParams, tenure: e.target.value })}
                    required
                  />
                </div>
                <div style={{ gridColumn: '1 / -1', marginTop: '6px' }}>
                  <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
                    {loading ? 'Executing in MySQL Engine...' : '⚡ Call sp_disburse_new_loan in MySQL'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* TAB 2: USER DEFINED FUNCTIONS */}
        {activeTab === 'functions' && (
          <div>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`preset-pill ${selectedFunc === 'fn_calculate_monthly_emi' ? 'active' : ''}`}
                onClick={() => setSelectedFunc('fn_calculate_monthly_emi')}
                style={{ fontSize: '0.76rem' }}
              >
                fn_calculate_monthly_emi
              </button>
              <button
                type="button"
                className={`preset-pill ${selectedFunc === 'fn_loan_outstanding_balance' ? 'active' : ''}`}
                onClick={() => setSelectedFunc('fn_loan_outstanding_balance')}
                style={{ fontSize: '0.76rem' }}
              >
                fn_loan_outstanding_balance
              </button>
              <button
                type="button"
                className={`preset-pill ${selectedFunc === 'fn_days_overdue' ? 'active' : ''}`}
                onClick={() => setSelectedFunc('fn_days_overdue')}
                style={{ fontSize: '0.76rem' }}
              >
                fn_days_overdue
              </button>
              <button
                type="button"
                className={`preset-pill ${selectedFunc === 'fn_loan_risk_tier' ? 'active' : ''}`}
                onClick={() => setSelectedFunc('fn_loan_risk_tier')}
                style={{ fontSize: '0.76rem' }}
              >
                fn_loan_risk_tier
              </button>
            </div>

            {selectedFunc === 'fn_calculate_monthly_emi' || selectedFunc === 'fn_calculate_total_interest' ? (
              <form onSubmit={handleExecuteFunc} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.78rem' }}>Principal (P) *</label>
                  <input
                    type="number"
                    value={funcParams.principal}
                    onChange={(e) => setFuncParams({ ...funcParams, principal: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.78rem' }}>Rate % (r) *</label>
                  <input
                    type="number"
                    step="0.1"
                    value={funcParams.rate}
                    onChange={(e) => setFuncParams({ ...funcParams, rate: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.78rem' }}>Tenure Months (n) *</label>
                  <input
                    type="number"
                    value={funcParams.tenure}
                    onChange={(e) => setFuncParams({ ...funcParams, tenure: e.target.value })}
                    required
                  />
                </div>
                <div style={{ gridColumn: '1 / -1', marginTop: '6px' }}>
                  <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
                    {loading ? 'Evaluating in MySQL Engine...' : `Evaluate ${selectedFunc} in MySQL`}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleExecuteFunc} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.78rem' }}>Target Facility ID (loan_id) *</label>
                  <input
                    type="number"
                    value={funcParams.loanId}
                    onChange={(e) => setFuncParams({ ...funcParams, loanId: e.target.value })}
                    required
                  />
                </div>
                <button type="submit" className="btn-primary" style={{ height: '42px', padding: '0 20px', whiteSpace: 'nowrap' }} disabled={loading}>
                  {loading ? 'Evaluating...' : `Evaluate ${selectedFunc}`}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Real-time Terminal Execution Output Box */}
        {consoleOutput && (
          <div style={{ marginTop: '20px', background: '#020617', border: '1px solid #1e293b', borderRadius: '8px', padding: '16px', fontFamily: 'monospace', fontSize: '0.82rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b', paddingBottom: '8px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--emerald-500)', display: 'inline-block' }}></span>
                <span style={{ color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.74rem' }}>
                  MySQL 8.0 Execution Trace
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#38bdf8' }}>⏱ {consoleOutput.executionTimeMs} ms</span>
                <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: 'var(--emerald-400)', border: '1px solid var(--emerald-500)', padding: '1px 6px', borderRadius: '4px', fontSize: '0.7rem' }}>
                  {consoleOutput.transactionStatus || 'COMPLETED'}
                </span>
              </div>
            </div>

            {/* Executed SQL Statement */}
            <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '4px' }}>-- Executed SQL Statement:</div>
            <div style={{ color: '#38bdf8', background: 'rgba(15, 23, 42, 0.8)', padding: '8px 12px', borderRadius: '4px', marginBottom: '10px', wordBreak: 'break-all' }}>
              {consoleOutput.sqlExecuted}
            </div>

            {/* Output Variables */}
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

        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="btn-secondary" style={{ padding: '6px 16px', fontSize: '0.82rem' }} onClick={onClose}>
            Close Console
          </button>
        </div>
      </div>
    </div>
  )
}
