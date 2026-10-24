import React, { useState } from 'react'
import { CheckIcon, ArrowRightIcon, FileTextIcon, ShieldCheckIcon, PrinterIcon } from './Icons'
import { loanApi } from '../api/loanApi'

export default function ApplicationWizard({ initialPlan, onCompleteAndTrack }) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submittedResult, setSubmittedResult] = useState(null)

  const [formData, setFormData] = useState({
    customerName: '',
    nic: '',
    phone: '',
    city: 'Colombo',
    occupation: 'IT Professional',
    customerId: 'C' + String(Math.floor(Math.random() * 200) + 1).padStart(4, '0'),

    loanType: initialPlan?.productName || 'Personal',
    loanAmount: initialPlan?.amount || 1500000,
    tenureMonths: initialPlan?.tenureYears ? initialPlan.tenureYears * 12 : 36,
    interestRate: initialPlan?.rate || 10.5,
    purpose: 'Residential acquisition and property improvements',

    accountId: 'A' + String(Math.floor(Math.random() * 300) + 100).padStart(5, '0'),
    employmentType: 'Permanent Salaried',
    monthlyIncome: 285000,
    branchId: 'B001',
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleNext = () => {
    if (step === 1) {
      if (!formData.customerName.trim()) {
        setError('Please enter your full name as printed on your National Identity Card.')
        return
      }
      if (!formData.nic.trim()) {
        setError('Please enter a valid National Identity Card (NIC) number.')
        return
      }
    }
    setError('')
    setStep((prev) => Math.min(prev + 1, 3))
  }

  const handleBack = () => {
    setError('')
    setStep((prev) => Math.max(prev - 1, 1))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await loanApi.apply(formData)
      if (res.success) {
        setSubmittedResult(res)
      } else {
        setError(res.error || 'The system could not process your application at this time.')
      }
    } catch (err) {
      setError(err.message || 'Network communication error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Pre-calculated estimated monthly EMI
  const P = Number(formData.loanAmount)
  const r = (Number(formData.interestRate) / 12) / 100
  const n = Number(formData.tenureMonths)
  const estimatedEmi = n > 0 && r > 0 ? Math.round((P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)) : Math.round(P / n)

  if (submittedResult) {
    return (
      <section className="section" id="apply">
        <div className="app-card success-card">
          <div className="success-icon">
            <CheckIcon size={32} />
          </div>

          <h2>Credit Facility Application Acknowledged</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px', fontSize: '0.96rem' }}>
            Dear <strong>{submittedResult.details.customerName}</strong>, your formal credit application has been recorded and processed under the retail credit framework.
          </p>

          <div className="success-ref">
            Application Reference: {submittedResult.referenceNo}
          </div>

          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', padding: '22px', borderRadius: 'var(--radius-sm)', maxWidth: '540px', margin: '22px auto', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Assigned Facility ID:</span>
              <strong className="mono" style={{ fontSize: '1.05rem' }}>#{submittedResult.loanId}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Facility Classification:</span>
              <strong>{submittedResult.details.loanType} Loan Facility</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Sanctioned Principal:</span>
              <strong style={{ color: 'var(--emerald-400)', fontSize: '1.05rem' }}>LKR {Number(submittedResult.details.loanAmount).toLocaleString()}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Contractual Annual Rate:</span>
              <strong>{submittedResult.details.interestRate}% p.a. fixed</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Tenure Schedule:</span>
              <strong>{submittedResult.details.tenureMonths} Monthly Installments</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Current Status:</span>
              <span style={{ color: 'var(--emerald-400)', fontWeight: '700' }}>Active Facility</span>
            </div>
          </div>

          <div className="no-print" style={{ display: 'flex', gap: '14px', justifyContent: 'center', marginTop: '28px', flexWrap: 'wrap' }}>
            <button 
              type="button"
              className="btn-primary"
              onClick={() => onCompleteAndTrack(submittedResult.loanId)}
            >
              <span>Inspect Facility & Repayments</span>
              <ArrowRightIcon size={16} />
            </button>
            <button 
              type="button"
              className="btn-secondary"
              onClick={() => window.print()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <PrinterIcon size={16} />
              <span>Print Official Approval Letter</span>
            </button>
            <button 
              type="button"
              className="btn-secondary"
              onClick={() => {
                setSubmittedResult(null)
                setStep(1)
              }}
            >
              Submit Another Application
            </button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="section" id="apply">
      <div className="section-head">
        <span className="section-tag">Electronic Application Portal</span>
        <h2>Online Credit Facility Application</h2>
        <p>Complete the standardized electronic onboarding procedure for rapid retail underwriting and facility approval.</p>
      </div>

      <div className="app-card">
        {/* Step Indicator */}
        <div className="wizard-steps">
          <div className={`step-node ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`} onClick={() => setStep(1)}>
            <div className="step-circle">{step > 1 ? <CheckIcon size={14} /> : '1'}</div>
            <span>Personal & Identification</span>
          </div>
          <div className={`step-node ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`} onClick={() => setStep(2)}>
            <div className="step-circle">{step > 2 ? <CheckIcon size={14} /> : '2'}</div>
            <span>Facility Parameters</span>
          </div>
          <div className={`step-node ${step === 3 ? 'active' : ''}`} onClick={() => setStep(3)}>
            <div className="step-circle">3</div>
            <span>Income & Account Setup</span>
          </div>
        </div>

        {error && (
          <div style={{ background: 'rgba(244, 63, 94, 0.12)', border: '1px solid var(--rose-500)', color: '#fca5a5', padding: '12px 16px', borderRadius: '8px', marginBottom: '22px', fontSize: '0.88rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* STEP 1: Personal Details */}
          {step === 1 && (
            <div className="form-grid">
              <div className="form-group full">
                <label>Full Legal Name (as per National Identity Card) *</label>
                <input 
                  type="text" 
                  name="customerName"
                  placeholder="e.g. Sahan Dhananjaya Jayasinghe"
                  value={formData.customerName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>National Identity Card (NIC) / Passport Number *</label>
                <input 
                  type="text" 
                  name="nic"
                  placeholder="e.g. 199512345678 or 951234567V"
                  value={formData.nic}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Primary Contact Telephone *</label>
                <input 
                  type="tel" 
                  name="phone"
                  placeholder="e.g. 077 123 4567"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>City of Permanent Residence</label>
                <select name="city" value={formData.city} onChange={handleChange}>
                  <option value="Colombo">Colombo</option>
                  <option value="Kandy">Kandy</option>
                  <option value="Galle">Galle</option>
                  <option value="Jaffna">Jaffna</option>
                  <option value="Negombo">Negombo</option>
                  <option value="Kurunegala">Kurunegala</option>
                  <option value="Matara">Matara</option>
                  <option value="Nuwara Eliya">Nuwara Eliya</option>
                  <option value="Batticaloa">Batticaloa</option>
                  <option value="Anuradhapura">Anuradhapura</option>
                </select>
              </div>

              <div className="form-group">
                <label>Principal Occupation / Profession</label>
                <select name="occupation" value={formData.occupation} onChange={handleChange}>
                  <option value="IT Professional">IT Professional / Software Engineer</option>
                  <option value="Doctor">Medical Practitioner / Doctor</option>
                  <option value="Accountant">Chartered Accountant / Financial Officer</option>
                  <option value="Teacher">Educator / University Lecturer</option>
                  <option value="Government Officer">Public Sector Executive / Officer</option>
                  <option value="Business Owner">Business Proprietor / Entrepreneur</option>
                  <option value="Engineer">Civil / Mechanical / Electrical Engineer</option>
                  <option value="Other">Corporate Executive</option>
                </select>
              </div>
            </div>
          )}

          {/* STEP 2: Loan Parameters */}
          {step === 2 && (
            <div className="form-grid">
              <div className="form-group">
                <label>Credit Facility Type *</label>
                <select name="loanType" value={formData.loanType} onChange={handleChange}>
                  <option value="Personal">Personal Loan Facility (12.50% p.a.)</option>
                  <option value="Housing">Housing & Home Loan Facility (8.10% p.a.)</option>
                  <option value="Vehicle">Vehicle Lease / Auto Facility (10.50% p.a.)</option>
                  <option value="Education">Higher Education Financing (6.87% p.a.)</option>
                  <option value="Business">Commercial & SME Line (11.00% p.a.)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Requested Principal Amount (LKR) *</label>
                <input 
                  type="number" 
                  name="loanAmount"
                  min="50000"
                  max="25000000"
                  step="25000"
                  value={formData.loanAmount}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Requested Amortization Period (Tenure) *</label>
                <select name="tenureMonths" value={formData.tenureMonths} onChange={handleChange}>
                  <option value="12">12 Months (1 Year)</option>
                  <option value="24">24 Months (2 Years)</option>
                  <option value="36">36 Months (3 Years)</option>
                  <option value="48">48 Months (4 Years)</option>
                  <option value="60">60 Months (5 Years)</option>
                  <option value="84">84 Months (7 Years)</option>
                  <option value="120">120 Months (10 Years)</option>
                  <option value="180">180 Months (15 Years)</option>
                  <option value="240">240 Months (20 Years)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Nominal Annual Interest Benchmark (%)</label>
                <input 
                  type="number" 
                  name="interestRate"
                  step="0.01"
                  value={formData.interestRate}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group full">
                <label>Specific Purpose of Loan Application</label>
                <input 
                  type="text" 
                  name="purpose"
                  placeholder="e.g. Residential home expansion, university degree financing, commercial inventory acquisition"
                  value={formData.purpose}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group full" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', padding: '16px', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Estimated Equated Monthly Installment (EMI):</span>
                <div style={{ fontSize: '1.4rem', color: 'var(--emerald-400)', fontWeight: 'bold' }}>
                  LKR {estimatedEmi.toLocaleString()} / month
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Employment, Remuneration & Settlement Account */}
          {step === 3 && (
            <div className="form-grid">
              <div className="form-group">
                <label>Employment Classification</label>
                <select name="employmentType" value={formData.employmentType} onChange={handleChange}>
                  <option value="Permanent Salaried">Permanent Salaried Employee</option>
                  <option value="Self-Employed">Self-Employed Professional</option>
                  <option value="Business Owner">Business Proprietor</option>
                  <option value="Foreign Contract">Foreign Remittance Contract</option>
                </select>
              </div>

              <div className="form-group">
                <label>Certified Gross Monthly Remuneration (LKR) *</label>
                <input 
                  type="number" 
                  name="monthlyIncome"
                  step="10000"
                  value={formData.monthlyIncome}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Designated Settlement Account Number</label>
                <input 
                  type="text" 
                  name="accountId"
                  placeholder="e.g. A00105"
                  value={formData.accountId}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Servicing Provincial Branch</label>
                <select name="branchId" value={formData.branchId} onChange={handleChange}>
                  <option value="B001">B001 - Colombo Head Office Branch</option>
                  <option value="B002">B002 - Kandy City Branch</option>
                  <option value="B003">B003 - Galle Fort Branch</option>
                  <option value="B004">B004 - Jaffna Town Branch</option>
                  <option value="B005">B005 - Negombo Branch</option>
                  <option value="B006">B006 - Kurunegala Branch</option>
                  <option value="B007">B007 - Matara Branch</option>
                  <option value="B008">B008 - Nuwara Eliya Branch</option>
                  <option value="B009">B009 - Batticaloa Branch</option>
                  <option value="B010">B010 - Anuradhapura Branch</option>
                </select>
              </div>

              <div className="form-group full" style={{ border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '16px', background: 'rgba(15, 23, 42, 0.4)' }}>
                <h4 style={{ fontSize: '0.94rem', marginBottom: '10px', color: '#93c5fd', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheckIcon size={16} />
                  <span>Mandatory Regulatory KYC Documentation (CBSL Directive Compliant)</span>
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', fontSize: '0.84rem' }}>
                  <div style={{ background: 'var(--bg-surface)', padding: '10px 14px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>National Identity Card (NIC Scan)</span>
                    <span style={{ color: 'var(--emerald-400)', fontWeight: 'bold' }}>Attached ✓</span>
                  </div>
                  <div style={{ background: 'var(--bg-surface)', padding: '10px 14px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Certified Salary Payslip (3 Mo)</span>
                    <span style={{ color: 'var(--emerald-400)', fontWeight: 'bold' }}>Attached ✓</span>
                  </div>
                  <div style={{ background: 'var(--bg-surface)', padding: '10px 14px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Proof of Residential Address</span>
                    <span style={{ color: 'var(--emerald-400)', fontWeight: 'bold' }}>Attached ✓</span>
                  </div>
                </div>
              </div>

              <div className="form-group full" style={{ border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '16px', background: 'var(--bg-surface)' }}>
                <h4 style={{ fontSize: '0.98rem', marginBottom: '10px', color: 'var(--emerald-400)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileTextIcon size={16} />
                  <span>Pre-Submission Terms Summary</span>
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.86rem' }}>
                  <div>Applicant: <strong>{formData.customerName || '—'}</strong></div>
                  <div>NIC: <strong>{formData.nic || '—'}</strong></div>
                  <div>Facility Type: <strong>{formData.loanType} Loan</strong></div>
                  <div>Principal: <strong>LKR {Number(formData.loanAmount).toLocaleString()}</strong></div>
                  <div>Amortization: <strong>{formData.tenureMonths} Months</strong></div>
                  <div>Monthly Installment: <strong style={{ color: 'var(--emerald-400)' }}>LKR {estimatedEmi.toLocaleString()}</strong></div>
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="form-actions">
            {step > 1 ? (
              <button type="button" className="btn-secondary" onClick={handleBack} disabled={loading}>
                ← Previous Step
              </button>
            ) : <div></div>}

            {step < 3 ? (
              <button type="button" className="btn-primary" onClick={handleNext}>
                <span>Next Step</span>
                <ArrowRightIcon size={16} />
              </button>
            ) : (
              <button type="submit" className="btn-primary" disabled={loading} style={{ minWidth: '200px' }}>
                {loading ? 'Processing Submission...' : 'Submit Credit Application'}
              </button>
            )}
          </div>
        </form>
      </div>
    </section>
  )
}
