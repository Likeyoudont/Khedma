import { useTranslation } from 'react-i18next'
import { Link } from '../demo/navigation'
import { workerPath } from '../booking/context'

function trackPointer(event) {
  const bounds = event.currentTarget.getBoundingClientRect()
  event.currentTarget.style.setProperty('--pointer-x', `${event.clientX - bounds.left}px`)
  event.currentTarget.style.setProperty('--pointer-y', `${event.clientY - bounds.top}px`)
}

function WorkerCard({ worker, selectedService = '', selectedLocation = '', travelTo = '' }) {
  const { t } = useTranslation()

  return (
    <div className="worker-card" onPointerMove={trackPointer}>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div className="d-flex align-items-center gap-3">
          <div className="worker-avatar">{worker.name.charAt(0)}</div>
          <div>
            <h3 className="h5 mb-0">{worker.name}</h3>
            <div className="small-muted mt-1">
              {worker.experience} {t('workerCard.yearsExperience')}
            </div>
          </div>
        </div>

        <span className={`badge-pill ${worker.available ? 'badge-success' : 'badge-warning'}`}>
          {worker.available ? t('workerCard.available') : t('workerCard.unavailable')}
        </span>
      </div>

      <div className="mb-3">
        {[...worker.specialties].sort((a, b) => Number(b === selectedService) - Number(a === selectedService)).map((specKey) => (
          <span key={specKey} className={`badge-pill ${specKey === selectedService ? 'badge-success matched-service' : 'badge-dark'} me-2 mb-2`}>
            {specKey === 'other' && worker.otherWork ? `${t('services.other.name')} · ${worker.otherWork}` : t(`services.${specKey}.name`)}
          </span>
        ))}
      </div>

          {worker.specialties.includes('moving') && worker.transportVehicles?.length > 0 && <div className="mb-3">
            <strong>{t('register.transport')}</strong>
            <div>{worker.transportVehicles.map(vehicle => <span key={vehicle} className="badge-pill badge-dark me-2 mt-2">{t(`transportVehicles.${vehicle}`)}</span>)}</div>
          </div>}
      <p className="mb-2 small-muted">
        ⭐ {worker.rating ?? '—'} ({worker.reviewCount})
      </p>
      <p className="mb-2 small-muted">
        📍 {worker.location}
      </p>
      <p className="mb-3 small worker-description">{worker.description}</p>
      {travelTo && <p className="worker-travel-note">{t('search.askTravel', { from: worker.location, to: travelTo })}</p>}

      <Link to={workerPath(worker.id, selectedService, selectedLocation)} className="btn btn-primary w-100">
        {t(travelTo ? 'search.discussTravel' : 'workerCard.viewProfile')}
      </Link>
    </div>
  )
}

export default WorkerCard
