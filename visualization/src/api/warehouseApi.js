async function request(path, options) {
  const response = await fetch(path, options)
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.detail || body.error || 'Warehouse API request failed')
  return body
}

export const warehouseApi = {
  health: () => request('/api/health'),
  overview: () => request('/api/warehouse/overview'),
  analytics: () => request('/api/warehouse/analytics'),
  transactionSummary: (search = '') => request(`/api/warehouse/transaction-summary?search=${encodeURIComponent(search)}`),
  loanSummary: () => request('/api/warehouse/loan-summary'),
  transactions: (search = '') => request(`/api/warehouse/transactions?search=${encodeURIComponent(search)}`),
  loans: () => request('/api/warehouse/loans'),
  quality: () => request('/api/warehouse/quality'),
  runQueryGroup: (groupId) => request(`/api/query-groups/${groupId}/run`, { method: 'POST' }),
  runPipeline: () => request('/api/pipeline/run', { method: 'POST' }),
}