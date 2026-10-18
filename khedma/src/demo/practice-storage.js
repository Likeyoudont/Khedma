const key = 'khedma-practice-v1'
const statuses = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled']

export function loadPractice(storage) {
  try {
    const value = storage?.getItem(key)
    if (!value || value.length > 150000) return null
    const data = JSON.parse(value)
    const job = data.job
    if (data.version !== 1 || !job?.practice || !Number.isSafeInteger(job.id) || job.id < 8 || job.workerId !== 1 || job.clientId !== 201 || job.service !== 'electricity' || !statuses.includes(job.status) || typeof job.description !== 'string' || job.description.length > 5000 || !Array.isArray(data.messages) || data.messages.length > 100) return null
    if (!data.messages.every(message => message.bookingId === job.id && Number.isSafeInteger(message.id) && ['worker', 'client'].includes(message.senderRole) && typeof message.body === 'string' && message.body.length <= 2000 && Array.isArray(message.readBy))) return null
    if (job.price != null && (!Number.isFinite(job.price) || job.price < 0 || job.price > 999999.99)) return null
    if (job.feeRateBps !== 1000) return null
    if (job.feeRateBps && (!Array.isArray(job.feePayments) || job.feePayments.length > 2 || !job.feePayments.every(item => ['client', 'worker'].includes(item.role) && Number.isSafeInteger(item.amount_cents) && item.amount_cents >= 0 && typeof item.reference === 'string' && ['pending', 'paid', 'void', 'refund_pending', 'refunded'].includes(item.status)))) return null
    return data
  } catch { return null }
}

export function savePractice(storage, state) {
  if (!storage) return
  try {
    const job = state.bookings.find(item => item.practice)
    if (!job) { storage.removeItem(key); return }
    // Only the fake practice job and its thread persist in this tab. No profiles or passwords.
    storage.setItem(key, JSON.stringify({ version: 1, job, messages: state.messages.filter(item => item.bookingId === job.id).slice(-100) }))
  } catch { /* The demo remains usable if browser storage is unavailable. */ }
}
