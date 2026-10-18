import { bookingRequest } from '../api/bookings'
import { authRequest } from '../api/auth'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { translatedError } from '../api/errors'
import { useDemo } from './DemoContext'
import { runRequest } from '../api/request-state'

const liveApi = {
  bookingRequest,
  authRequest,
  async workers(id, signal, options = {}) {
    if (import.meta.env.VITE_STATIC_PREVIEW === 'true') throw new Error('Live worker directory is unavailable in this preview.')
    return runRequest(async ({ signal: requestSignal }) => {
      const url = id === undefined ? '/api/workers' : `/api/workers/${encodeURIComponent(id)}`
      const response = await fetch(url, { signal: requestSignal, headers: { Accept: 'application/json' } })
      if (response.status === 404 && id !== undefined) return null
      if (!response.ok) throw new Error('Worker request failed')
      const data = await response.json()
      if (id === undefined && !Array.isArray(data)) throw new Error('Worker directory returned an invalid response.')
      return data
    }, { ...options, signal })
  },
}
export function useAppApi() {
  const demo = useDemo()
  const isDemo = Boolean(demo)
  const { t } = useTranslation()
  const api = demo?.api || liveApi
  return useMemo(() => Object.fromEntries(Object.entries(api).map(([key, value]) => [key, typeof value === 'function' && key !== 'exportData' ? async (...args) => {
    try {
      if (!isDemo) return await value(...args)
      const options = args[2] || {}
      const mutation = ['bookingRequest', 'authRequest'].includes(key) && args[1] !== undefined
      return await runRequest(({ markSubmitted }) => {
        if (mutation) markSubmitted()
        return value(...args)
      }, { kind: mutation ? 'mutation' : 'read', background: key === 'authRequest' && args[0] === 'me', ...(key === 'workers' ? { signal: args[1] } : {}), ...options })
    } catch (error) { throw translatedError(error, t) }
  } : value])), [api, t, isDemo])
}
