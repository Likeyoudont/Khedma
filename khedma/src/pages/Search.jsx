import { useAuth } from '../auth/useAuth'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import SearchBar from '../components/SearchBar'
import { Link } from '../demo/navigation'
import WorkerCard from '../components/WorkerCard'
import { useEffect, useState } from 'react'
import { useAppApi } from '../demo/useAppApi'
import { useWorkers } from '../data/useWorkers'
import WorkerLoadError from '../components/WorkerLoadError'

import { resolveService, resolveCity, chosenService, chosenCity, cityMatches, normalize } from '../search/matching'
import { workerAlternatives } from '../search/alternatives'

function Search() {
  const { bookingRequest } = useAppApi()
  const { data, loading, error, retry } = useWorkers()
  const workers = data || []
  const { user } = useAuth()
  const [requestResult, setRequestResult] = useState(null)
  const requestKey = user?.role === 'mihaniy' ? user.id : null
  const requestLoading = requestKey !== null && requestResult?.key !== requestKey
  const announcements = requestResult?.key === requestKey ? requestResult.items : []
  const requestError = requestResult?.key === requestKey ? requestResult.error : ''
  useEffect(() => {
    let active = true
    if (requestKey === null) return undefined
    const controller = new AbortController()
    bookingRequest('', undefined, { signal: controller.signal }).then(items => { if (active) setRequestResult({ key: requestKey, items: items.filter(item => item.status === 'pending'), error: '' }) })
      .catch(err => { if (active && err.name !== 'AbortError') setRequestResult({ key: requestKey, items: [], error: err.message }) })
    return () => { active = false; controller.abort() }
  }, [requestKey, bookingRequest])
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()

  const serviceQuery = searchParams.get('service') || ''
  const serviceMatch = resolveService(serviceQuery, t)
  const serviceFilter = chosenService(serviceQuery, t)
  const locationQuery = searchParams.get('location') || ''
  const locationResult = resolveCity(locationQuery, workers.map(worker => worker.location))
  const locationFilter = chosenCity(locationQuery, workers.map(worker => worker.location))
  const availableOnly = searchParams.get('available') === '1'
  const role = user?.role || 'ba7it'

  const filteredWorkers = workers.filter((worker) => {
    const customQuery = normalize(serviceQuery)
    const matchesOtherWork = customQuery.length >= 3 && worker.specialties.includes('other') && normalize(worker.otherWork || '').includes(customQuery)
    const matchesService = !serviceQuery || matchesOtherWork || (serviceFilter && worker.specialties.includes(serviceFilter))
    const matchesLocation = !locationFilter || cityMatches(worker.location, locationFilter)
    return matchesService && matchesLocation && (!availableOnly || worker.available)
  })

  const filteredAnnouncements = announcements.filter((item) => {
    const matchesService = !serviceQuery || (serviceFilter && item.service === serviceFilter)
    const matchesLocation = !locationFilter || cityMatches(item.location, locationFilter)
    return matchesService && matchesLocation
  })

  const activeServiceName = serviceFilter
    ? t(`services.${serviceFilter}.name`)
    : (serviceQuery || t('search.allServices'))

  const applySuggestion = () => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('service', serviceMatch.key)
    setSearchParams(nextParams)
  }

  return (
    <div className="container py-5 search-page">
      <div className="page-header mb-4">
        <h1>{t('search.title')}</h1>
      </div>

      <div className="mb-4"><SearchBar key={searchParams.toString()} compact cities={workers.map(worker => worker.location)} /></div>
      {role === 'ba7it' && <label className="checkbox-chip mb-3"><input type="checkbox" checked={availableOnly} onChange={event => {
        const params = new URLSearchParams(searchParams)
        if (event.target.checked) params.set('available', '1')
        else params.delete('available')
        setSearchParams(params)
      }} />{t('flow.availableOnly')}</label>}

      <p className="mb-4 small-muted">
        {t(role === 'mihaniy' ? 'search.requestsFor' : 'search.resultsFor')}: <strong>{activeServiceName}</strong>
      </p>

      {locationResult.suggested && <p role="status">{t('search.didYouMean')} <button type="button" className="btn btn-link p-0" onClick={() => {
        const next = new URLSearchParams(searchParams); next.set('location', locationResult.label); setSearchParams(next)
      }}>{locationResult.label}?</button></p>}
      {!serviceFilter && serviceMatch.key && (
        <p className="mb-4" role="status">
          {t('search.didYouMean')}{' '}
          <button type="button" className="btn btn-link p-0 align-baseline" onClick={applySuggestion}>
            {t(`services.${serviceMatch.key}.name`)}?
          </button>
        </p>
      )}

      {role === 'mihaniy' ? (
        requestLoading || requestError ? <p role={requestError ? 'alert' : 'status'}>{requestError || t('common.loading')}</p> : filteredAnnouncements.length === 0 ? (
          <div className="dashboard-card p-4 text-center">
            <p className="mb-0 small-muted">{t('search.noAnnouncements')}</p>
            <Link to="/search" className="btn btn-outline-secondary mt-3">{t('search.clearFilters')}</Link>
          </div>
        ) : (
          <div className="row g-3">
            {filteredAnnouncements.map((item) => (
              <div key={item.id} className="col-md-6 col-lg-4">
                <article className="dashboard-card h-100">
                  <div className="d-flex justify-content-between align-items-start gap-2 mb-3">
                    <span className="badge-pill badge-dark">{t(`services.${item.service}.name`)}</span>
                    <span className="small-muted">{item.postedAt}</span>
                  </div>
                  <h2 className="h5">{t('search.clientRequest')}</h2>
                  <p className="small-muted">{item.description}</p>
                  <div className="small-muted mb-3">📍 {item.location} · {item.clientName}</div>
                  <Link to={`/job/${item.id}`} className="btn btn-primary w-100">{t('job.title')}</Link>
                </article>
              </div>
            ))}
          </div>
        )
      ) : error ? (
        <WorkerLoadError retry={retry} />
      ) : loading ? (
        <p role="status">{t('common.loading')}</p>
      ) : filteredWorkers.length === 0 ? (
        <SearchAlternatives workers={availableOnly ? workers.filter(worker => worker.available) : workers} service={serviceFilter} serviceName={activeServiceName} location={locationFilter} />
      ) : (
        <div className="row g-3">
          {filteredWorkers.map((worker) => (
            <div key={worker.id} className="col-md-6 col-lg-4">
              <WorkerCard worker={worker} selectedService={serviceFilter || (serviceQuery && worker.specialties.includes('other') ? 'other' : '')} selectedLocation={locationFilter} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SearchAlternatives({ workers, service, serviceName, location }) {
 const { t } = useTranslation()
 const { localServices, otherWorkers, elsewhereServices } = workerAlternatives(workers, { service, location })
 const cities = [...new Map(otherWorkers.map(worker => [resolveCity(worker.location).key, worker.location])).values()]
 const searchLink = (key, city) => `/search?${new URLSearchParams({ service: key, ...(city ? { location: city } : {}) })}`
 return <div className="search-alternatives">
   <div className="dashboard-card p-4 mb-4">
     <h2 className="h4">{location ? t('search.unavailableInCity', { service: serviceName, city: location }) : t('search.unavailableService', { service: serviceName })}</h2>
     {localServices.length > 0 && <p>{t('search.availableInstead', { city: location || t('search.allCities') })}</p>}
     {!localServices.length && !otherWorkers.length && !elsewhereServices.length && <p>{t('search.tryAllServices')}</p>}
     <div className="d-flex flex-wrap gap-2">{localServices.map(key => <Link className="btn btn-outline-primary" key={key} to={searchLink(key, location)}>{t(`services.${key}.name`)}</Link>)}</div>
     <Link to="/search" className="back-link d-inline-block mt-3">{t('search.clearFilters')}</Link>
   </div>
   {elsewhereServices.length > 0 && <section className="dashboard-card p-4 mb-4">
     <h2 className="h4">{t('search.otherAvailableServices')}</h2>
     <p className="small-muted">{t('search.otherServicesHelp')}</p>
     <div className="d-flex flex-wrap gap-2">{elsewhereServices.map(key => <Link className="btn btn-outline-primary" key={key} to={searchLink(key, location)}>{t(`services.${key}.name`)}</Link>)}</div>
   </section>}
   {cities.length > 0 && <section>
     <h2 className="h4">{t(service ? 'search.workersElsewhere' : 'search.availableElsewhere', { service: serviceName })}</h2>
     <div className="d-flex flex-wrap gap-2 mb-3">{cities.map(city => <Link className="btn btn-outline-primary" key={city} to={searchLink(service, city)}>{city}</Link>)}</div>
     <p className="small-muted">{t('search.travelSuggestion', { city: location || t('search.yourCity') })}</p>
     <div className="row g-3">{otherWorkers.slice(0, 6).map(worker => <div className="col-md-6 col-lg-4" key={worker.id}><WorkerCard worker={worker} selectedService={service} selectedLocation={location} travelTo={location} /></div>)}</div>
     {otherWorkers.length > 6 && <Link className="btn btn-outline-primary mt-3" to={service ? searchLink(service, '') : '/search?available=1'}>{t('search.seeAllAlternatives')}</Link>}
   </section>}
 </div>
}

export default Search
