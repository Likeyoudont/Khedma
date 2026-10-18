import { useAuth } from '../auth/useAuth'
import { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import RadiusInput from '../components/RadiusInput'
import ServiceAreaMap from '../components/ServiceAreaMap'
import TransportOptions from '../components/TransportOptions'
import PasswordInput from '../components/PasswordInput'
import SocialSignIn from '../components/SocialSignIn'
import PreviewNotice from '../components/PreviewNotice'
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import ServicePicker from '../components/ServicePicker'
import PhoneInput from '../components/PhoneInput'

function Register() {
  const { t } = useTranslation()
  const location = useLocation()
  const [params] = useSearchParams()
  const isSocial = params.get('social') === '1'
  const [socialProfile, setSocialProfile] = useState(null)
  const [city, setCity] = useState('')
  const [radius, setRadius] = useState('2')
  const [centre, setCentre] = useState(null)
  const [contactMode, setContactMode] = useState('phone')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [vehicles, setVehicles] = useState([])
  const [userType, setUserType] = useState(() => params.get('role') === 'worker' ? 'mihaniy' : 'ba7it')
  const [selectedSpecialties, setSelectedSpecialties] = useState([])
  const navigate = useNavigate()
  const { authenticate } = useAuth()
  const [step, setStep] = useState(0)
  const previousStep = useRef(0)
  const formRef = useRef(null)
  const [error, setError] = useState('')
  const [errorCode, setErrorCode] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (previousStep.current === step) return undefined
    previousStep.current = step
    const frame = requestAnimationFrame(() => {
      if (document.activeElement?.getAttribute('aria-invalid') === 'true') return
      formRef.current?.closest('.auth-card')?.querySelector(step ? '.signup-progress' : 'h1')?.scrollIntoView({ block: 'start', behavior: 'instant' })
    })
    return () => cancelAnimationFrame(frame)
  }, [step])

  useEffect(() => {
    if (!isSocial) return undefined
    const controller = new AbortController()
    fetch('/api/auth/social/pending', { headers: { Accept: 'application/json' }, signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error(t('social.failed')); return response.json() })
      .then(profile => { setSocialProfile(profile); setUserType(profile.role) })
      .catch(err => { if (err.name !== 'AbortError') setError(err.message) })
    return () => controller.abort()
  }, [isSocial, t])

  const lastStep = userType === 'mihaniy' ? 2 : 1
  function explainField(field) {
    setErrorCode('')
    const stage = field.closest('[data-step]')
    if (stage) setStep(Number(stage.dataset.step))
    const detail = field.closest('details')
    if (detail) detail.open = true
    const label = field.labels?.[0]?.textContent.trim() || t('flow.thisField')
    setError(field.validity.customError ? field.validationMessage : t(field.validity.valueMissing ? 'flow.fieldRequired' : field.validity.tooShort ? 'flow.passwordLength' : field.type === 'email' ? 'flow.emailInvalid' : 'flow.fieldInvalid', { field: label }))
    requestAnimationFrame(() => { field.setAttribute('aria-invalid', 'true'); field.focus(); field.scrollIntoView({ block: 'center', behavior: 'auto' }) })
  }
  function nextStep() {
    setErrorCode('')
    const stage = formRef.current.querySelector(`[data-step="${step}"]`)
    const invalid = [...stage.querySelectorAll('input, textarea, select')].find(field => !field.disabled && !field.checkValidity())
    if (invalid) { explainField(invalid); return }
    if (userType === 'mihaniy' && step === 1 && (!selectedSpecialties.length || (selectedSpecialties.includes('moving') && !vehicles.length))) {
      setError(t(!selectedSpecialties.length ? 'flow.chooseService' : 'flow.chooseVehicle')); return
    }
    setError(''); setStep(value => Math.min(lastStep, value + 1))
  }
  const handleSubmit = async (event) => {
    event.preventDefault()
    if (submitting) return
    if (step < lastStep) { nextStep(); return }
    const invalid = [...formRef.current.querySelectorAll('input, textarea, select')].find(field => !field.disabled && !field.checkValidity())
    if (invalid) { explainField(invalid); return }
    if (userType === 'mihaniy' && (!selectedSpecialties.length || (selectedSpecialties.includes('moving') && !vehicles.length))) { setStep(1); setError(t(!selectedSpecialties.length ? 'flow.chooseService' : 'flow.chooseVehicle')); return }
    const payload = { ...Object.fromEntries(new FormData(event.currentTarget)), role: userType }
    if (!isSocial) payload.identity = payload.phone || payload.email
    if (!payload.email) delete payload.email
    if (!payload.phone) delete payload.phone
    if (userType === 'mihaniy') {
      payload.transport_vehicles = selectedSpecialties.includes('moving') ? vehicles : []
      payload.other_work = selectedSpecialties.includes('other') ? (payload.other_work || '').trim() : null
      payload.specialties = selectedSpecialties
      payload.available = event.currentTarget.elements.available.checked
      payload.experience_years = payload.experience_years || 0
      payload.description = payload.description?.trim() || t('flow.workerDefault', { services: selectedSpecialties.map(key => t(`services.${key}.name`)).join(', ') })
    }
    setSubmitting(true)
    setError('')
    setErrorCode('')
    try {
      await authenticate(isSocial ? 'social/register' : 'register', payload)
      const destination = location.state?.from
      navigate(userType === 'ba7it' && typeof destination === 'string' && destination.startsWith('/') && !destination.startsWith('//') ? destination : '/dashboard', { replace: true })
    } catch (err) {
      setErrorCode(err.code || '')
      setError(err.message)
      const field = err.fields?.[0]
      if (field) { const input = formRef.current.querySelector(`[name="${field.split('.')[0]}"]`); const stage = input?.closest('[data-step]'); if (stage) setStep(Number(stage.dataset.step)); else if (['specialties', 'transport_vehicles', 'other_work'].includes(field.split('.')[0])) setStep(1) }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1 className="text-center mb-4">{t('register.title')}</h1>
        {location.state?.from && <p className="auth-return-notice" role="status">{t('auth.signInToContinue')}</p>}
        <PreviewNotice />

        <div className="auth-tabs mb-4">
          <button
            type="button"
            className={`auth-tab ${userType === 'ba7it' ? 'active' : ''}`}
            onClick={() => { setUserType('ba7it'); setStep(0); setError('') }}
          >
            {t('flow.needHelp')}
          </button>
          <button
            type="button"
            className={`auth-tab ${userType === 'mihaniy' ? 'active' : ''}`}
            onClick={() => { setUserType('mihaniy'); setStep(0); setError('') }}
          >
            {t('flow.offerWork')}
          </button>
        </div>

        {!isSocial && <SocialSignIn role={userType} />}
        {isSocial && <p className="small-muted">{t('social.completeProfile')}</p>}

        <div className="signup-progress" aria-label={t('flow.progress', { step: step + 1, total: lastStep + 1 })}>
          {Array.from({ length: lastStep + 1 }, (_, index) => <span key={index} className={index <= step ? 'active' : ''} aria-current={index === step ? 'step' : undefined}>{index + 1}</span>)}
          <p>{t(`flow.signupSteps.${step === 0 ? 'account' : userType === 'mihaniy' && step === 1 ? 'work' : 'area'}`)}</p>
        </div>
        <form ref={formRef} className="form-grid" noValidate onSubmit={handleSubmit} onInput={event => { if (event.target.checkValidity?.()) { event.target.removeAttribute('aria-invalid'); setError('') } }} onInvalidCapture={event => {
          const stage = event.target.closest('[data-step]'); if (stage) setStep(Number(stage.dataset.step))
          const detail = event.target.closest('details'); if (detail) detail.open = true
        }}>
          {error && <div className="alert alert-danger" role="alert">{error}{['duplicatePhone', 'duplicateEmail'].includes(errorCode) && <Link to="/login" state={location.state} className="d-block mt-2 fw-semibold">{t('register.loginLink')}</Link>}</div>}
          <section className="signup-stage form-grid" data-step="0" hidden={step !== 0}>
          <div>
            <label htmlFor="register-name" className="form-label mb-2">{t('register.name')}</label>
            <input key={socialProfile?.name || 'manual'} defaultValue={socialProfile?.name || ''} id="register-name" name="name" maxLength={255} autoComplete="name" type="text" className="form-control" required />
          </div>

          {!isSocial && <>
            <div className="contact-choice" role="group" aria-label={t('flow.contactChoice')}>
              {['phone', 'email'].map(mode => <button key={mode} type="button" aria-pressed={contactMode === mode} onClick={() => { setContactMode(mode); setError('') }}>{t(mode === 'phone' ? 'register.phone' : 'social.email')}</button>)}
            </div>
            <div hidden={contactMode !== 'phone'}>
              <label className="form-label mb-2" htmlFor="register-phone">{t('register.phone')}</label>
              <PhoneInput id="register-phone" className="form-control identity-input" value={phone} onChange={event => setPhone(event.target.value)} required={contactMode === 'phone'} disabled={contactMode !== 'phone'} />
            </div>
            <div hidden={contactMode !== 'email'}>
              <label className="form-label mb-2" htmlFor="register-email">{t('social.email')}</label>
              <input id="register-email" name="email" autoComplete="email" type="email" dir="ltr" placeholder="you@example.com" maxLength={255} className="form-control identity-input" value={email} onChange={event => setEmail(event.target.value)} required={contactMode === 'email'} disabled={contactMode !== 'email'} />
            </div>
            <div>
              <label htmlFor="register-password" className="form-label mb-2">{t('register.password')}</label>
              <PasswordInput id="register-password" name="password" aria-describedby="register-password-help" maxLength={128} minLength={8} autoComplete="new-password" type="password" className="form-control" required />
              <p id="register-password-help" className="phone-help">{t('flow.passwordLength')}</p>
            </div>
          </>}

          </section>
          <section className="signup-stage form-grid" data-step={lastStep} hidden={step !== lastStep}>
          <div>
            <label htmlFor="register-city" className="form-label mb-2">{t('register.location')}</label>
            <input id="register-city" name="city" maxLength={255} type="text" className="form-control" value={city} onChange={event => { setCity(event.target.value); setCentre(null) }} required />
          </div>

          {userType === 'mihaniy' && (
            <>
              <div>
                <RadiusInput id="register-radius" value={radius} onChange={setRadius} />
                <details className="signup-extra map-optional"><summary>{t('flow.optionalMap')}</summary><ServiceAreaMap city={city} radius={radius} centre={centre} onCentreChange={setCentre} /></details>
              </div>
              <label className="checkbox-chip">
                <input name="available" type="checkbox" defaultChecked />
                {t('register.available')}
              </label>
              <p className="small-muted">{t('flow.availabilityHelp')}</p>
            </>
          )}

          </section>
          {userType === 'mihaniy' && <section className="signup-stage form-grid" data-step="1" hidden={step !== 1}>
              <ServicePicker value={selectedSpecialties} onChange={setSelectedSpecialties} />
              {selectedSpecialties.includes('other') && <div>
                <label htmlFor="register-other-work" className="form-label mb-2">{t('register.otherWork')}</label>
                <input id="register-other-work" name="other_work" type="text" className="form-control" maxLength={255} placeholder={t('register.otherWorkPlaceholder')} required />
              </div>}
              {selectedSpecialties.includes('moving') && <TransportOptions value={vehicles} onChange={setVehicles} />}
              <details className="signup-extra"><summary>{t("flow.optionalWorkDetails")}</summary><div className="form-grid mt-3">
              <div>
                <label htmlFor="register-experience_years" className="form-label mb-2">{t('register.experience')}</label>
                <input id="register-experience_years" name="experience_years" type="number" min="0" max="80" defaultValue="0" className="form-control" />
              </div>

              <div>
                <label htmlFor="register-description" className="form-label mb-2">{t('register.description')}</label>
                <textarea id="register-description" name="description" maxLength={5000}
                  className="form-control"
                  rows="3"
                  placeholder={t('register.descriptionPlaceholder')}
                />
              </div>

              </div></details></section>}
          <div className="signup-actions">
          {step > 0 && <button type="button" className="btn btn-outline-primary" disabled={submitting} onClick={() => { setStep(value => value - 1); setError('') }}>{t('common.back')}</button>}
          {step < lastStep ? <button type="button" className="btn btn-primary" onClick={nextStep}>{t('flow.continue')}</button> : <button disabled={submitting || (isSocial && !socialProfile) || import.meta.env.VITE_STATIC_PREVIEW === 'true'} type="submit" className="btn btn-primary w-100">
            {t('register.submitButton')}
          </button>}
          </div>
        </form>

        <p className="text-center mb-0 mt-4 small-muted">
          {t('register.hasAccount')}{' '}
          <Link to="/login" state={location.state} className="text-primary fw-semibold">
            {t('register.loginLink')}
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Register
