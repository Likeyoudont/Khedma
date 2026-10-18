import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

function trackPointer(event) {
  const bounds = event.currentTarget.getBoundingClientRect()
  event.currentTarget.style.setProperty('--pointer-x', `${event.clientX - bounds.left}px`)
  event.currentTarget.style.setProperty('--pointer-y', `${event.clientY - bounds.top}px`)
}

function ServiceCard({ service }) {
  const { t } = useTranslation()

  return (
    <Link
      to={`/search?service=${encodeURIComponent(service.key)}`}
      className="service-card"
      onPointerMove={trackPointer}
    >
      <div className="service-icon">{service.icon}</div>
      <h3>{t(`services.${service.key}.name`)}</h3>
      <p>{t(`services.${service.key}.description`)}</p>
    </Link>
  )
}

export default ServiceCard
