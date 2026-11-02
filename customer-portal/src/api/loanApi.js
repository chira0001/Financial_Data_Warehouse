const BASE_URL = ''

export const loanApi = {
  async getProducts() {
    const res = await fetch(`${BASE_URL}/api/customer/loans/products`)
    if (!res.ok) {
      throw new Error('Failed to load credit products catalog from core database.')
    }
    const data = await res.json()
    return data.products || []
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

  async executeProcedure(payload, role = null) {
    const headers = { 'Content-Type': 'application/json' }
    if (role) headers['X-Database-Role'] = role
    const res = await fetch(`${BASE_URL}/api/customer/loans/adbms/execute-procedure`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(data.error || 'Procedure execution failed')
    }
    return data
  },

  async executeFunction(payload, role = null) {
    const headers = { 'Content-Type': 'application/json' }
    if (role) headers['X-Database-Role'] = role
    const res = await fetch(`${BASE_URL}/api/customer/loans/adbms/execute-function`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(data.error || 'Function execution failed')
    }
    return data
  },

  async getView(viewName, role = null) {
    const headers = {}
    if (role) headers['X-Database-Role'] = role
    const res = await fetch(`${BASE_URL}/api/customer/loans/adbms/views/${viewName}`, {
      headers,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(data.error || 'Failed to fetch view data')
    }
    return data
  },

  async getAuditLog(role = null) {
    const headers = {}
    if (role) headers['X-Database-Role'] = role
    const res = await fetch(`${BASE_URL}/api/customer/loans/adbms/audit-log`, {
      headers,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(data.error || 'Failed to fetch audit logs')
    }
    return data
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
