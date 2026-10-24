// API client with seamless fallback to high-fidelity mock data if backend is offline
const BASE_URL = ''

const MOCK_PRODUCTS = [
  {
    id: 'personal',
    name: 'Personal Loan',
    tagline: 'Instant financial support for travel, emergency, wedding, or lifestyle upgrades.',
    minAmount: 50000,
    maxAmount: 2500000,
    rate: 12.5,
    minTenure: 12,
    maxTenure: 60,
    badge: 'Fast Approval',
    features: ['No guarantor needed up to LKR 500K', 'Instant 24-hr pre-approval', 'Flexible repayment schedule'],
    color: '#3b82f6',
    icon: 'user',
  },
  {
    id: 'housing',
    name: 'Housing & Home Loan',
    tagline: 'Build, purchase, or renovate your dream home with Sri Lanka’s lowest long-term rates.',
    minAmount: 500000,
    maxAmount: 25000000,
    rate: 8.1,
    minTenure: 36,
    maxTenure: 240,
    badge: 'Lowest Interest',
    features: ['Up to 20 years repayment tenure', 'Zero early settlement penalty', 'Free legal & valuation guidance'],
    color: '#10b981',
    icon: 'home',
  },
  {
    id: 'vehicle',
    name: 'Vehicle & Auto Loan',
    tagline: 'Drive your preferred car, van, commercial vehicle or EV with fast leasing solutions.',
    minAmount: 250000,
    maxAmount: 10000000,
    rate: 10.5,
    minTenure: 12,
    maxTenure: 84,
    badge: 'Popular',
    features: ['Up to 80% on-road financing', 'Speedy registration & approval', 'Special subsidized green rates for EVs'],
    color: '#8b5cf6',
    icon: 'car',
  },
  {
    id: 'education',
    name: 'Higher Education Loan',
    tagline: 'Empower your future with undergraduate & postgraduate funding locally and overseas.',
    minAmount: 100000,
    maxAmount: 5000000,
    rate: 6.87,
    minTenure: 12,
    maxTenure: 96,
    badge: 'Subsidized Rate',
    features: ['Grace period during course study', 'Covers tuition fees & living expenses', 'Convenient parent co-borrower terms'],
    color: '#06b6d4',
    icon: 'grad',
  },
  {
    id: 'business',
    name: 'Business & SME Facility',
    tagline: 'Fuel your enterprise growth, working capital, inventory, or machinery expansion.',
    minAmount: 500000,
    maxAmount: 15000000,
    rate: 11.0,
    minTenure: 12,
    maxTenure: 120,
    badge: 'Growth Booster',
    features: ['Collateral-free credit lines for SMEs', 'Cash-flow structured repayments', 'Dedicated relationship officer'],
    color: '#f59e0b',
    icon: 'briefcase',
  },
]

export const loanApi = {
  async getProducts() {
    try {
      const res = await fetch(`${BASE_URL}/api/customer/loans/products`)
      if (!res.ok) throw new Error('Backend unavailable')
      const data = await res.json()
      return data.products || MOCK_PRODUCTS
    } catch {
      return MOCK_PRODUCTS
    }
  },

  async apply(applicationData) {
    try {
      const res = await fetch(`${BASE_URL}/api/customer/loans/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(applicationData),
      })
      if (!res.ok) throw new Error('Application failed')
      return await res.json()
    } catch {
      // Local fallback simulator
      const mockId = Math.floor(Math.random() * 900) + 2100
      return {
        success: true,
        loanId: mockId,
        referenceNo: `LN-${new Date().getFullYear()}-${mockId}`,
        message: 'Loan facility pre-approved and submitted successfully (Simulated mode)',
        details: {
          loanId: mockId,
          customerName: applicationData.customerName || 'Valued Customer',
          loanType: applicationData.loanType,
          loanAmount: Number(applicationData.loanAmount),
          interestRate: Number(applicationData.interestRate),
          tenureMonths: Number(applicationData.tenureMonths),
          status: 'Active',
          startDate: new Date().toISOString().split('T')[0],
        },
      }
    }
  },

  async lookup(query) {
    try {
      const res = await fetch(`${BASE_URL}/api/customer/loans/lookup/${encodeURIComponent(query)}`)
      if (!res.ok) throw new Error('Not found')
      return await res.json()
    } catch {
      // Fallback mock loan data if offline
      const num = Number(String(query).replace(/\D/g, '')) || 1001
      return {
        loans: [
          {
            loan_id: num,
            customer_id: 1,
            account_id: 101,
            loan_type: 'Personal',
            loan_amount: 3233200.0,
            interest_rate: 6.79,
            loan_start_date: '2023-01-31',
            loan_end_date: '2026-01-30',
            loan_status: 'Active',
            total_paid: 1250000.0,
            balance_remaining: 1983200.0,
            progress_pct: 39,
          },
        ],
        payments: [
          {
            payment_id: 501,
            loan_id: num,
            payment_date: '2026-09-15',
            payment_amount: 45000.0,
            payment_method: 'Online Transfer',
            payment_status: 'Paid',
          },
          {
            payment_id: 489,
            loan_id: num,
            payment_date: '2026-08-15',
            payment_amount: 45000.0,
            payment_method: 'Standing Order',
            payment_status: 'Paid',
          },
          {
            payment_id: 472,
            loan_id: num,
            payment_date: '2026-07-15',
            payment_amount: 45000.0,
            payment_method: 'Debit Card',
            payment_status: 'Paid',
          },
        ],
      }
    }
  },

  async pay(paymentData) {
    try {
      const res = await fetch(`${BASE_URL}/api/customer/loans/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData),
      })
      if (!res.ok) throw new Error('Payment failed')
      return await res.json()
    } catch {
      const mockPayId = Math.floor(Math.random() * 900) + 3100
      return {
        success: true,
        paymentId: mockPayId,
        receiptNo: `RCP-${new Date().getFullYear()}-${mockPayId}`,
        message: 'Installment payment recorded successfully (Simulated mode)',
      }
    }
  },

  async executeProcedure(payload) {
    const res = await fetch(`${BASE_URL}/api/customer/loans/adbms/execute-procedure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData.error || 'Procedure execution failed')
    }
    return await res.json()
  },

  async executeFunction(payload) {
    const res = await fetch(`${BASE_URL}/api/customer/loans/adbms/execute-function`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData.error || 'Function execution failed')
    }
    return await res.json()
  },

  async getView(viewName) {
    const res = await fetch(`${BASE_URL}/api/customer/loans/adbms/views/${viewName}`)
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData.error || 'Failed to fetch view data')
    }
    return await res.json()
  },

  async getAuditLog() {
    const res = await fetch(`${BASE_URL}/api/customer/loans/adbms/audit-log`)
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData.error || 'Failed to fetch audit logs')
    }
    return await res.json()
  },
}
