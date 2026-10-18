import { translatedError, translatedResponseError } from './errors'
import { runRequest } from './request-state'
async function request(path = '', body, options = {}) {
  return runRequest(async ({ signal, markSubmitted }) => {
    const headers = { Accept: 'application/json' }
    if (body !== undefined) {
      const csrf = await fetch('/api/auth/csrf', { headers, credentials: 'same-origin', signal })
      if (!csrf.ok) throw translatedResponseError({}, csrf.status)
      headers['X-CSRF-TOKEN'] = (await csrf.json()).token
      headers['Content-Type'] = 'application/json'
      markSubmitted()
    }
    const response = await fetch(`/api/bookings${path}`, {
      method: body === undefined ? 'GET' : 'POST', headers, credentials: 'same-origin', signal,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
    let data
    try { data = await response.json() } catch (error) { if (response.ok) throw error; data = {} }
    if (!response.ok) throw translatedResponseError(data, response.status)
    return data
  }, { kind: body === undefined ? 'read' : 'mutation', ...options })
}

export async function bookingRequest(...args) {
  try { return await request(...args) }
  catch (error) { throw translatedError(error) }
}
