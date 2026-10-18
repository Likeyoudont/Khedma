import test from 'node:test'
import assert from 'node:assert/strict'
import { feeQuote } from '../src/booking/fees.js'
import { redactContacts } from '../src/booking/contact-privacy.js'
import { createDemoStore } from '../src/demo/store.js'
import { responseError } from '../src/api/errors-core.js'

const now = Date.now()
async function setup(price = 200) {
  const store = createDemoStore(() => now)
  const job = await store.startPractice({ description: 'Install a light', opening: 'Can you help?' })
  const worker = store.forRole('worker'), client = store.forRole('client')
  const path = `/${job.id}`
  const offer = { action: 'accept', price, scheduled_at: new Date(now + 86400000).toISOString(), fees_accepted: true }
  return { store, worker, client, path, offer }
}

test('fees use cent rounding and display both total costs without treating the job price as an online charge', () => {
  assert.deepEqual(feeQuote(200), { baseCents: 20000, feeCents: 2000, clientTotalCents: 22000, workerNetCents: 18000 })
  assert.deepEqual(feeQuote(200.05), { baseCents: 20005, feeCents: 2001, clientTotalCents: 22006, workerNetCents: 18004 })
  assert.equal(feeQuote(0).feeCents, 0)
  assert.equal(feeQuote(999999.99).feeCents, 10000000)
  for (const price of ['', null, undefined, 'bad', -1, Infinity, 1000000]) assert.equal(feeQuote(price), null)
})

test('both people must accept the fee and pay separately before starting', async () => {
  const { worker, client, path, offer } = await setup()
  await assert.rejects(worker.bookingRequest(`${path}/action`, { ...offer, fees_accepted: false }), { code: 'feeConsent' })
  await worker.bookingRequest(`${path}/action`, offer)
  await assert.rejects(client.bookingRequest(`${path}/action`, { action: 'confirm' }), { code: 'feeConsent' })
  const agreed = await client.bookingRequest(`${path}/action`, { action: 'confirm', fees_accepted: true })
  assert.equal(agreed.workerPhone, null)
  assert.equal(agreed.fees.ownPayment.amount_cents, 2000)
  assert.equal(agreed.feePayments, undefined)
  await assert.rejects(worker.bookingRequest(`${path}/action`, { action: 'start' }), { code: 'feesUnpaid' })
  await assert.rejects(client.bookingRequest(`${path}/payments`, { method: 'cashplus' }))
  await assert.rejects(client.bookingRequest(`${path}/payments`, { method: 'card', simulate: true }))
  const first = await client.bookingRequest(`${path}/payments`, { method: 'cashplus', simulate: true, role: 'worker', amount_cents: 1 })
  assert.equal(first.fees.clientStatus, 'paid')
  assert.equal(first.fees.workerStatus, 'pending')
  assert.equal(first.workerPhone, null)
  const paid = await worker.bookingRequest(`${path}/payments`, { method: 'cashplus', simulate: true })
  assert.equal(paid.fees.unlocked, true)
  assert.equal(paid.clientPhone, '0000000000')
  assert.equal(paid.fees.ownPayment.method, 'cashplus')
  assert.equal((await client.bookingRequest(path)).workerPhone, '0000000000')
  assert.equal((await worker.bookingRequest(`${path}/action`, { action: 'start' })).status, 'in_progress')
})

test('practice client payment returns the worker’s own fee and cannot simulate a payment on ordinary jobs', async () => {
  const { store, worker, path, offer } = await setup()
  await worker.bookingRequest(`${path}/action`, offer)
  const agreed = await store.practiceClient(path.slice(1), { accept: 'Agreed' })
  assert.equal(agreed.fees.ownPayment.role, 'worker')
  const first = await store.practicePayment(path.slice(1))
  assert.equal(first.fees.clientStatus, 'paid')
  assert.equal(first.fees.ownPayment.role, 'worker')
  assert.equal(first.fees.unlocked, false)
  await assert.rejects(store.practicePayment(3))
})

test('cancelled fake jobs flag paid fees for refund and cannot unlock or accept more payment', async () => {
  const { worker, client, path, offer } = await setup()
  await worker.bookingRequest(`${path}/action`, offer)
  await client.bookingRequest(`${path}/action`, { action: 'confirm', fees_accepted: true })
  await client.bookingRequest(`${path}/payments`, { method: 'cashplus', simulate: true })
  const cancelled = await client.bookingRequest(`${path}/action`, { action: 'cancel', reason: 'changed_plans' })
  assert.equal(cancelled.fees.clientStatus, 'refund_pending')
  assert.equal(cancelled.fees.workerStatus, 'void')
  assert.equal(cancelled.fees.unlocked, false)
  assert.equal(cancelled.workerPhone, null)
  await assert.rejects(worker.bookingRequest(`${path}/payments`, { method: 'cashplus', simulate: true }))
})

test('free jobs unlock automatically without inventing a payment charge', async () => {
  const { worker, client, path, offer } = await setup(0)
  await worker.bookingRequest(`${path}/action`, offer)
  const agreed = await client.bookingRequest(`${path}/action`, { action: 'confirm', fees_accepted: true })
  assert.equal(agreed.fees.unlocked, true)
  assert.equal(agreed.fees.ownPayment.amount_cents, 0)
})

test('common contact formats in three numeral systems are filtered while price and dates remain readable', () => {
  for (const phone of ['0612345678', '06 12 34 56 78', '+212612345678', '٠٦١٢٣٤٥٦٧٨', '۰۶۱۲۳۴۵۶۷۸']) assert.equal(redactContacts(`Call ${phone}`), 'Call […]')
  assert.equal(redactContacts('Email sara@example.test or https://example.test/contact'), 'Email […] or […]')
  assert.equal(redactContacts('200 DH, 2026-10-05 at 14:00'), '200 DH, 2026-10-05 at 14:00')
})

test('moving addresses and contact messages stay locked until both simulated fees are paid', async () => {
  const store = createDemoStore(() => now), client = store.forRole('client'), worker = store.forRole('worker')
  const job = await client.bookingRequest('', { workerId: 1, service: 'moving', location: 'Rabat', description: 'Call 0612345678 about my furniture', moving_details: { pickup: '12 exact street', dropoff: '44 exact street', items: 'Sofa', helpers: 'team' } })
  const path = `/${job.id}`
  assert.equal(job.description, 'Call […] about my furniture')
  assert.equal(job.movingDetails.pickup, '12 exact street')
  const hidden = await worker.bookingRequest(path)
  assert.equal(hidden.detailsLocked, true)
  assert.equal(hidden.movingDetails.pickup, undefined)
  assert.equal(worker.exportData().bookings.at(-1).movingDetails.pickup, undefined)
  await assert.rejects(worker.bookingRequest(`${path}/messages`, { body: 'Call 0612345678', client_token: 'contact' }), { code: 'contactLocked' })
  await worker.bookingRequest(`${path}/action`, { action: 'accept', price: 200, scheduled_at: new Date(now + 86400000).toISOString(), fees_accepted: true })
  await client.bookingRequest(`${path}/action`, { action: 'confirm', fees_accepted: true })
  await client.bookingRequest(`${path}/payments`, { method: 'cashplus', simulate: true })
  const paid = await worker.bookingRequest(`${path}/payments`, { method: 'cashplus', simulate: true })
  assert.equal(paid.movingDetails.pickup, '12 exact street')
  await worker.bookingRequest(`${path}/messages`, { body: 'Call 0612345678', client_token: 'contact' })
})

test('payment errors are mapped to clear translated messages', () => {
  assert.equal(responseError({ errors: { fees_accepted: ['Required'] } }, 422).code, 'feeConsent')
  assert.equal(responseError({ message: 'Both platform fees must be verified before starting work.' }, 409).code, 'feesUnpaid')
  assert.equal(responseError({ message: 'Payment checkout is not configured.' }, 503).code, 'paymentNotReady')
  assert.equal(responseError({ message: 'Contact details are locked until both fees are verified.' }, 422).code, 'contactLocked')
})
