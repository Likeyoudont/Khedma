// The visitor's local timezone is used for input; the API receives an ISO timestamp.
export function visitTime({ month, day, time }, now = new Date()) {
  if (!month || !day || !/^\d{2}:\d{2}$/.test(time || '')) return { error: 'booking.dateIncomplete' }
  const year = now.getFullYear()
  const m = Number(month), d = Number(day)
  const [hour, minute] = time.split(':').map(Number)
  if (!Number.isInteger(m) || !Number.isInteger(d) || m < 1 || m > 12 || d < 1 || d > 31 || hour > 23 || minute > 59) return { error: 'booking.dateInvalid' }
  const date = new Date(year, m - 1, d, hour, minute)
  if (date.getFullYear() !== year || date.getMonth() !== m - 1 || date.getDate() !== d || date.getHours() !== hour || date.getMinutes() !== minute) return { error: 'booking.dateInvalid' }
  if (date <= now) return { error: 'booking.datePast' }
  return { scheduledAt: date.toISOString() }
}
