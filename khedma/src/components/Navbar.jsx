import { demosEnabled } from '../config/deployment'
import ThemeSwitch from './ThemeSwitch'
import MobileNavigation from './MobileNavigation'
import LanguageSwitcher from './LanguageSwitcher'
import { useAuth } from '../auth/useAuth'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

function Navbar() {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const demoRole = demosEnabled ? location.pathname.match(/^\/developer\/(worker|client)(?:\/|$)/)?.[1] : undefined
  const authState = { from: location.state?.from || (location.pathname.startsWith('/worker/') ? location.pathname + location.search : undefined) }
  const [openLocation, setOpenLocation] = useState(null)
  const menuOpen = openLocation === location
  const [logoutError, setLogoutError] = useState('')
  const [signingOut, setSigningOut] = useState(false)
  async function handleLogout() {
    setSigningOut(true)
    setLogoutError('')
    try { await logout(); navigate('/login') }
    catch (err) { setLogoutError(err.message) }
    finally { setSigningOut(false) }
  }
  const navRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) return undefined
    function closeOutside(event) { if (!navRef.current?.contains(event.target)) setOpenLocation(null) }
    function closeWithEscape(event) {
      if (event.key !== 'Escape') return
      setOpenLocation(null)
      navRef.current?.querySelector('.navigation-toggle')?.focus()
    }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeWithEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeWithEscape)
    }
  }, [menuOpen])

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      document.documentElement.style.setProperty('--nav-height', `${entry.target.offsetHeight}px`)
    })
    observer.observe(navRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <>
    <nav ref={navRef} className="navbar site-navigation">
      <div className="container navigation-grid">
        <NavLink to="/" end aria-label={t('navbar.home')} className="navbar-home-button">
          <svg className="navigation-home-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m3 10 9-7 9 7M5 9v11h5v-6h4v6h5V9" /></svg> <span className="navigation-brand">Khedma</span>
        </NavLink>
        <div className="navigation-tools">
          <LanguageSwitcher />
          <ThemeSwitch />
          <button type="button" className="navigation-toggle" aria-label={t('navbar.toggle')} aria-expanded={menuOpen} aria-controls="navigation-menu" onClick={() => setOpenLocation(menuOpen ? null : location)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">{menuOpen ? <path d="m6 6 12 12M6 18 18 6" /> : <path d="M4 6h16M4 12h16M4 18h16" />}</svg>
          </button>
        </div>
        {!user && !demoRole && location.pathname !== '/' && <div className="mobile-auth-links"><Link to="/login" state={authState} className="btn btn-outline-primary">{t('navbar.login')}</Link><Link to="/register" state={authState} className="btn btn-primary">{t('auth.createAccount')}</Link></div>}
        <div id="navigation-menu" className={`navigation-menu ${menuOpen ? 'is-open' : ''}`}>
          <div className="navigation-links">
            <NavLink to="/search" className="nav-link">{t('navbar.services')}</NavLink>
            <Link to="/#how-it-works" className="nav-link">{t('navbar.howItWorks')}</Link>
          </div>
          <div className="navigation-account">
            {demoRole ? <><NavLink to={`/developer/${demoRole}`}>{t('dashboard.title')}</NavLink><NavLink to={`/developer/${demoRole}/account`}>{t('account.title')}</NavLink><Link to="/developer">{t('flow.leaveDemo')}</Link></> : user ? <>
              <NavLink to="/dashboard" className="nav-link">{t('dashboard.title')}</NavLink>
              <NavLink to="/account" className="nav-link">{t('account.title')}</NavLink>
              <button type="button" className="btn btn-primary btn-sm" disabled={signingOut} onClick={handleLogout}>{t('auth.logout')}</button>
            </> : <>
              <NavLink to="/login" state={authState} className="btn btn-outline-primary btn-sm">{t('navbar.login')}</NavLink>
              <Link to="/register" state={authState} className="btn btn-primary btn-sm">{t('auth.createAccount')} <span aria-hidden="true">↗</span></Link>
            </>}
            {logoutError && <span role="alert">{logoutError}</span>}
          </div>
        </div>
      </div>
    </nav>
    <MobileNavigation />
    </>
  )
}

export default Navbar
