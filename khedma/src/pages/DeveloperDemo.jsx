import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { Link, Navigate, NavLink, Route, Routes, useParams, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AuthContext } from '../auth/useAuth'
import { DemoContext, useDemo } from '../demo/DemoContext'
import { createDemoStore } from '../demo/store'
import Dashboard from './Dashboard'
import Account from './Account'
import Job from './Job'
import Search from './Search'
import WorkerProfile from './WorkerProfile'
import Guide from './Guide'
import { clearDrafts } from '../account/drafts'
import { translatedError } from '../api/errors'

export default function DeveloperDemo() {
  const [store] = useState(() => {
    let storage = null
    try { storage = window.sessionStorage } catch { /* Private browsers may block storage. */ }
    return createDemoStore(() => Date.now(), storage)
  })
  return <Routes>
    <Route index element={<DemoLanding />} />
    <Route path=":role/*" element={<DemoSession store={store} />} />
  </Routes>
}
function DemoLanding() {
  const { t } = useTranslation()
  return <div className="container py-5 demo-landing">
    <span className="section-kicker">{t('demo.label')}</span>
    <h1 className="mt-2">{t('demo.title')}</h1>
    <p className="small-muted">{t('demo.description')}</p>
    <Link to="/developer/worker/practice" className="btn btn-primary mb-4">{t('practice.open')}</Link>
    <div className="demo-role-grid">
      {['worker', 'client'].map(role => <Link key={role} to={`/developer/${role}`} className="dashboard-card demo-role-card">
        <span aria-hidden="true" className="demo-role-icon">{role === 'worker' ? '🛠️' : '🏠'}</span>
        <h2>{t(`demo.${role}`)}</h2><p>{t(`demo.${role}Features`)}</p><strong>{t('demo.open')} →</strong>
      </Link>)}
    </div>
  </div>
}
function DemoSession({ store }) {
  const { role } = useParams()
  if (!['worker', 'client'].includes(role)) return <Navigate to="/developer" replace />
  return <DemoWorkspace key={role} role={role} store={store} />
}
function DemoWorkspace({ role, store }) {
  const { t } = useTranslation()
  const location = useLocation()
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot)
  const api = useMemo(() => store.forRole(role), [store, role])
  const base = `/developer/${role}`
  const practiceJob = snapshot.bookings.find(job => job.practice)
  const canPracticeReply = snapshot.messages.some(message => message.bookingId === practiceJob?.id && message.senderRole === 'worker' && message.id > (practiceJob?.practiceReplyThrough || 0))
  const demo = useMemo(() => ({ base, api, epoch: snapshot.epoch, role,
    messageRevision: snapshot.messages.at(-1)?.id, practiceJob,
    canPracticeReply,
    startPractice: store.startPractice, practiceClient: store.practiceClient, practicePayment: store.practicePayment, download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(api.exportData(), null, 2)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url; link.download = `khedma-demo-${role}.json`; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } }), [base, api, role, snapshot.epoch, snapshot.messages, practiceJob, canPracticeReply, store])
  const auth = { user: snapshot.users[role], loading: false, error: '', authenticate: async (action, payload) => {
    try { return (await api.authRequest(action, payload)).user }
    catch (error) { throw translatedError(error, t) }
  }, logout: async () => {} }
  return <DemoContext.Provider value={demo}><AuthContext.Provider value={auth}>
    <div className="container pt-4">
      <section className="demo-banner" aria-label={t('demo.label')}>
        <div><h1 className="h5 mb-1">{t(`demo.${role}`)}</h1><details className="demo-explanation"><summary>{t('flow.demoDetails')}</summary><p>{t('demo.notice')}</p><p className="small-muted mb-0">{t('demo.passwordHint')}</p></details></div>
        <div className="demo-banner-actions"><Link className="btn btn-outline-primary" to={`/developer/${role === 'worker' ? 'client' : 'worker'}`}>{t(`demo.${role === 'worker' ? 'client' : 'worker'}`)}</Link><button className="btn btn-outline-secondary" onClick={() => { clearDrafts('/developer/'); store.reset() }}>{t('demo.reset')}</button></div>
      </section>
      {role === 'worker' && !location.pathname.includes('/job/') && !location.pathname.endsWith('/practice') && <section className="practice-entry"><div><strong>{t('practice.title')}</strong><p>{t('practice.entryHelp')}</p></div><Link className="btn btn-primary" to={`${base}/practice`}>{t(practiceJob ? 'practice.resume' : 'practice.open')}</Link></section>}
      <nav className="demo-tabs" aria-label={t('demo.navigation')}>
        <NavLink to={base} end>{t('dashboard.title')}</NavLink>
        <NavLink to={`${base}/search`}>{t(role === 'worker' ? 'demo.requests' : 'demo.findWorkers')}</NavLink>
        <NavLink to={`${base}/account`}>{t('settings.title')}</NavLink>
        {role === 'worker' && <NavLink to={`${base}/worker/1`}>{t('account.publicProfile')}</NavLink>}
        <NavLink to={`${base}/guide`}>{t('guide.title')}</NavLink>
      </nav>
    </div>
    <div key={snapshot.epoch}>
      <Routes>
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Navigate to={base} replace />} />
        <Route path="account" element={<Account />} />
        <Route path="search" element={<Search />} />
        <Route path="worker/:id" element={<WorkerProfile />} />
        <Route path="job/:id" element={<Job />} />
        <Route path="practice" element={<PracticeStart />} />
        <Route path="guide" element={<Guide />} />
        <Route path="forgot-password" element={<DemoRecovery />} />
        <Route path="*" element={<Navigate to={base} replace />} />
      </Routes>
    </div>
  </AuthContext.Provider></DemoContext.Provider>
}
function PracticeStart() {
  const { t } = useTranslation()
  const demo = useDemo()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const start = demo.startPractice
  const base = demo.base
  useEffect(() => {
    let active = true
    start({ description: t('practice.description'), opening: t('practice.opening') }).then(job => {
      if (active) navigate(`${base}/job/${job.id}`, { replace: true })
    }).catch(err => { if (active) setError(translatedError(err, t).message) })
    return () => { active = false }
  }, [start, base, navigate, t])
  return <div className="container py-5"><p role={error ? 'alert' : 'status'}>{error || t('common.loading')}</p>{error && <Link to={base}>{t('common.back')}</Link>}</div>
}
function DemoRecovery() {
  const { t } = useTranslation()
  return <div className="container py-5"><div className="dashboard-card"><h2>{t('recovery.forgot')}</h2><p>{t('demo.recovery')}</p></div></div>
}
