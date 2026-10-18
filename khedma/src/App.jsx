import { lazy, Suspense, useLayoutEffect, useRef } from 'react'
import { useSimpleMotion } from './hooks/useSimpleMotion'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { RequireAuth } from './auth/AuthContext'
import Navbar from './components/Navbar'
import { demosEnabled } from './config/deployment'
import Footer from './components/Footer'
import RequestStatus from './components/RequestStatus'
const Home = lazy(() => import('./pages/Home'))
const Search = lazy(() => import('./pages/Search'))
const WorkerProfile = lazy(() => import('./pages/WorkerProfile'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Job = lazy(() => import('./pages/Job'))
const Guide = lazy(() => import('./pages/Guide'))
const PasswordRecovery = lazy(() => import('./pages/PasswordRecovery'))
const Account = lazy(() => import('./pages/Account'))
const DeveloperDemo = demosEnabled ? lazy(() => import('./pages/DeveloperDemo')) : null

function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const routeRef = useRef(null)
  const reduced = useSimpleMotion()

  useLayoutEffect(() => {
    const element = routeRef.current
    let observer, frame
    const finish = () => {
      if (!location.hash) return
      let target
      try { target = decodeURIComponent(location.hash.slice(1)) } catch { return }
      const scroll = () => {
        const section = document.getElementById(target)
        if (!section) return false
        observer?.disconnect()
        // Let the collapsed menu's ResizeObserver update the sticky header height.
        frame = requestAnimationFrame(() => {
          frame = requestAnimationFrame(() => section.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth' }))
        })
        return true
      }
      if (!scroll()) {
        observer = new MutationObserver(scroll)
        observer.observe(element, { childList: true, subtree: true })
      }
    }
    window.scrollTo({ top: 0, behavior: 'instant' })
    if (reduced) {
      finish()
      return () => { observer?.disconnect(); cancelAnimationFrame(frame) }
    }
    const animation = element.animate([{ transform: 'translateY(12px)' }, { transform: 'translateY(0)' }], { duration: 450, easing: 'cubic-bezier(.22,1,.36,1)' })
    animation.onfinish = finish
    return () => { animation.cancel(); observer?.disconnect(); cancelAnimationFrame(frame) }
  }, [location, reduced])
  const { t } = useTranslation()

  return (
    <div className={`app-shell ${location.pathname === '/' ? 'app-shell-home' : ''}`}>
      <Navbar />
      <RequestStatus />

      <main className="page-content">
        {location.pathname !== '/' && (
          <div className="container page-back-wrap">
            <button
              type="button"
              className="page-back-button"
              onClick={() => {
                if (window.history.length > 1) navigate(-1)
                else navigate('/')
              }}
              aria-label={t('common.back')}
            >
              <span aria-hidden="true">←</span> {t('common.back')}
            </button>
          </div>
        )}
        <div ref={routeRef} className="page-route-content">
          <Suspense fallback={<p className="container py-5" role="status">{t('common.loading')}</p>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/worker/:id" element={<WorkerProfile />} />
            {demosEnabled && <Route path="/developer/*" element={<DeveloperDemo />} />}
            {demosEnabled && <Route path="/worker-preview" element={<Navigate to="/developer/worker" replace />} />}
            {demosEnabled && <Route path="/client-preview" element={<Navigate to="/developer/client" replace />} />}
            <Route path="/guide" element={<Guide />} />
            <Route path="/forgot-password" element={<PasswordRecovery key="forgot" />} />
            <Route path="/reset-password" element={<PasswordRecovery key="reset" reset />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/account" element={<RequireAuth><Account /></RequireAuth>} />
            <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
            <Route path="/job/:id" element={<RequireAuth><Job /></RequireAuth>} />
            <Route path="*" element={<div className="container py-5 text-center"><h1>{t('common.notFound')}</h1><button type="button" className="btn btn-primary" onClick={() => navigate('/')}>{t('navbar.home')}</button></div>} />
          </Routes>
          </Suspense>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default App
