import { Link } from '../demo/navigation'
import { useTranslation } from 'react-i18next'
export default function Guide() {
  const { t } = useTranslation()
  return <div className="container py-5">
    <div className="settings-heading"><span className="section-kicker">Khedma</span><h1>{t('guide.title')}</h1><p>{t('guide.intro')}</p></div>
    <nav className="d-flex flex-wrap gap-2 mb-4" aria-label={t('guide.title')}>
      {['client', 'worker', 'account', 'limits'].map(section => <a className="btn btn-outline-primary" href={`#guide-${section}`} key={section}>{t(`guide.${section}`)}</a>)}
    </nav>
    <div className="row g-4">
      {['client', 'worker'].map(role => <section className="col-lg-6" key={role} id={`guide-${role}`}><div className="settings-card h-100">
        <h2>{t(`guide.${role}`)}</h2>
        <ol className="guide-steps">{[1, 2, 3, 4, 5, 6].map(step => <li key={step}>{t(`guide.${role}${step}`)}</li>)}</ol>
        <Link className="btn btn-primary" to={role === 'client' ? '/search' : '/worker-preview'}>{t(role === 'client' ? 'navbar.services' : 'preview.link')} →</Link>
      </div></section>)}
      <section className="col-12" id="guide-account"><div className="settings-card"><h2>{t('guide.account')}</h2><p>{t('guide.accountText')}</p><Link to="/account">{t('account.title')} →</Link></div></section>
      <section className="col-12" id="guide-limits"><div className="settings-card"><h2>{t('guide.limits')}</h2><p>{t('guide.payment')}</p><p>{t('guide.notifications')}</p><p>{t('recovery.help')}</p><p>{t('guide.social')}</p></div></section>
    </div>
  </div>
}
