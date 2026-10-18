import test from 'node:test'
import assert from 'node:assert/strict'
import { workerPath } from '../src/booking/context.js'
import { rememberDraft, readDraft, forgetDraft, clearDrafts } from '../src/account/drafts.js'
import { responseError } from '../src/api/errors-core.js'

test('worker links preserve the selected service and city including Arabic text', () => {
  const url = new URL(workerPath(1, 'electricity', 'الرباط'), 'https://example.test')
  assert.equal(url.pathname, '/worker/1')
  assert.equal(url.searchParams.get('service'), 'electricity')
  assert.equal(url.searchParams.get('location'), 'الرباط')
})
test('profile drafts isolate users and demos, exclude passwords, and return independent copies', () => {
  clearDrafts()
  rememberDraft('live:1', { name: 'Edited name', current_password: 'secret', password: 'secret', specialties: ['electricity'] })
  assert.equal(readDraft('live:2'), null)
  assert.equal(readDraft('live:1').current_password, undefined)
  assert.equal(readDraft('live:1').password, undefined)
  const copy = readDraft('live:1'); copy.specialties.push('plumbing')
  assert.deepEqual(readDraft('live:1').specialties, ['electricity'])
  rememberDraft('/developer/worker:1:101', { name: 'Demo name' })
  clearDrafts('/developer/')
  assert.equal(readDraft('/developer/worker:1:101'), null)
  assert.equal(readDraft('live:1').name, 'Edited name')
  forgetDraft('live:1'); assert.equal(readDraft('live:1'), null)
})
test('API errors keep actionable codes and field names without exposing server messages', () => {
  assert.equal(responseError({ errors: { identity: ['These credentials do not match our records.'] } }, 422).code, 'credentials')
  assert.equal(responseError({ errors: { phone: ['The phone has already been taken.'] } }, 422).code, 'duplicatePhone')
  assert.equal(responseError({ errors: { email: ['The email has already been taken.'] } }, 422).code, 'duplicateEmail')
  assert.equal(responseError({ errors: { identity: ['A Moroccan phone number requires 10 digits beginning 05, 06 or 07.'] } }, 422).code, 'phoneInvalid')
  assert.equal(responseError({}, 429).code, 'rateLimit')
  assert.equal(responseError({}, 503).code, 'server')
  assert.deepEqual(responseError({ errors: { 'moving_details.pickup': ['Required'] } }, 422).fields, ['moving_details.pickup'])
  assert.equal(responseError({ message: 'SQL error containing private data' }, 500).message, 'server')
})
