import { authRequest } from '../api/auth'
import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { AuthContext, useAuth } from './useAuth'
import { useTranslation } from 'react-i18next'
import { clearDrafts } from '../account/drafts'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    try { localStorage.removeItem('khedma-role') } catch { /* Account access still works when browser storage is blocked. */ }
    authRequest('me').then(data => { if (active) setUser(data.user) }).catch(err => {
      if (active && err.status !== 401) setError(err.message)
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  async function authenticate(action, payload) {
    const data = await authRequest(action, payload)
    setUser(data.user)
    setError('')
    return data.user
  }
  async function logout() {
    await authRequest('logout', {})
    clearDrafts()
    setUser(null)
  }
  return <AuthContext.Provider value={{ user, loading, error, authenticate, logout }}>{children}</AuthContext.Provider>
}


export function RequireAuth({ children }) {
  const { t } = useTranslation()
  const { user, loading, error } = useAuth()
  const location = useLocation()
  if (loading) return <p className="container py-5" role="status">{t("common.loading")}</p>
  if (error) return <div className="container py-5" role="alert">{error} <button onClick={() => window.location.reload()}>{t("booking.refresh")}</button></div>
  return user ? children : <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />
}
