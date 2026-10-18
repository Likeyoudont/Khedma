import { useSearchParams } from 'react-router-dom'
import { useNavigate } from '../demo/useDemoNavigate'
import { useTranslation } from 'react-i18next'
import { useId, useRef, useState } from 'react'
import { chosenService, chosenCity, suggestServices } from '../search/matching'
import { services } from '../data/services'

function SearchBar({ compact = false, cities = [], simple = false }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const serviceParam = searchParams.get('service') || ''
  const [serviceValue, setServiceValue] = useState(services.some(service => service.key === serviceParam) ? t(`services.${serviceParam}.name`) : serviceParam)
  const [locationValue, setLocationValue] = useState(searchParams.get('location') || '')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const input = useRef(null)
  const fieldId = useId()
  const suggestions = open ? suggestServices(serviceValue, t) : []
  const choose = key => {
    setServiceValue(t(`services.${key}.name`))
    setOpen(false)
    setActive(-1)
    input.current?.focus()
  }
  const handleSubmit = event => {
    event.preventDefault()
    const params = new URLSearchParams()
    if (searchParams.get('available') === '1') params.set('available', '1')
    if (serviceValue.trim()) params.set('service', chosenService(serviceValue, t) || serviceValue.trim())
    if (locationValue.trim()) params.set('location', chosenCity(locationValue, cities))
    setOpen(false)
    navigate(`/search${params.toString() ? `?${params.toString()}` : ''}`)
  }
  return <form className={`hero-search-box ${compact ? 'compact' : ''}`} onSubmit={handleSubmit}>
    <div className="row g-2 align-items-start">
      <div className="col-lg-5 col-md-12 search-service-field" onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) { setOpen(false); setActive(-1) }
      }}>
        <label className="search-field-label" htmlFor={`${fieldId}-service`}><span>{t('home.serviceLabel')}</span></label>
        <input ref={input} id={`${fieldId}-service`} aria-label={t('home.searchPlaceholder')} name="service" type="search" className="form-control"
          role="combobox" aria-autocomplete="list" aria-expanded={suggestions.length > 0} aria-controls={`${fieldId}-suggestions`}
          aria-activedescendant={active >= 0 && suggestions[active] ? `${fieldId}-suggestion-${active}` : undefined}
          aria-describedby={`${fieldId}-search-help`} value={serviceValue} autoComplete="off" spellCheck={false} autoCorrect="off"
          onFocus={() => setOpen(true)} onChange={event => { setServiceValue(event.target.value); setOpen(true); setActive(-1) }}
          onKeyDown={event => {
            if (event.key === 'Escape') { setOpen(false); setActive(-1) }
            if (['ArrowDown', 'ArrowUp'].includes(event.key) && suggestions.length) {
              event.preventDefault()
              setActive(index => event.key === 'ArrowDown' ? (index + 1) % suggestions.length : (index <= 0 ? suggestions.length - 1 : index - 1))
            }
            if (event.key === 'Enter' && active >= 0 && suggestions[active]) { event.preventDefault(); choose(suggestions[active]) }
          }} placeholder={t('home.searchPlaceholder')} />
        {suggestions.length > 0 && <div className="service-suggestions" id={`${fieldId}-suggestions`} role="listbox" aria-label={t('search.suggestions')}>
          {suggestions.map((key, index) => <button key={key} id={`${fieldId}-suggestion-${index}`} type="button" role="option" aria-selected={active === index}
            onMouseDown={event => event.preventDefault()} onClick={() => choose(key)}>
            <span aria-hidden="true">{services.find(service => service.key === key)?.icon}</span><span>{t(`services.${key}.name`)}</span><span aria-hidden="true">↵</span>
          </button>)}
        </div>}
        <p id={`${fieldId}-search-help`} className="search-input-help">{t('search.suggestionHelp')}</p>
      </div>
      <div className="col-lg-5 col-md-12">
        <label className="search-field-label" htmlFor={`${fieldId}-city`}><span>{t(simple ? 'home.cityOptional' : 'home.locationLabel')}</span></label>
        <input id={`${fieldId}-city`} aria-label={t('home.locationPlaceholder')} name="location" type="text" className="form-control"
          value={locationValue} onChange={event => setLocationValue(event.target.value)} spellCheck={false} autoCorrect="off"
          list={`${fieldId}-city-options`} placeholder={t('home.locationPlaceholder')} />
      </div>
      <datalist id={`${fieldId}-city-options`}>{[...new Set(cities)].map(city => <option key={city} value={city} />)}</datalist>
      <div className="col-lg-2 col-md-12 search-submit-column"><button type="submit" className="btn btn-primary w-100">{t(simple ? 'home.findHelp' : 'home.searchButton')}</button></div>
    </div>
  </form>
}
export default SearchBar
