export function feeQuote(price, rateBps = 1000) {
  const value = Number(price)
  if (price === '' || price == null || !Number.isFinite(value) || value < 0 || value > 999999.99) return null
  const baseCents = Math.round(value * 100)
  const feeCents = Math.floor((baseCents * rateBps + 5000) / 10000)
  return { baseCents, feeCents, clientTotalCents: baseCents + feeCents, workerNetCents: baseCents - feeCents }
}

export function feeSummary(job, role) {
  const payments = job.feePayments || []
  const own = payments.find(item => item.role === role)
  return { required: !!job.feeRateBps, ratePercent: (job.feeRateBps || 1000) / 100,
    quote: feeQuote(job.price, job.feeRateBps || 1000), unlocked: !job.feeRateBps || payments.filter(item => item.status === 'paid').length === 2,
    checkoutReady: false, clientStatus: payments.find(item => item.role === 'client')?.status || 'not_due', workerStatus: payments.find(item => item.role === 'worker')?.status || 'not_due', ownPayment: own || null }
}
