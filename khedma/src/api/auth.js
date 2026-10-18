import { translatedError, translatedResponseError } from './errors'
import { AppError } from './errors-core'
import { runRequest } from './request-state'
async function request(path, body, options = {}) {
  if (import.meta.env.VITE_STATIC_PREVIEW === 'true') {
    if (path === 'me') return { user: null }
    throw new AppError('preview')
  }
  return runRequest(async ({ signal, markSubmitted }) => {
    const headers = { Accept: 'application/json' }
    if (body !== undefined) {
      const csrf = await fetch('/api/auth/csrf', { credentials: 'same-origin', headers, signal })
      if (!csrf.ok) throw translatedResponseError({}, csrf.status)
      headers['X-CSRF-TOKEN'] = (await csrf.json()).token
      headers['Content-Type'] = 'application/json'
      markSubmitted()
    }
    const response = await fetch(`/api/auth/${path}`, {
      method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', headers, signal,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
    let data
    try { data = await response.json() } catch (error) { if (response.ok) throw error; data = {} }
    if (!response.ok) throw translatedResponseError(data, response.status)
    return data
  }, { kind: body === undefined ? 'read' : 'mutation', background: path === 'me', ...options })
}

export async function authRequest(...args) {
  try { return await request(...args) }
  catch (error) { throw translatedError(error) }
}
