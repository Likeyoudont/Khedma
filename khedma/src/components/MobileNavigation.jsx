import { demosEnabled } from '../config/deployment'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/useAuth'

function NavigationIcon({ name }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === 'home' ? <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h5v-6h4v6h5V9" /></> : name === 'search' ? <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></> : name === 'jobs' ? <><rect x="5" y="5" width="14" height="16" rx="2" /><path d="M9 5V3h6v2m-6 8 2 2 4-4" /></> : <><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></>}
  </svg>
}

export default function MobileNavigation() {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const { t } = useTranslation()
  const [phone, setPhone] = useState(() => window.matchMedia('(max-width: 767.98px)').matches)
  const [editing, setEditing] = useState(false)
  const dock = useRef(null)
  useEffect(() => {
    const media = window.matchMedia('(max-width: 767.98px)')
    const resize = () => setPhone(media.matches)
    let timer
    const focus = () => setEditing(!!document.activeElement?.matches('input:not([type]), input[type="text"], input[type="search"], input[type="tel"], input[type="email"], input[type="password"], input[type="number"], input[type="url"], textarea, select, [contenteditable="true"]'))
    const blur = () => { clearTimeout(timer); timer = setTimeout(focus, 0) }
    media.addEventListener('change', resize)
    document.addEventListener('focusin', focus)
    document.addEventListener('focusout', blur)
    return () => { media.removeEventListener('change', resize); document.removeEventListener('focusin', focus); document.removeEventListener('focusout', blur); clearTimeout(timer) }
  }, [])
  const demoRole = demosEnabled ? pathname.match(/^\/developer\/(worker|client)(?:\/|$)/)?.[1] : undefined
  const base = demoRole ? `/developer/${demoRole}` : ''
  const signedIn = !!user || !!demoRole
  const worker = demoRole ? demoRole === 'worker' : user?.role === 'mihaniy'
  const authPage = /^\/(?:login|register|forgot-password|reset-password)(?:\/|$)/.test(pathname)
  const visible = phone && !authPage && !editing
  useLayoutEffect(() => {
    const measure = () => document.documentElement.style.setProperty('--phone-dock-height', visible && dock.current ? `${dock.current.offsetHeight}px` : '0px')
    measure()
    const observer = new ResizeObserver(measure)
    if (dock.current) observer.observe(dock.current)
    return () => { observer.disconnect(); document.documentElement.style.removeProperty('--phone-dock-height') }
  }, [visible])
  if (!visible) return null
  const items = [
    { key: 'home', to: '/', label: t('navbar.home'), active: pathname === '/' },
    { key: 'search', to: `${base}/search`, label: t(worker ? 'phoneUI.requests' : 'phoneUI.search'), active: pathname === `${base}/search` || pathname.startsWith(`${base}/worker/`) },
    { key: 'jobs', to: signedIn ? base || '/dashboard' : '/login', from: '/dashboard', label: t('phoneUI.jobs'), active: pathname === (base || '/dashboard') || pathname.startsWith(`${base}/job/`) || pathname === `${base}/practice` },
    { key: 'account', to: signedIn ? `${base}/account` : '/login', from: '/account', label: t(signedIn ? 'phoneUI.account' : 'navbar.login'), active: pathname === `${base}/account` },
  ]
  return <nav ref={dock} className="phone-navigation" aria-label={t('phoneUI.navigation')}>
    {items.map(item => <Link key={item.key} to={item.to} state={!signedIn && item.from ? { from: item.from } : undefined} aria-current={item.active ? 'page' : undefined}><NavigationIcon name={item.key} /><span>{item.label}</span></Link>)}
  </nav>
}
