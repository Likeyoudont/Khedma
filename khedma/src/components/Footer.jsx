import { demosEnabled } from '../config/deployment'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

function Footer() {
  const { t } = useTranslation()

  return (
    <footer>
      <div className="container">
        <div className="footer-grid">
          <div>
            <div className="footer-brand">Khedma</div>
            <p className="mt-3 mb-0 text-white-50">{t('footer.tagline')}</p>
          </div>

          <div>
            <h6 className="text-white mb-3">{t('footer.quickLinks')}</h6>
            <div className="footer-links">
              <Link to="/">{t('navbar.home')}</Link>
              <Link to="/search">{t('navbar.services')}</Link>
              <Link to="/login">{t('navbar.login')}</Link>
              <Link to="/register">{t('navbar.register')}</Link>
            </div>
          </div>

          <div>
            <h6 className="text-white mb-3">{t('navbar.howItWorks')}</h6>
            <div className="footer-links">
              <Link to="/#how-it-works">{t('navbar.howItWorks')}</Link>
              <Link to="/guide">{t('guide.title')}</Link>
              <Link to="/#faq">{t('home.faqTitle')}</Link>
              <Link to="/register?role=worker">{t('home.joinWorker')}</Link>
              {demosEnabled && <Link to="/developer">{t('demo.label')}</Link>}
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-top border-light border-opacity-10 text-center text-white-50 small">
          {t('footer.copyright', { year: new Date().getFullYear() })}
        </div>
      </div>
    </footer>
  )
}

export default Footer
