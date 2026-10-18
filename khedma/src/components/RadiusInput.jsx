import { useTranslation } from 'react-i18next'
export default function RadiusInput({ id, value, onChange }) {
  const { t } = useTranslation()
  function adjust(amount) {
    onChange(Math.min(500, Math.max(0.5, Math.round(((Number(value) || 0) + amount) * 100) / 100)))
  }
  return <div>
    <label htmlFor={id} className="form-label mb-2">{t('register.serviceRadius')}</label>
    <div className="radius-controls">
      <button type="button" className="btn btn-outline-primary" aria-label={t('register.decreaseRadius')} disabled={Number(value) <= 0.5} onClick={() => adjust(-0.5)}>−</button>
      <input id={id} name="service_radius_km" type="number" min="0.5" max="500" step="any" value={value} onChange={event => onChange(event.target.value)} className="form-control" required />
      <button type="button" className="btn btn-outline-primary" aria-label={t('register.increaseRadius')} disabled={Number(value) >= 500} onClick={() => adjust(0.5)}>+</button>
    </div>
  </div>
}
