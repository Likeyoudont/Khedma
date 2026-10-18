import { useEffect, useRef, useState, useCallback } from 'react'
import { Link } from '../demo/navigation'
import { useNavigate } from '../demo/useDemoNavigate'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/useAuth'
import PasswordInput from '../components/PasswordInput'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { usePreferences } from '../preferences/usePreferences'
import TransportOptions from '../components/TransportOptions'
import RadiusInput from '../components/RadiusInput'
import ServiceAreaMap from '../components/ServiceAreaMap'
import ServicePicker from '../components/ServicePicker'
import PhoneInput from '../components/PhoneInput'
import { useAppApi } from '../demo/useAppApi'
import { useDemo } from '../demo/DemoContext'
import { readDraft, rememberDraft, forgetDraft } from '../account/drafts'

export default function Account() {
  const { authRequest } = useAppApi()
  const demo = useDemo()
  const { user, authenticate, logout } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { preferences, update } = usePreferences()
  const [details, setDetails] = useState(null)
  const [detailsError, setDetailsError] = useState(false)
  const draftKey = `${demo ? `${demo.base}:${demo.epoch}` : 'live'}:${user.id}`
  const [draft] = useState(() => readDraft(draftKey))
  const [dirty, setDirty] = useState(!!draft)
  const profileForm = useRef(null)
  const noticeRef = useRef(null)
  useEffect(() => {
    let active = true
    authRequest('settings').then(data => { if (active) setDetails(data) })
      .catch(() => { if (active) setDetailsError(true) })
    return () => { active = false }
  }, [authRequest])
  useEffect(() => {
    if (!dirty) return undefined
    const warn = event => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  const worker = user.role === 'mihaniy'
  const profile = user.worker_profile
  const [specialties, setSpecialties] = useState(draft?.specialties || profile?.service_categories?.map(service => service.key) || [])
  const [vehicles, setVehicles] = useState(draft?.transport_vehicles ?? profile?.transport_vehicles ?? [])
  const [city, setCity] = useState(draft?.city ?? user.city ?? '')
  const [radius, setRadius] = useState(draft?.service_radius_km ?? profile?.service_radius_km ?? 10)
  const [centre, setCentre] = useState(draft ? draft.centre ?? null : profile?.latitude != null && profile?.longitude != null ? [Number(profile.latitude), Number(profile.longitude)] : null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  useEffect(() => { if (error || success) noticeRef.current?.focus() }, [error, success])

  const keepDraft = useCallback(() => {
    if (!profileForm.current) return
    rememberDraft(draftKey, { ...Object.fromEntries(new FormData(profileForm.current)), city, specialties, transport_vehicles: vehicles, service_radius_km: radius, centre, available: profileForm.current.elements.available?.checked })
  }, [draftKey, city, specialties, vehicles, radius, centre])
  useEffect(() => {
    if (dirty) keepDraft()
  }, [dirty, keepDraft])

  async function save(event, action) {
    event.preventDefault()
    if (busy) return
    const form = event.currentTarget
    const payload = Object.fromEntries(new FormData(form))
    if (action === 'profile' && worker) {
      payload.transport_vehicles = specialties.includes('moving') ? vehicles : []
      payload.latitude = centre?.[0] ?? null
      payload.longitude = centre?.[1] ?? null
      payload.other_work = specialties.includes('other') ? (payload.other_work || '').trim() : null
      payload.specialties = specialties
      payload.available = form.elements.available.checked
    }
    setBusy(true); setError(''); setSuccess('')
    try {
      await authenticate(action, payload)
      if (action === 'password') form.reset()
      if (action === 'profile') { forgetDraft(draftKey); setDirty(false) }
      if (action === 'profile') form.elements.current_password.value = ''
      setSuccess(t(action === 'password' ? 'account.passwordSaved' : 'account.saved'))
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }
  async function signOut() {
    if (busy) return
    setBusy(true); setError('')
    try { await logout(); forgetDraft(draftKey); setDirty(false); navigate('/login', { replace: true }) }
    catch (err) { setError(err.message); setBusy(false) }
  }
  const sections = ['personal', ...(worker ? ['work'] : []), 'security', 'preferences', 'privacy', 'help']
  return <div className="container py-5 settings-page">
    <div className="settings-heading"><span className="section-kicker">Khedma</span><h1>{t('settings.title')}</h1><p className="small-muted">{t('settings.intro')}</p></div>
    <div className="settings-layout">
    <nav className="settings-navigation" aria-label={t('settings.navigation')}>
      <div className="settings-person"><span className="settings-avatar" aria-hidden="true">{user.name.slice(0, 1).toUpperCase()}</span><strong>{user.name}</strong></div>
      {sections.map((section, index) => <a key={section} href={`#settings-${section}`} onClick={() => { const element = document.getElementById(`settings-${section}`); if (element?.tagName === "DETAILS") element.open = true }}><span className="settings-nav-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>{t(`settings.${section}`)}</a>)}
      <Link to="/dashboard">{t('dashboard.title')} →</Link>
      <button type="button" className="btn btn-outline-danger mt-2" disabled={busy} onClick={signOut}>{t(demo ? 'flow.leaveDemo' : 'auth.logout')}</button>
    </nav>
    <div className="settings-content">

    <p className="small-muted">{t(`roles.${user.role}`)}{user.email ? ` · ${user.email}` : ''}</p>
    <Link to="/dashboard" className="back-link">{t('dashboard.title')} →</Link>
    {(error || success) && <p ref={noticeRef} tabIndex={-1} className={`alert ${error ? 'alert-danger' : 'alert-success'} mt-3`} role={error ? 'alert' : 'status'}>{error || success}</p>}
    <form ref={profileForm} className="form-grid mt-4 profile-settings-form" onInvalidCapture={event => { const detail = event.target.closest("details"); if (detail) detail.open = true }} onChange={() => { setDirty(true); setSuccess(''); keepDraft() }} onSubmit={event => save(event, 'profile')}>
      <fieldset disabled={busy} className="form-grid">
        <details open className="settings-card form-grid settings-edit-section" id="settings-personal"><summary>{t('settings.personal')}</summary><div className="form-grid mt-3">
        <label htmlFor="account-name">{t('register.name')}<input id="account-name" name="name" autoComplete="name" defaultValue={draft?.name ?? user.name} required maxLength={255} className="form-control" /></label>
        <label htmlFor="account-city">{t('register.location')}<input id="account-city" name="city" value={city} onChange={event => { setCity(event.target.value); setCentre(null) }} required maxLength={255} className="form-control" /></label>
        <div><label htmlFor="account-phone">{t('register.phone')}</label><PhoneInput id="account-phone" defaultValue={draft?.phone ?? user.phone ?? ''} /></div>
        <p className="small-muted mb-0">{t('account.phoneHelp')}</p>
        <label htmlFor="account-current-password">{t('account.currentPassword')}<PasswordInput id="account-current-password" name="current_password" autoComplete="current-password" className="form-control" /></label>
        </div></details>
        {worker && <details className="settings-card form-grid settings-edit-section" id="settings-work">
          <summary>{t('account.workerProfile')}</summary><div className="form-grid mt-3">
          <label htmlFor="account-description">{t('register.description')}<textarea id="account-description" name="description" defaultValue={draft?.description ?? profile?.description ?? ''} required maxLength={5000} rows={4} className="form-control" /></label>
          <label htmlFor="account-experience">{t('register.experience')}<input id="account-experience" name="experience_years" type="number" min={0} max={80} required defaultValue={draft?.experience_years ?? profile?.experience_years ?? 0} className="form-control" /></label>
          <ServicePicker value={specialties} onChange={value => { setDirty(true); setSpecialties(value) }} />
          {specialties.includes('other') && <label htmlFor="account-other-work">{t('register.otherWork')}<input id="account-other-work" name="other_work" type="text" defaultValue={draft?.other_work ?? profile?.other_work ?? ''} maxLength={255} placeholder={t('register.otherWorkPlaceholder')} required className="form-control" /></label>}
          {specialties.includes('moving') && <TransportOptions value={vehicles} onChange={setVehicles} />}
          <RadiusInput id="account-radius" value={radius} onChange={value => { setDirty(true); setRadius(value) }} />
          <ServiceAreaMap city={city} radius={radius} centre={centre} onCentreChange={value => { setDirty(true); setCentre(value) }} />
          <label className="checkbox-chip"><input name="available" type="checkbox" defaultChecked={draft?.available ?? profile?.available ?? false} />{t('register.available')}</label>
          <p className="small-muted">{t('account.availabilityHelp')}</p>
        </div></details>}
        <div className="settings-save-row"><span className="small-muted" role="status">{t(dirty ? 'flow.draftKept' : 'settings.upToDate')}</span>
        <button className="btn btn-primary" type="submit">{busy ? t('common.loading') : t('account.save')}</button></div>
      </fieldset>
    </form>
    {worker && profile && <Link to={`/worker/${profile.id}`} className="btn btn-outline-primary mt-3">{t('account.publicProfile')}</Link>}
    <section className="settings-card mt-4" id="settings-security">
    <h2>{t('settings.security')}</h2>
    {details?.providers.map(provider => <p key={provider}>{t('settings.connected', { provider: provider === 'google' ? 'Google' : 'Apple' })} <a href={provider === 'google' ? 'https://myaccount.google.com/security' : 'https://account.apple.com'} target="_blank" rel="noreferrer">{t('settings.manageProvider')} ↗</a></p>)}
    <p className="small-muted">{t('account.passwordHelp')}</p>
    {detailsError ? <p role="alert">{t('common.loadError')}</p> : !details ? <p role="status">{t('common.loading')}</p> : details.password_available && <form className="form-grid" onSubmit={event => { if (event.currentTarget.elements.password.value !== event.currentTarget.elements.password_confirmation.value) { event.preventDefault(); setError(t('settings.passwordMismatch')); return } save(event, 'password') }}>
      <fieldset disabled={busy} className="form-grid">
        <label htmlFor="password-current">{t('account.currentPassword')}<PasswordInput id="password-current" name="current_password" autoComplete="current-password" required maxLength={128} className="form-control" /></label>
        <label htmlFor="password-new">{t('account.newPassword')}<PasswordInput id="password-new" name="password" autoComplete="new-password" required minLength={8} maxLength={128} className="form-control" /></label>
        <label htmlFor="password-confirm">{t('account.confirmPassword')}<PasswordInput id="password-confirm" name="password_confirmation" autoComplete="new-password" required minLength={8} maxLength={128} className="form-control" /></label>
        <button type="submit" className="btn btn-outline-primary">{t('account.changePassword')}</button>
      </fieldset>
    </form>}
    </section>
    <section className="settings-card mt-4 form-grid" id="settings-preferences">
      <h2>{t('settings.preferences')}</h2><p className="small-muted">{t('settings.browserPreferences')}</p>
      <div className="settings-control-row"><span>{t('common.language')}</span><LanguageSwitcher /></div>
      {['reduceMotion', 'largeText'].map(name => <label className="settings-control-row" key={name}><span>{t(`settings.${name}`)}</span><input className="form-check-input" type="checkbox" checked={preferences[name]} onChange={event => { try { update(name, event.target.checked) } catch { setError(t('settings.storageError')) } }} /></label>)}
    </section>
    <section className="settings-card mt-4" id="settings-privacy">
      <h2>{t('settings.privacy')}</h2>
      <dl className="settings-privacy-list"><dt>{t('settings.publicInfo')}</dt><dd>{t('settings.publicInfoText')}</dd><dt>{t('settings.contactInfo')}</dt><dd>{t('settings.contactInfoText')}</dd><dt>{t('settings.bookingInfo')}</dt><dd>{t('settings.bookingInfoText')}</dd></dl>
      {demo ? <button type="button" className="btn btn-outline-primary" onClick={demo.download}>{t('settings.download')}</button> : <a href="/api/auth/export" className="btn btn-outline-primary">{t('settings.download')}</a>}<p className="small-muted mt-2">{t('settings.downloadHelp')}</p>
    </section>
    <section className="settings-card mt-4" id="settings-help">
      <h2>{t('settings.help')}</h2>
      <details><summary>{t('settings.loginQuestion')}</summary><p>{t('settings.loginAnswer')}</p></details>
      <details><summary>{t('settings.requestsQuestion')}</summary><p>{t('settings.requestsAnswer')}</p></details>
      <details><summary>{t('settings.saveQuestion')}</summary><p>{t('settings.saveAnswer')}</p></details>
      <Link to="/guide" className="btn btn-outline-primary mt-3">{t('guide.title')}</Link>
      <Link to="/forgot-password" className="back-link d-block mt-3">{t('recovery.forgot')}</Link>
      <Link to="/#faq" className="back-link d-inline-block mt-3">{t('home.faqTitle')} →</Link>
    </section>
  </div></div></div>
}
