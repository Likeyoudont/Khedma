import { demosEnabled } from '../config/deployment'
import { useTranslation } from 'react-i18next'
import { Link } from '../demo/navigation'
export default function WorkerLoadError({ retry }) {
  const { t } = useTranslation()
  const preview = import.meta.env.VITE_STATIC_PREVIEW === 'true'
  return <section className="dashboard-card worker-load-error" role="alert">
    <h2 className="h5">{t(preview ? 'search.previewTitle' : 'search.connectionTitle')}</h2>
    <p>{t(preview ? 'search.previewMessage' : 'search.connectionMessage')}</p>
    <div className="d-flex flex-wrap gap-2">
      {!preview && <button type="button" className="btn btn-primary" onClick={retry}>{t('search.retry')}</button>}
      {demosEnabled && <Link to="/developer/client/search" className={`btn ${preview ? 'btn-primary' : 'btn-outline-primary'}`}>{t('search.tryDemo')}</Link>}
    </div>
  </section>
}
