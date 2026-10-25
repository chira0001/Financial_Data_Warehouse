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
    const res = await fetch(`${BASE_URL}/api/customer/loans/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(applicationData),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Loan application submission rejected by core banking server.')
    }
    return await res.json()
  },

  async lookup(query) {
    const res = await fetch(`${BASE_URL}/api/customer/loans/lookup/${encodeURIComponent(query)}`)
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `No credit facility or application registered under reference: ${query}`)
    }
    return await res.json()
  },

  async pay(paymentData) {
    const res = await fetch(`${BASE_URL}/api/customer/loans/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentData),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Payment transaction rejected by core ledger.')
    }
    return await res.json()
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

  async getExplainAnalyze() {
    const res = await fetch(`${BASE_URL}/api/customer/loans/adbms/explain-analyze`)
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData.error || 'Failed to fetch explain analyze plan')
    }
    return await res.json()
  },

  async getApplications() {
    try {
      const res = await fetch(`${BASE_URL}/api/customer/loans/applications`)
      if (!res.ok) throw new Error('Failed to fetch applications')
      return await res.json()
    } catch {
      return { applications: [] }
    }
  },
}
