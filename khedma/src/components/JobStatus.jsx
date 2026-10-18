import { useTranslation } from 'react-i18next'

export default function JobStatus({ job, worker, expired }) {
  const { t } = useTranslation()
  let key
  if (job.status === 'pending') key = expired ? 'expired' : job.price == null ? worker ? 'received' : 'sent' : worker ? 'offerSent' : 'offerReady'
  else if (job.status === 'confirmed') key = job.fees?.required && !job.fees.unlocked ? 'fees' : worker ? 'ready' : 'confirmed'
  else key = job.status
  return <section className={`job-status-summary ${expired || job.status === 'cancelled' ? 'is-closed' : ''}`} role="status" aria-live="polite" aria-label={t('job.status')}>
    <span className="job-status-symbol" aria-hidden="true">{job.status === 'completed' ? '✓' : expired || job.status === 'cancelled' ? '−' : job.status === 'in_progress' ? '↗' : '•'}</span>
    <div><h2>{t(`phoneUI.job.${key}.title`)}</h2><p>{t(`phoneUI.job.${key}.body`)}</p></div>
  </section>
}
