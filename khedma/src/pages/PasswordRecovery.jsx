import { demosEnabled } from '../config/deployment'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { authRequest } from '../api/auth'
import PasswordInput from '../components/PasswordInput'

export default function PasswordRecovery({ reset = false }) {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const [options, setOptions] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let active = true
    authRequest('recovery/options').then(data => { if (active) setOptions(data) }).catch(err => { if (active) setError(err.message) })
    return () => { active = false }
  }, [])
  async function submit(event) {
    event.preventDefault()
    if (busy) return
    const payload = Object.fromEntries(new FormData(event.currentTarget))
    if (reset) payload.token = params.get('token') || ''
    setBusy(true); setError('')
    try { await authRequest(reset ? 'recovery/reset' : 'recovery/send', payload); setSuccess(true) }
    catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }
  return <div className="auth-wrap"><div className="auth-card">
    <h1>{t(reset ? 'recovery.resetTitle' : 'recovery.forgot')}</h1>
    <p className="small-muted">{t('recovery.help')}</p>
    {error && <p role="alert" className="alert alert-danger">{error}</p>}
    {success ? <p role="status" className="alert alert-success">{t(reset ? 'recovery.done' : 'recovery.sent')}</p> : !options ? (error ? null : <p role="status">{t('common.loading')}</p>) : !options.email ? <p className="alert alert-info">{t('recovery.unavailable')}</p> : reset && !params.get('token') ? <p role="alert">{t('recovery.invalid')}</p> : <form className="form-grid" onSubmit={submit}>
      <label>{t('social.email')}<input name="email" type="email" autoComplete="email" required maxLength={255} defaultValue={params.get('email') || ''} className="form-control" /></label>
      {reset && <>
        <label htmlFor="reset-password">{t('account.newPassword')}<PasswordInput id="reset-password" name="password" autoComplete="new-password" minLength={8} maxLength={128} required /></label>
        <label htmlFor="reset-confirm">{t('account.confirmPassword')}<PasswordInput id="reset-confirm" name="password_confirmation" autoComplete="new-password" minLength={8} maxLength={128} required /></label>
      </>}
      <button className="btn btn-primary" disabled={busy}>{t(reset ? 'recovery.resetTitle' : 'recovery.send')}</button>
    </form>}
    <Link className="d-block mt-3" to="/login">{t('navbar.login')} →</Link>
    {demosEnabled && <Link className="d-block mt-3" to="/worker-preview">{t('preview.link')} →</Link>}
  </div></div>
}
