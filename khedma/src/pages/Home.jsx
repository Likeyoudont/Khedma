import { useSimpleMotion } from '../hooks/useSimpleMotion'
import { useAuth } from '../auth/useAuth'
import { useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import ServiceCard from '../components/ServiceCard'
import WorkerCard from '../components/WorkerCard'
import WorkerLoadError from '../components/WorkerLoadError'
import ScrollHero from '../components/ScrollHero'
import ScrollExperience from '../components/ScrollExperience'
import { services } from '../data/services'
import { useWorkers } from '../data/useWorkers'

gsap.registerPlugin(ScrollTrigger)

function Home() {
  const { data, loading, error, retry } = useWorkers(undefined, { background: true })
  const workers = data || []
  const { user } = useAuth()
  const { t } = useTranslation()
  const [showAllServices, setShowAllServices] = useState(false)
  const isBa7it = (user?.role || 'ba7it') === 'ba7it'
  const pageRef = useRef(null)
  const reduceMotion = useSimpleMotion()

  useLayoutEffect(() => {
    if (reduceMotion || document.visibilityState !== 'visible') return undefined

    const animation = gsap.context(() => {
      gsap.utils.toArray('.story-reveal, .story-card-reveal').forEach((element) => {
        const isCard = element.classList.contains('story-card-reveal')

        gsap.fromTo(element, { y: 18, opacity: 1 }, {
          y: 0,
          opacity: 1,
          duration: isCard ? 0.82 : 0.9,
          ease: 'power2.out',
          delay: isCard ? Number(element.style.getPropertyValue('--card-index') || 0) * 0.07 : 0,
          scrollTrigger: {
            trigger: element,
            start: isCard ? 'top 92%' : 'top 82%',
            once: true,
          },
        })
      })

    }, pageRef)

    return () => animation.revert()
  }, [reduceMotion])

  return (
    <div ref={pageRef} className="home-story">
      <ScrollHero cities={workers.map(worker => worker.location)} />

      <section className="desktop-introduction" aria-labelledby="desktop-introduction-title">
        <div className="container">
          <div className="desktop-introduction-heading story-reveal">
            <span className="section-kicker">{t('desktopDesign.kicker')}</span>
            <h2 id="desktop-introduction-title">{t('desktopDesign.title')}</h2>
            <Link to="/guide" className="browse-link">{t('desktopDesign.guide')} <span aria-hidden="true">↗</span></Link>
          </div>
          <div className="desktop-benefits">
            {['nearby', 'agreement', 'clarity'].map((key, index) => <article key={key} className="desktop-benefit story-card-reveal" style={{ '--card-index': index }}>
              <span className="desktop-benefit-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{index === 0 ? <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2.5" /></> : index === 1 ? <><path d="M4 5h16v11H9l-5 4V5Z" /><path d="m8 10 3 3 5-5" /></> : <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6m-6 4 2 2 4-4" /></>}</svg></span>
              <h3>{t(`desktopDesign.${key}.title`)}</h3>
              <p>{t(`desktopDesign.${key}.body`)}</p>
            </article>)}
          </div>
        </div>
      </section>

      <ScrollExperience />

      <section id="services" className="story-chapter services-section">
        <div className="container">
          <div className="chapter-heading story-reveal">
            <div>
              <span className="section-kicker">{t('home.servicesKicker')}</span>
              <h2><span className="desktop-home-copy">{t('home.popularServices')}</span><span className="mobile-home-title">{t('home.mobileServices')}</span></h2>
            </div>
            <div className="chapter-description"><p>{t('home.servicesIntro')}</p><Link className="browse-link" to="/search">{t('home.browseAll')} <span aria-hidden="true">↗</span></Link></div>
          </div>

          <div id="home-services-grid" className={`row g-3 service-card-grid ${showAllServices ? 'show-all-services' : ''}`}>
            {services.map((service, index) => (
              <div key={service.id} className="col-6 col-md-4 col-lg-3 story-card-reveal" style={{ '--card-index': index }}>
                <ServiceCard service={service} />
              </div>
            ))}
          </div>
          <button className="services-expand" type="button" aria-expanded={showAllServices} aria-controls="home-services-grid" onClick={() => setShowAllServices(value => !value)}>
            {t(showAllServices ? 'home.fewerServices' : 'home.moreServices')} <span aria-hidden="true">{showAllServices ? '−' : '+'}</span>
          </button>
        </div>
      </section>

      <section className="story-chapter workers-section">
        <div className="container">
          <div className="chapter-heading story-reveal">
            <div>
              <span className="section-kicker">{t('home.neighborhoodKicker')}</span>
              <h2>{isBa7it ? t('home.topWorkers') : t('home.workerRequests')}</h2>
            </div>
            <div className="chapter-description"><p>{t('home.workersIntro')}</p><Link className="browse-link" to="/search">{t(isBa7it ? 'home.browseWorkers' : 'home.browseRequests')} <span aria-hidden="true">↗</span></Link></div>
          </div>

          {isBa7it ? (
            <div className="row g-4 worker-card-grid">
              {error ? <div className="col-12"><WorkerLoadError retry={retry} /></div> : (loading || workers.length === 0) && <p role="status">{t(loading ? 'common.loading' : 'search.noResults')}</p>}
              {workers.slice(0, 6).map((worker, index) => (
                <div key={worker.id} className="col-md-6 col-lg-4 story-card-reveal" style={{ '--card-index': index }}>
                  <WorkerCard worker={worker} />
                </div>
              ))}
            </div>
          ) : (
            <div className="dashboard-card p-4 d-flex justify-content-between align-items-center flex-wrap gap-3">
              <p className="mb-0 small-muted">{t('home.workerRequestsText')}</p>
              <Link to="/search" className="btn btn-primary">{t('home.browseRequests')}</Link>
            </div>
          )}
        </div>
      </section>

      <section id="faq" className="faq-section story-chapter">
        <div className="container faq-layout">
          <div className="story-reveal">
            <span className="section-kicker">{t('home.faqKicker')}</span>
            <h2>{t('home.faqTitle')}</h2>
            <p className="small-muted">{t('home.faqIntro')}</p>
          </div>
          <div className="faq-list">
            {['choose', 'price', 'area'].map((key) => (
              <details key={key} className="faq-item">
                <summary>{t(`home.faq.${key}.question`)}<span aria-hidden="true">+</span></summary>
                <p>{t(`home.faq.${key}.answer`)}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="closing-section story-reveal">
        <div className="container closing-content">
          <span className="section-kicker">{t('home.readyKicker')}</span>
          <h2>{t('home.closingTitle')}</h2>
          <p>{t('home.closingText')}</p>
          <Link to="/search" className="closing-link">
            {t('home.searchButton')} <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>
    </div>
  )
}

export default Home
