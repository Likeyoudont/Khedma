import { useAuth } from '../auth/useAuth'
import { useState, useRef } from 'react'
import { useParams, useSearchParams, useLocation } from 'react-router-dom'
import { resolveService, cityMatches } from '../search/matching'
import MovingDetails from '../components/MovingDetails'
import { Link } from '../demo/navigation'
import { useNavigate } from '../demo/useDemoNavigate'
import { useTranslation } from 'react-i18next'
import { useWorkers } from '../data/useWorkers'
import { useAppApi } from '../demo/useAppApi'
import WorkerLoadError from '../components/WorkerLoadError'

function WorkerProfile() {
  const { id } = useParams()
  const { search } = useLocation()
  return <Profile key={id + search} />
}

function Profile() {
  const { bookingRequest } = useAppApi()
  const { user } = useAuth()
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const route = useLocation()
  const returnTo = route.pathname + route.search
  const [chosenService, setChosenService] = useState('')
  const [requestOpen, setRequestOpen] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submitting = useRef(false)
  const requestToken = useRef(null)
  const { data: worker, loading, error: loadError, retry } = useWorkers(id)
  const isBa7it = (user?.role || 'ba7it') === 'ba7it'

  if (loadError) return <div className="container py-5"><WorkerLoadError retry={retry} /></div>
  if (loading) return <div className="container py-5" role="status">{t('common.loading')}</div>

  if (!worker) {
    return (
      <div className="container py-5 text-center">
        <p className="mb-3">{t('common.workerNotFound')}</p>
        <Link to="/search" className="btn btn-primary">
          {t('search.back')}
        </Link>
      </div>
    )
  }

  const searchedService = resolveService(params.get('service') || '', t).key
  const requestService = worker.specialties.includes(chosenService) ? chosenService : worker.specialties.includes(searchedService) ? searchedService : worker.specialties[0]
  const alternativeSearch = `/search?${new URLSearchParams({ service: searchedService || requestService, location: params.get('location') || worker.location, available: '1' })}`
  const travelCity = params.get('location') && !cityMatches(worker.location, params.get('location')) ? params.get('location') : ''

  const submitRequest = async (event) => {
    event.preventDefault()
    if (!isBa7it || submitting.current) return
    if (!user) { navigate('/login', { state: { from: returnTo } }); return }
    const fields = new FormData(event.currentTarget)
    const service = String(fields.get('service'))
    const location = String(fields.get('location') || '').trim()
    const description = String(fields.get('description') || '').trim()
    const movingDetails = service === 'moving' ? Object.fromEntries(['pickup', 'dropoff', 'items', 'access', 'vehicle', 'helpers'].map(key => [key, String(fields.get(`moving_${key}`) || '').trim()])) : null
    if (!worker.specialties.includes(service) || !location || !description) {
      setError(t('workerProfile.requestError'))
      return
    }
    submitting.current = true
    setBusy(true)
    setError('')
    try {
      const details = { workerId: worker.id, service, location, description, moving_details: movingDetails }
      const signature = JSON.stringify(details)
      if (requestToken.current?.signature !== signature) requestToken.current = { signature, token: crypto.randomUUID() }
      const request = await bookingRequest('', { ...details, client_token: requestToken.current.token })
      navigate(`/job/${request.id}`)
    } catch (err) {
      setError(err.message)
    } finally { submitting.current = false; setBusy(false) }
  }

  return (
    <div className="container worker-profile-page">
      <header className="profile-quick-summary">
        <div className="worker-avatar">{worker.name.charAt(0)}</div>
        <div><h1>{worker.name}</h1><span className="badge-pill badge-success matched-service">{t(`services.${requestService}.name`)}</span>
          <p className="small-muted mb-0">{worker.location} · ⭐ {worker.rating ?? '—'} ({worker.reviewCount}) · <a href="#worker-reviews">{t('workerProfile.reviews')}</a></p>
        </div>
      </header>
      <div className="worker-profile-layout">
        <div className="profile-panel">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
            <div>
              <h2 className="h4 mb-1">{t("workerProfile.about")}</h2>
              <div className="small-muted">
                ⭐ {worker.rating ?? '—'} ({worker.reviewCount}) · {worker.experience} {t('workerProfile.yearsExperience')}
              </div>
            </div>

            <span className={`badge-pill ${worker.available ? 'badge-success' : 'badge-warning'}`}>
              {worker.available ? t('workerProfile.available') : t('workerProfile.unavailable')}
            </span>
          </div>

          <div className="mb-3">
            {worker.specialties.map((specKey) => (
              <span key={specKey} className="badge-pill badge-dark me-2 mb-2">
                {specKey === 'other' && worker.otherWork ? `${t('services.other.name')} · ${worker.otherWork}` : t(`services.${specKey}.name`)}
              </span>
            ))}
          </div>

          {worker.specialties.includes('moving') && worker.transportVehicles?.length > 0 && <div className="mb-3">
            <strong>{t('register.transport')}</strong>
            <div>{worker.transportVehicles.map(vehicle => <span key={vehicle} className="badge-pill badge-dark me-2 mt-2">{t(`transportVehicles.${vehicle}`)}</span>)}</div>
          </div>}
          <div className="meta-row">
            <span className="label">{t('workerProfile.serviceArea')}</span>
            <strong>{worker.location}</strong>
          </div>

          <div className="meta-row">
            <span className="label">{t('workerProfile.travelsUpTo')}</span>
            <strong>{worker.serviceRadiusKm} km</strong>
          </div>

          <div className="mt-4">
            <h3 className="h5 mb-2">{t('workerProfile.about')}</h3>
            <p className="mb-4 small-muted">{worker.description}</p>
          </div>

          <div id="worker-reviews">
            <h3 className="h5 mb-3">
              {t('workerProfile.reviews')} ({worker.reviews.length})
            </h3>

            {worker.reviews.length === 0 ? (
              <p className="small-muted mb-0">{t('workerProfile.noReviews')}</p>
            ) : (
              <div className="d-grid gap-3">
                {worker.reviews.map((review) => (
                  <div key={review.id} className="border rounded-4 p-3 bg-light-subtle">
                    <div className="fw-semibold mb-1">
                      {review.author} · {'★'.repeat(review.rating)}
                    </div>
                    <p className="mb-0 small-muted">{review.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="profile-panel profile-booking">
          <span className="section-kicker">{t('workerProfile.bookingKicker')}</span>
          <div className="booking-worker-name">{worker.name} · {worker.location}</div>
          {travelCity && <p className="worker-travel-note">{t('search.travelProfile', { from: worker.location, to: travelCity })}</p>}
          <h2>{t('workerProfile.bookingTitle')}</h2>
          <p className="small-muted">{t('workerProfile.bookingIntro')}</p>
          {worker.connectionFeePercent > 0 && <p className="fee-disclosure">{t('fees.disclosure')}</p>}
          {!worker.available ? <div className="unavailable-notice" role="status">
            <h3 className="h5">{t('flow.busyTitle')}</h3><p>{t('flow.busyHelp')}</p>
            <Link to={alternativeSearch} className="btn btn-primary w-100">{t('flow.findAvailable')}</Link>
          </div> : isBa7it ? (
            <>
              {!user ? <div className="sign-in-request">
                <h3 className="h5">{t('auth.signInToRequest')}</h3><p>{t('auth.requestAccountHint')}</p>
                <Link to="/register" state={{ from: returnTo }} className="btn btn-primary w-100">{t('auth.createAccount')}</Link>
                <Link to="/login" state={{ from: returnTo }} className="btn btn-outline-primary w-100 mt-2">{t('auth.alreadyAccount')}</Link>
              </div> : <button type="button" className="btn btn-primary w-100 booking-cta" aria-expanded={requestOpen}
                aria-controls="service-request-form" onClick={() => setRequestOpen(!requestOpen)}>
                {t('workerProfile.requestService')} <span aria-hidden="true">↗</span>
              </button>}
              {(
                <form id="service-request-form" hidden={!requestOpen} className="request-form" onSubmit={submitRequest}>
                  <label htmlFor="request-service">{t('job.service')}</label>
                  <select id="request-service" name="service" className="form-select" required value={requestService} onChange={event => setChosenService(event.target.value)}>
                    {worker.specialties.map((service) => <option key={service} value={service}>{service === 'other' && worker.otherWork ? `${t('services.other.name')} · ${worker.otherWork}` : t(`services.${service}.name`)}</option>)}
                  </select>
                  <label htmlFor="request-location">{t('register.location')}</label>
                  <input id="request-location" name="location" defaultValue={params.get("location") || user?.city || ""} className="form-control" required maxLength={160} placeholder={t('home.locationPlaceholder')} />
                  {requestService === "moving" && <MovingDetails vehicles={worker.transportVehicles || []} />}
                  <p className="small-muted">{t("flow.travelHelp", { radius: worker.serviceRadiusKm })}</p>
                  <label htmlFor="request-description">{t('workerProfile.requestDetails')}</label>
                  <textarea id="request-description" name="description" className="form-control" rows={3} required maxLength={1500} />

                  {error && <p role="alert" className="text-danger">{error}</p>}
                  <button type="submit" disabled={busy || !worker.available} className="btn btn-primary w-100">{t('workerProfile.submitRequest')}</button>
                </form>
              )}
            </>
          ) : (
            <div className="alert alert-info">{t('workerProfile.ba7itRequired')} <Link to="/login">{t('navbar.login')} →</Link></div>
          )}
          <div className="booking-payment-note">
            <span aria-hidden="true">◇</span>
            <div><strong>{t('job.paymentTitle')}</strong><p>{t(worker.connectionFeePercent > 0 ? 'fees.separate' : 'workerProfile.paymentIntro')}</p></div>
          </div>
          <div className="mb-3">
            <div className="small-muted text-uppercase">{t('workerProfile.availability')}</div>
            <div className="fw-bold mt-1">{worker.available ? t('workerProfile.available') : t('workerProfile.unavailable')}</div>
          </div>

          <div className="meta-row">
            <span className="label">{t('register.location')}</span>
            <strong>{worker.location}</strong>
          </div>

        </aside>
      </div>
    </div>
  )
}

export default WorkerProfile
