import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { services } from '../data/services'

const commonServices = ['plumbing', 'electricity', 'painting', 'cleaning', 'moving', 'other']
export default function ServicePicker({ value, onChange }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const id = useId()
  return <fieldset className="service-picker">
    <legend className="h6">{t('register.specialties')}</legend>
    <div id={id} className="checkbox-list">
      {services.filter(service => expanded || commonServices.includes(service.key) || value.includes(service.key)).map(service => <label key={service.key} className={`checkbox-chip ${value.includes(service.key) ? 'is-selected' : ''}`}>
        <span aria-hidden="true">{service.icon}</span>
        <input type="checkbox" value={service.key} checked={value.includes(service.key)} onChange={() => onChange(value.includes(service.key) ? value.filter(key => key !== service.key) : [...value, service.key])} />
        {t(`services.${service.key}.name`)}
      </label>)}
    </div>
    <button type="button" className="btn btn-outline-primary mt-2" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(value => !value)}>{t(expanded ? 'home.lessServices' : 'home.moreServices')}</button>
  </fieldset>
}
