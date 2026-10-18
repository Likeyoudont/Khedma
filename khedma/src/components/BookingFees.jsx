import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDemo } from '../demo/DemoContext'
import { useAppApi } from '../demo/useAppApi'

export function FeeBreakdown({ quote, worker }) {
  const { t, i18n } = useTranslation()
  if (!quote) return <p className="fee-disclosure">{t('fees.disclosure')}</p>
  const amount = cents => new Intl.NumberFormat(i18n.language, { style: 'currency', currency: 'MAD' }).format(cents / 100)
  return <div className="fee-breakdown">
    {[[t('fees.base'), quote.baseCents], [t(worker ? 'fees.workerFee' : 'fees.clientFee'), quote.feeCents], [t(worker ? 'fees.workerNet' : 'fees.clientTotal'), worker ? quote.workerNetCents : quote.clientTotalCents]].map(([label, cents]) => <div key={label}><span>{label}</span><strong>{amount(cents)}</strong></div>)}
    <p>{t('fees.separate')}</p>
  </div>
}

export default function BookingFees({ job, worker, onChange, now }) {
  const { t } = useTranslation()
  const demo = useDemo()
  const { bookingRequest } = useAppApi()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (!job.fees?.required || !job.fees.ownPayment) return null
  const fees = job.fees
  const own = fees.ownPayment
  const expired = job.status === 'confirmed' && new Date(job.scheduledAt).getTime() <= now
  const canPay = job.status === 'confirmed' && own?.status === 'pending' && !expired
  async function pay(method) {
    if (busy) return
    setBusy(true); setError('')
    try {
      const updated = await bookingRequest(`/${job.id}/payments`, { method, ...(demo ? { simulate: true } : {}) })
      onChange(updated)
      const checkout = updated.fees.ownPayment?.checkout_url
      if (!demo && checkout) window.location.assign(checkout)
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }
  async function clientPayment() {
    if (busy) return
    setBusy(true); setError('')
    try { onChange(await demo.practicePayment(job.id)) }
    catch { setError(t('api.changed')) }
    finally { setBusy(false) }
  }
  return <section className="booking-fees" aria-labelledby="booking-fees-title">
    <h2 id="booking-fees-title">{t('fees.title')}</h2>
    <p>{t('fees.disclosure')}</p>
    <FeeBreakdown quote={fees.quote} worker={worker} />
    {own && <>
      <div className="fee-payment-status"><span>{t('fees.clientFee')}</span><strong>{t(`fees.status.${fees.clientStatus}`)}</strong></div>
      <div className="fee-payment-status"><span>{t('fees.workerFee')}</span><strong>{t(`fees.status.${fees.workerStatus}`)}</strong></div>
      {expired && own.status === 'pending' && <p role="alert" className="schedule-error">{t('booking.proposalExpired')}</p>}
      <p role="status">{t(fees.unlocked ? 'fees.unlocked' : 'fees.locked')}</p>
      {canPay && (demo || fees.checkoutReady) && <div className="fee-payment-actions">{['cashplus'].map(method => <button key={method} type="button" className="btn btn-primary" disabled={busy || (!demo && own.method && own.method !== method)} onClick={() => pay(method)}>{t(demo ? `fees.demo.${method}` : `fees.pay.${method}`)}</button>)}</div>}
      {canPay && !demo && !fees.checkoutReady && <p className="fee-setup-note">{t('fees.notReady')}</p>}
      {demo && worker && job.practice && job.status === 'confirmed' && !expired && fees.clientStatus === 'pending' && <button type="button" className="btn btn-outline-primary mt-2" disabled={busy} onClick={clientPayment}>{t('fees.demo.client')}</button>}
      {demo && <p className="small-muted">{t('fees.demo.notice')}</p>}
      {['refund_pending', 'refunded'].includes(own.status) && <p>{t('fees.refundHelp')}</p>}
    </>}
    {error && <p role="alert" className="text-danger">{error}</p>}
  </section>
}
