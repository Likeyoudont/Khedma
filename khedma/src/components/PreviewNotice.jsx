import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
export default function PreviewNotice() {
  const { t } = useTranslation()
  if (import.meta.env.VITE_STATIC_PREVIEW !== 'true') return null
  return <div className="preview-banner p-3 mb-3" role="status"><p>{t('auth.previewNotice')}</p><Link to="/developer" className="btn btn-outline-primary">{t('demo.open')}</Link></div>
}
