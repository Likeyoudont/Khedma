import { useEffect, useState } from 'react'
import { Link } from '../demo/navigation'
import { useTranslation } from 'react-i18next'
import { useAppApi } from '../demo/useAppApi'

export default function BookingActivity() {
  const { authRequest } = useAppApi()
  const { t, i18n } = useTranslation()
  const [data, setData] = useState({ unread: 0, items: [] })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(null)
  useEffect(() => {
    let active = true, running = false
    async function load() {
      if (running || document.hidden) return
      running = true
      try { const result = await authRequest('activity', undefined, { background: true }); if (active) { setData(result); setError('') } }
      catch (err) { if (active) setError(err.message) }
      finally { running = false }
    }
    load()
    const timer = setInterval(load, 15000)
    document.addEventListener('visibilitychange', load)
    return () => { active = false; clearInterval(timer); document.removeEventListener('visibilitychange', load) }
  }, [authRequest])
  async function read(id) {
    setBusy(id)
    try { await authRequest(`activity/${id}/read`, {}); setData(await authRequest('activity')); setError('') }
    catch (err) { setError(err.message) }
    finally { setBusy(null) }
  }
  return <section id="activity" className="dashboard-card mb-4">
    <h2 className="h5">{t('communication.activity')} <span className="badge bg-primary">{data.unread}</span></h2>
    {error && <p role="alert">{error}</p>}
    {!data.items.length && <p>{t('dashboard.noItems')}</p>}
    <ul className="list-group">{data.items.map(item => <li key={item.id} className="list-group-item">
      <Link to={`/job/${item.bookingId}`}>{item.sender} — {t(`communication.${item.kind}`)}</Link>
      <time className="d-block small-muted" dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString(i18n.language)}</time>
      {item.unread && <button className="btn btn-sm btn-outline-primary mt-2" disabled={busy !== null} onClick={() => read(item.id)}>{t('communication.read')}</button>}
    </li>)}</ul>
  </section>
}
