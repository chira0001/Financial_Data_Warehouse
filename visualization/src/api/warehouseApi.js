async function request(path, options) {
  const response = await fetch(path, options)
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.detail || body.error || 'Warehouse API request failed')
  return body
}

export const warehouseApi = {
  overview: () => request('/api/warehouse/overview'),
  transactions: (search = '') => request(`/api/warehouse/transactions?search=${encodeURIComponent(search)}`),
  loans: () => request('/api/warehouse/loans'),
  quality: () => request('/api/warehouse/quality'),
  runPipeline: () => request('/api/pipeline/run', { method: 'POST' }),
}