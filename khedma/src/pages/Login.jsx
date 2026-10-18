import { useAuth } from '../auth/useAuth'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import PasswordInput from '../components/PasswordInput'
import SocialSignIn from '../components/SocialSignIn'
import PreviewNotice from '../components/PreviewNotice'
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'

function Login() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const { authenticate } = useAuth()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (submitting) return
    const payload = Object.fromEntries(new FormData(event.currentTarget))
    setSubmitting(true)
    setError('')
    try {
      await authenticate('login', payload)
      const destination = location.state?.from
      navigate(typeof destination === 'string' && destination.startsWith('/') && !destination.startsWith('//') ? destination : '/dashboard', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1 className="text-center mb-2">{t('login.title')}</h1>
        <p className="text-center small-muted">{t('auth.loginHelp')}</p>
        {location.state?.from && <p className="auth-return-notice" role="status">{t('auth.signInToContinue')}</p>}
        <Link to="/register" state={location.state} className="btn btn-outline-primary w-100 mb-4">{t('auth.createAccount')}</Link>
        <PreviewNotice />

        {params.get('social_error') && <p className="alert alert-warning" role="alert">{t(params.get('social_error') === 'existing' ? 'social.existing' : 'social.failed')}</p>}
        <SocialSignIn />

        <form className="form-grid" onSubmit={handleSubmit}>
          {error && <div className="alert alert-danger" role="alert">{error}</div>}
          <div>
            <label htmlFor="login-identity" className="form-label mb-2">{t('login.emailOrPhone')}</label>
            <input id="login-identity" name="identity" dir="ltr" maxLength={255} autoComplete="username" type="text" className="form-control" required />
            <p className="phone-help">{t('phone.loginHelp')}</p>
          </div>

          <div>
            <label htmlFor="login-password" className="form-label mb-2">{t('login.password')}</label>
            <PasswordInput id="login-password" name="password" maxLength={128} autoComplete="current-password" type="password" className="form-control" required />
          </div>

          <button disabled={submitting || import.meta.env.VITE_STATIC_PREVIEW === 'true'} type="submit" className="btn btn-primary w-100">
            {t('login.submitButton')}
          </button>
        </form>

        <Link to="/forgot-password" className="d-block text-center mt-3">{t('recovery.forgot')}</Link>
        <Link to="/guide" className="d-block text-center mt-3">{t('guide.title')}</Link>
        <p className="text-center mb-0 mt-4 small-muted">
          {t('login.noAccount')}{' '}
          <Link to="/register" state={location.state} className="text-primary fw-semibold">
            {t('login.registerLink')}
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Login
