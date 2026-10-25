import React, { useState } from 'react'
import { CheckIcon, ArrowRightIcon, FileTextIcon, ShieldCheckIcon, PrinterIcon, SearchIcon } from './Icons'
import { loanApi } from '../api/loanApi'

export default function ApplicationWizard({ initialPlan, onCompleteAndTrack, onSwitchToManager }) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submittedResult, setSubmittedResult] = useState(null)
  const [copiedRef, setCopiedRef] = useState(false)

  const [formData, setFormData] = useState({
    customerName: '',
    nic: '',
    phone: '',
    city: 'Colombo',
    occupation: 'IT Professional',
    customerId: '',

    loanType: initialPlan?.productName || 'Personal',
    loanAmount: initialPlan?.amount || 1500000,
    tenureMonths: initialPlan?.tenureYears ? initialPlan.tenureYears * 12 : 36,
    interestRate: initialPlan?.rate || 12.5,
    purpose: 'Residential acquisition and property improvements',

    accountId: '',
    employmentType: 'Permanent Salaried',
    monthlyIncome: 285000,
    branchId: 'B001',

    // Guarantor Details (Mandatory for facilities >= LKR 1.5M)
    hasGuarantor: (initialPlan?.amount || 1500000) >= 1500000,
    guarantorName: '',
    guarantorNic: '',
    guarantorRelationship: 'Parent',
    guarantorEmployer: '',
    guarantorIncome: 180000,
    guarantorPhone: '',
  })

  const rateMap = {
    Personal: 12.5,
    Housing: 8.1,
    Vehicle: 10.5,
    Education: 6.87,
    Business: 11.0,
  }

  const handleChange = (e) => {
    let { name, value, type, checked } = e.target
    if (type === 'checkbox') {
      setFormData((prev) => ({ ...prev, [name]: checked }))
      return
    }
    if (name === 'nic' || name === 'guarantorNic') {
      value = value.toUpperCase().trim()
    }
    if (name === 'loanAmount') {
      const numAmt = Number(value)
      setFormData((prev) => ({
        ...prev,
        loanAmount: value,
        hasGuarantor: numAmt >= 1500000 ? true : prev.hasGuarantor,
      }))
      return
    }
    if (name === 'loanType') {
      const autoRate = rateMap[value] || 12.5
      setFormData((prev) => ({ ...prev, loanType: value, interestRate: autoRate }))
      return
    }
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const scrollToWizard = () => {
    const el = document.getElementById('apply')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Granular Step Validation Helpers
  const validateStep1 = () => {
    const name = (formData.customerName || '').trim()
    if (!name || name.length < 3) {
      return 'Please enter your full legal name as per NIC (minimum 3 characters).'
    }

    const nicTrimmed = (formData.nic || '').trim()
    const nicRegex = /^([0-9]{9}[vVxX]|[0-9]{12})$/
    if (!nicTrimmed || !nicRegex.test(nicTrimmed)) {
      return 'Invalid National Identity Card (NIC) format. Expected 9 digits with V (e.g., 951234567V) or 12 digits (e.g., 199512345678).'
    }

    const phoneClean = (formData.phone || '').replace(/[\s-+]/g, '')
    const phoneRegex = /^(?:0|94)?(7[0-9]{8})$/
    if (!phoneClean || !phoneRegex.test(phoneClean)) {
      return 'Invalid contact telephone. Please provide a valid 10-digit Sri Lankan mobile number (e.g., 077 123 4567).'
    }

    return null
  }

  const validateStep2 = () => {
    const amt = Number(formData.loanAmount)
    if (!amt || isNaN(amt) || amt < 50000) {
      return 'Minimum loan facility amount is LKR 50,000.'
    }
    if (amt > 25000000) {
      return 'Maximum retail credit facility limit is LKR 25,000,000.'
    }
    const tenure = Number(formData.tenureMonths)
    if (!tenure || tenure < 6 || tenure > 240) {
      return 'Please select a valid amortization tenure (between 6 and 240 months).'
    }
    return null
  }

  const validateGuarantor = () => {
    const isLargeFacility = Number(formData.loanAmount) >= 1500000
    if (!isLargeFacility && !formData.hasGuarantor) {
      return null
    }

    const gName = (formData.guarantorName || '').trim()
    if (!gName || gName.length < 3) {
      return 'Guarantor full legal name is required (minimum 3 characters).'
    }

    const gNicTrimmed = (formData.guarantorNic || '').trim()
    const nicRegex = /^([0-9]{9}[vVxX]|[0-9]{12})$/
    if (!gNicTrimmed || !nicRegex.test(gNicTrimmed)) {
      return 'Invalid Guarantor NIC format. Expected 9 digits with V (e.g. 751234567V) or 12 digits (e.g. 197512345678).'
    }

    // Guarantor cannot be the same person as primary borrower
    if (gNicTrimmed.toUpperCase() === (formData.nic || '').trim().toUpperCase()) {
      return 'Guarantor cannot be the same individual as the primary applicant.'
    }

    const gEmp = (formData.guarantorEmployer || '').trim()
    if (!gEmp || gEmp.length < 3) {
      return 'Guarantor employer or business corporate institution is required.'
    }

    const gIncome = Number(formData.guarantorIncome)
    if (!gIncome || isNaN(gIncome) || gIncome < 40000) {
      return 'Guarantor declared gross monthly remuneration must be at least LKR 40,000.'
    }

    const gPhoneClean = (formData.guarantorPhone || '').replace(/[\s-+]/g, '')
    const phoneRegex = /^(?:0|94)?(7[0-9]{8})$/
    if (gPhoneClean && !phoneRegex.test(gPhoneClean)) {
      return 'Invalid Guarantor contact phone. Please provide a valid 10-digit Sri Lankan mobile number (e.g. 077 123 4567).'
    }

    return null
  }

  const validateStep3 = () => {
    const income = Number(formData.monthlyIncome)
    if (!income || isNaN(income) || income < 25000) {
      return 'Declared gross monthly remuneration must be at least LKR 25,000.'
    }

    const gErr = validateGuarantor()
    if (gErr) {
      return gErr
    }

    return null
  }

  // Guard direct stepper clicks
  const handleStepClick = (targetStep) => {
    setError('')
    if (targetStep === 1) {
      setStep(1)
      scrollToWizard()
      return
    }

    if (targetStep === 2) {
      const err1 = validateStep1()
      if (err1) {
        setError(err1)
        setStep(1)
        scrollToWizard()
        return
      }
      setStep(2)
      scrollToWizard()
      return
    }

    if (targetStep === 3) {
      const err1 = validateStep1()
      if (err1) {
        setError(err1)
        setStep(1)
        scrollToWizard()
        return
      }
      const err2 = validateStep2()
      if (err2) {
        setError(err2)
        setStep(2)
        scrollToWizard()
        return
      }
      setStep(3)
      scrollToWizard()
      return
    }
  }

  const handleNext = () => {
    setError('')

    // Step 1 Validation
    if (step === 1) {
      const err = validateStep1()
      if (err) {
        setError(err)
        return
      }
    }

    // Step 2 Validation
    if (step === 2) {
      const err = validateStep2()
      if (err) {
        setError(err)
        return
      }
    }

    setError('')
    setStep((prev) => Math.min(prev + 1, 3))
    scrollToWizard()
  }

  const handleBack = () => {
    setError('')
    setStep((prev) => Math.max(prev - 1, 1))
    scrollToWizard()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // 1. Mandatory Step 1 Pre-Submit Verification
    const err1 = validateStep1()
    if (err1) {
      setError(err1)
      setStep(1)
      scrollToWizard()
      return
    }

    // 2. Mandatory Step 2 Pre-Submit Verification
    const err2 = validateStep2()
    if (err2) {
      setError(err2)
      setStep(2)
      scrollToWizard()
      return
    }

    // 3. Mandatory Step 3 Verification
    const err3 = validateStep3()
    if (err3) {
      setError(err3)
      scrollToWizard()
      return
    }

    setLoading(true)

    try {
      const isLargeFacility = Number(formData.loanAmount) >= 1500000
      const hasGuarantorAttached = isLargeFacility || !!formData.hasGuarantor

      const res = await loanApi.apply({
        ...formData,
        customerName: formData.customerName.trim(),
        nic: formData.nic.trim().toUpperCase(),
        phone: formData.phone.trim(),
        loanAmount: Number(formData.loanAmount),
        tenureMonths: Number(formData.tenureMonths),
        monthlyIncome: Number(formData.monthlyIncome),
        hasGuarantor: hasGuarantorAttached,
        guarantorName: hasGuarantorAttached ? (formData.guarantorName || '').trim() : '',
        guarantorNic: hasGuarantorAttached ? (formData.guarantorNic || '').trim().toUpperCase() : '',
        guarantorRelationship: hasGuarantorAttached ? formData.guarantorRelationship : '',
        guarantorEmployer: hasGuarantorAttached ? (formData.guarantorEmployer || '').trim() : '',
        guarantorIncome: hasGuarantorAttached ? (Number(formData.guarantorIncome) || 0) : 0,
        guarantorPhone: hasGuarantorAttached ? (formData.guarantorPhone || '').trim() : '',
      })
      if (res.success) {
        setSubmittedResult(res)
        scrollToWizard()
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
    const isPending = submittedResult.pendingApproval

    return (
      <section className="section" id="apply">
        <div className="app-card success-card" style={{ borderColor: isPending ? 'rgba(245, 158, 11, 0.4)' : undefined }}>
          <div className="success-icon" style={{ background: isPending ? 'rgba(245, 158, 11, 0.15)' : undefined, color: isPending ? '#fbbf24' : undefined }}>
            {isPending ? '⏳' : <CheckIcon size={32} />}
          </div>

          <h2>{isPending ? 'Credit Application Queued for Underwriting' : 'Credit Facility Application Acknowledged'}</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px', fontSize: '0.96rem' }}>
            Dear <strong>{submittedResult.details.customerName}</strong>, your formal credit application has been recorded in MySQL under application reference <strong>#{submittedResult.applicationId}</strong>.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', margin: '14px 0' }}>
            <div className="success-ref" style={{ margin: 0, borderColor: isPending ? 'rgba(245, 158, 11, 0.4)' : undefined, color: isPending ? '#fef08a' : undefined }}>
              Application Reference: {submittedResult.referenceNo}
            </div>
            <button
              type="button"
              className="btn-secondary no-print"
              style={{ padding: '8px 14px', fontSize: '0.82rem', borderRadius: '4px' }}
              onClick={() => {
                navigator.clipboard.writeText(submittedResult.referenceNo)
                setCopiedRef(true)
                setTimeout(() => setCopiedRef(false), 2000)
              }}
            >
              {copiedRef ? 'Copied ✓' : 'Copy Ref'}
            </button>
          </div>

          {/* RBAC Governance Notice */}
          {isPending && (
            <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px', padding: '12px 16px', maxWidth: '540px', margin: '14px auto', textAlign: 'left', fontSize: '0.82rem', color: '#fde68a' }}>
              <strong>⚖️ Institutional RBAC Compliance:</strong> In accordance with ADBMS retail credit separation of duties, customers cannot self-disburse credit facilities. This application is now queued in the database for the <strong>Loan Manager</strong> to execute Stored Procedure <code>sp_underwrite_loan_application</code>.
            </div>
          )}

          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', padding: '22px', borderRadius: 'var(--radius-sm)', maxWidth: '540px', margin: '18px auto', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Assigned Application ID:</span>
              <strong className="mono" style={{ fontSize: '1.05rem', color: '#93c5fd' }}>#{submittedResult.applicationId || submittedResult.loanId}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Facility Classification:</span>
              <strong>{submittedResult.details.loanType} Loan Facility</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Requested Principal:</span>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Credit Score Assessed:</span>
              <span style={{ color: '#60a5fa', fontWeight: '600' }}>{submittedResult.details.creditScore || 720} (Threshold: 620)</span>
            </div>
            {submittedResult.details.guarantor && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', background: 'rgba(16, 185, 129, 0.1)', padding: '6px 10px', borderRadius: '4px' }}>
                <span style={{ color: '#34d399', fontWeight: 'bold' }}>Registered Guarantor:</span>
                <span style={{ color: '#f8fafc', fontWeight: '600' }}>
                  {submittedResult.details.guarantor.name} ({submittedResult.details.guarantor.relationship})
                </span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Current Status:</span>
              <span style={{ color: isPending ? '#fbbf24' : 'var(--emerald-400)', fontWeight: '700' }}>
                {isPending ? '🟡 Pending Manager Underwriting' : 'Active Facility'}
              </span>
            </div>
          </div>

          <div className="no-print" style={{ display: 'flex', gap: '14px', justifyContent: 'center', marginTop: '24px', flexWrap: 'wrap' }}>
            {isPending && onSwitchToManager ? (
              <>
                <button 
                  type="button"
                  className="btn-primary"
                  onClick={onSwitchToManager}
                  style={{ background: 'linear-gradient(135deg, #9333ea, #7e22ce)', boxShadow: '0 4px 14px rgba(147, 51, 234, 0.4)' }}
                >
                  <span>🟣 Switch to Loan Manager & Underwrite Facility</span>
                  <ArrowRightIcon size={16} />
                </button>
                <button 
                  type="button"
                  className="btn-secondary"
                  onClick={() => onCompleteAndTrack(submittedResult.applicationId || submittedResult.loanId)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  <SearchIcon size={16} />
                  <span>Track Application #{submittedResult.applicationId || submittedResult.loanId}</span>
                </button>
              </>
            ) : (
              <button 
                type="button"
                className="btn-primary"
                onClick={() => onCompleteAndTrack(submittedResult.applicationId || submittedResult.loanId)}
              >
                <span>Inspect Facility & Repayments</span>
                <ArrowRightIcon size={16} />
              </button>
            )}
            <button 
              type="button"
              className="btn-secondary"
              onClick={() => window.print()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <PrinterIcon size={16} />
              <span>Print Application Slip</span>
            </button>
            <button 
              type="button"
              className="btn-secondary"
              onClick={() => {
                setSubmittedResult(null)
                setFormData({
                  customerName: '',
                  nic: '',
                  phone: '',
                  city: 'Colombo',
                  occupation: 'IT Professional',
                  customerId: '',
                  loanType: 'Personal',
                  loanAmount: 1500000,
                  tenureMonths: 36,
                  interestRate: 12.5,
                  purpose: 'Residential acquisition and property improvements',
                  accountId: '',
                  employmentType: 'Permanent Salaried',
                  monthlyIncome: 285000,
                  branchId: 'B001',
                  hasGuarantor: true,
                  guarantorName: '',
                  guarantorNic: '',
                  guarantorRelationship: 'Parent',
                  guarantorEmployer: '',
                  guarantorIncome: 180000,
                  guarantorPhone: '',
                })
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
          <div 
            className={`step-node ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`} 
            onClick={() => handleStepClick(1)}
            style={{ cursor: 'pointer' }}
          >
            <div className="step-circle">{step > 1 ? <CheckIcon size={14} /> : '1'}</div>
            <span>Personal & Identification</span>
          </div>
          <div 
            className={`step-node ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`} 
            onClick={() => handleStepClick(2)}
            style={{ cursor: validateStep1() ? 'not-allowed' : 'pointer', opacity: validateStep1() && step < 2 ? 0.6 : 1 }}
            title={validateStep1() ? 'Complete Step 1 to unlock' : 'Facility Parameters'}
          >
            <div className="step-circle">{step > 2 ? <CheckIcon size={14} /> : '2'}</div>
            <span>Facility Parameters</span>
          </div>
          <div 
            className={`step-node ${step === 3 ? 'active' : ''}`} 
            onClick={() => handleStepClick(3)}
            style={{ cursor: (validateStep1() || validateStep2()) ? 'not-allowed' : 'pointer', opacity: (validateStep1() || validateStep2()) && step < 3 ? 0.6 : 1 }}
            title={(validateStep1() || validateStep2()) ? 'Complete Steps 1 & 2 to unlock' : 'Income & Account Setup'}
          >
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>National Identity Card (NIC) / Passport Number *</label>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>9 digits+V or 12 digits</span>
                </div>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>Primary Contact Telephone *</label>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>07X XXX XXXX</span>
                </div>
                <input 
                  type="tel" 
                  name="phone"
                  placeholder="e.g. 077 123 4567"
                  value={formData.phone}
                  onChange={handleChange}
                  required
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>Requested Principal Amount (LKR) *</label>
                  <span style={{ fontSize: '0.72rem', color: 'var(--emerald-400)' }}>LKR 50K – 25M</span>
                </div>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ margin: 0 }}>Nominal Annual Interest Benchmark (%)</label>
                  <span style={{ fontSize: '0.7rem', background: 'rgba(59, 130, 246, 0.15)', color: '#93c5fd', border: '1px solid rgba(59, 130, 246, 0.35)', padding: '2px 8px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    🔒 Bank Policy Locked
                  </span>
                </div>
                <input 
                  type="number" 
                  name="interestRate"
                  step="0.01"
                  value={formData.interestRate}
                  readOnly
                  style={{ background: 'rgba(15, 23, 42, 0.65)', cursor: 'not-allowed', color: '#93c5fd', fontWeight: 'bold', border: '1px solid rgba(148, 163, 184, 0.2)' }}
                  title="Institutional lending rate governed by Asset-Liability Committee (ALCO) & Product Catalog. Cannot be altered by applicants."
                />
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                  Contractual rate fixed by Credit Committee for {formData.loanType} facilities.
                </span>
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

              {/* Mandatory or Voluntary Third-Party Guarantor Section */}
              <div className="form-group full" style={{
                border: Number(formData.loanAmount) >= 1500000 ? '1px solid rgba(16, 185, 129, 0.45)' : '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '18px',
                background: Number(formData.loanAmount) >= 1500000 ? 'rgba(6, 78, 59, 0.15)' : 'rgba(15, 23, 42, 0.4)',
                boxShadow: Number(formData.loanAmount) >= 1500000 ? '0 4px 16px rgba(16, 185, 129, 0.1)' : 'none',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <h4 style={{ fontSize: '0.98rem', color: Number(formData.loanAmount) >= 1500000 ? '#34d399' : '#93c5fd', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ShieldCheckIcon size={16} />
                      <span>{Number(formData.loanAmount) >= 1500000 ? '🛡️ Mandatory Guarantor Endorsement (Facilities ≥ LKR 1.5M)' : '🛡️ Registered Guarantor Security (Optional)'}</span>
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>
                      {Number(formData.loanAmount) >= 1500000 
                        ? 'Institutional credit risk policy requires at least one permanent salaried or executive guarantor for credit facilities exceeding LKR 1,500,000.'
                        : 'You may voluntarily endorse a guarantor to improve credit rating and accelerate underwriter approval.'}
                    </p>
                  </div>
                  <span style={{ fontSize: '0.72rem', background: Number(formData.loanAmount) >= 1500000 ? 'rgba(16, 185, 129, 0.25)' : 'rgba(59, 130, 246, 0.2)', color: Number(formData.loanAmount) >= 1500000 ? '#6ee7b7' : '#93c5fd', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                    {Number(formData.loanAmount) >= 1500000 ? 'CBSL High-Value Mandate' : 'Credit Enhancement Tier'}
                  </span>
                </div>

                {Number(formData.loanAmount) < 1500000 && (
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem', color: '#cbd5e1' }}>
                      <input 
                        type="checkbox" 
                        name="hasGuarantor" 
                        checked={formData.hasGuarantor} 
                        onChange={handleChange}
                        style={{ accentColor: 'var(--emerald-500)', width: '16px', height: '16px' }}
                      />
                      <span>Endorse a third-party guarantor for this application</span>
                    </label>
                  </div>
                )}

                {(Number(formData.loanAmount) >= 1500000 || formData.hasGuarantor) && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px', marginTop: '10px' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                        Guarantor Full Legal Name (as per NIC) *
                      </label>
                      <input 
                        type="text" 
                        name="guarantorName" 
                        placeholder="e.g. Jayantha Jayasinghe" 
                        value={formData.guarantorName} 
                        onChange={handleChange}
                        required={Number(formData.loanAmount) >= 1500000 || formData.hasGuarantor}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                        Guarantor National Identity Card (NIC) *
                      </label>
                      <input 
                        type="text" 
                        name="guarantorNic" 
                        placeholder="e.g. 197512345678 or 751234567V" 
                        value={formData.guarantorNic} 
                        onChange={handleChange}
                        required={Number(formData.loanAmount) >= 1500000 || formData.hasGuarantor}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                        Relationship to Primary Borrower *
                      </label>
                      <select name="guarantorRelationship" value={formData.guarantorRelationship} onChange={handleChange}>
                        <option value="Parent">Parent (Father / Mother)</option>
                        <option value="Spouse">Spouse (Husband / Wife)</option>
                        <option value="Brother">Brother</option>
                        <option value="Sister">Sister</option>
                        <option value="Relative">Relative (Uncle / Aunt)</option>
                        <option value="Business Partner">Business Partner</option>
                        <option value="Colleague">Corporate Colleague</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                        Guarantor Employer / Corporate Institution *
                      </label>
                      <input 
                        type="text" 
                        name="guarantorEmployer" 
                        placeholder="e.g. State Pharmaceuticals Corp / Commercial Bank" 
                        value={formData.guarantorEmployer} 
                        onChange={handleChange}
                        required={Number(formData.loanAmount) >= 1500000 || formData.hasGuarantor}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                        Guarantor Certified Monthly Remuneration (LKR) *
                      </label>
                      <input 
                        type="number" 
                        name="guarantorIncome" 
                        step="10000" 
                        value={formData.guarantorIncome} 
                        onChange={handleChange}
                        required={Number(formData.loanAmount) >= 1500000 || formData.hasGuarantor}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                        Guarantor Contact Mobile Number
                      </label>
                      <input 
                        type="tel" 
                        name="guarantorPhone" 
                        placeholder="e.g. 071 223 3445" 
                        value={formData.guarantorPhone} 
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                )}
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
                  {(Number(formData.loanAmount) >= 1500000 || formData.hasGuarantor) && (
                    <div style={{ gridColumn: 'span 2', color: '#34d399', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px', marginTop: '4px' }}>
                      Guarantor: <strong>{formData.guarantorName || 'Pending'} ({formData.guarantorRelationship} • {formData.guarantorEmployer || 'Corporate'})</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Statutory CRIB Regulatory Declaration */}
              <div className="form-group full" style={{ marginTop: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', fontSize: '0.84rem', color: 'var(--text-main)', background: 'rgba(255, 255, 255, 0.03)', padding: '12px 14px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                  <input 
                    type="checkbox" 
                    required 
                    style={{ width: '18px', height: '18px', marginTop: '2px', cursor: 'pointer', accentColor: 'var(--emerald-500)' }} 
                  />
                  <span>
                    I hereby certify that all information submitted is accurate and true. I authorize <strong>Apex Commercial Bank PLC</strong> to conduct statutory credit assessments through the <strong>Credit Information Bureau of Sri Lanka (CRIB)</strong> and CBSL regulatory databases. *
                  </span>
                </label>
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
