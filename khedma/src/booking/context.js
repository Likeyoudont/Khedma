export function workerPath(id, service = '', location = '') {
  const params = new URLSearchParams()
  if (service) params.set('service', service)
  if (location) params.set('location', location)
  return `/worker/${id}${params.size ? `?${params}` : ''}`
}
