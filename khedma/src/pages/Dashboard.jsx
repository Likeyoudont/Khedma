import { useEffect, useState } from 'react'
import { Link } from '../demo/navigation'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/useAuth'
import BookingActivity from '../components/BookingActivity'
import { useAppApi } from '../demo/useAppApi'

function Dashboard() {
  const { bookingRequest } = useAppApi()
  const { user } = useAuth()
  const { t } = useTranslation()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState({ count: 0, foreground: true })
  useEffect(() => {
    let active = true
    const controller = new AbortController()
    bookingRequest('', undefined, { background: !refresh.foreground, signal: controller.signal }).then(data => { if (active) { setBookings(data); setError('') } })
      .catch(err => { if (active && err.name !== 'AbortError') setError(err.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false; controller.abort() }
  }, [user.id, refresh, bookingRequest])
  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) setRefresh(value => ({ count: value.count + 1, foreground: false }))
    }, 15000)
    return () => clearInterval(timer)
  }, [])
  return <div className="container py-5 dashboard-page">
    <div className="d-flex justify-content-between align-items-center mb-4">
      <div><h1>{t('dashboard.title')}</h1><Link to="/account">{t('account.title')}</Link></div>
      <button className="btn btn-outline-primary" disabled={loading} onClick={() => { setLoading(true); setError(''); setRefresh(value => ({ count: value.count + 1, foreground: true })) }}>{t('booking.refresh')}</button>
    </div>
    <BookingActivity />
    {loading ? <p role="status">{t('common.loading')}</p> : error ? <p role="alert">{error}</p> : <>
      <DashboardContent bookings={bookings} isWorker={user.role === 'mihaniy'} />
    </>}
  </div>
}
export function DashboardContent({ bookings, isWorker, preview = false, onPreview }) {
  const { t } = useTranslation()
  const sections = [
    ['dashboard.requests', bookings.filter(b => b.status === 'pending')],
    ['dashboard.acceptedJobs', bookings.filter(b => ['confirmed', 'in_progress'].includes(b.status))],
    ['dashboard.previousJobs', bookings.filter(b => ['completed', 'cancelled'].includes(b.status))],
  ]
  return <>
      {sections.map(([title, items]) => <section className="mb-4" key={title}>
        <h2 className="h5">{t(title)}</h2>
        {items.length === 0 ? <p className="small-muted">{t('dashboard.noItems')}</p> : <ul className="list-group">
          {items.map(item => {
            const next = item.status === 'pending' ? item.price == null ? isWorker ? 'reply' : 'waitingWorker' : isWorker ? 'waitingClient' : 'reviewOffer' : ['confirmed', 'in_progress'].includes(item.status) ? 'continueJob' : 'viewHistory'
            const content = <><strong>{t(`services.${item.service}.name`)}</strong><span>{isWorker ? item.clientName : item.workerName}{item.location ? ` · ${item.location}` : ''}{item.price == null ? '' : ` · ${item.price} DH`}</span><small className="dashboard-job-next">{t(`phoneUI.${next}`)} <span aria-hidden="true">↗</span></small></>
            return <li key={item.id} className="list-group-item d-flex justify-content-between align-items-center gap-2">
              {preview ? <button className="btn btn-link text-start dashboard-job-link" onClick={onPreview}>{content}</button> : <Link className="dashboard-job-link" to={`/job/${item.id}`}>{content}</Link>}
              <span className="badge-pill badge-dark">{t(`dashboard.status.${item.status}`)}</span>
            </li>
          })}
        </ul>}
      </section>)}
      <div className="dashboard-card dashboard-history">
        <h2 className="h5">{t('dashboard.history')}</h2>
        <p>{bookings.filter(b => b.status === 'completed').length} {t('dashboard.jobsCompleted')}</p>
        <p>{bookings.filter(b => b.status === 'cancelled').length} {t('dashboard.cancellations')}</p>
      </div>
  </>
}
export default Dashboard
