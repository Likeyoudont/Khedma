import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequestTracker, createRequestRunner } from '../src/api/request-state.js'
import { AppError } from '../src/api/errors-core.js'

function clock() {
  let time = 0, nextId = 0
  const timers = new Map()
  return {
    setTimer(callback, delay) { const id = ++nextId; timers.set(id, { callback, due: time + delay }); return id },
    clearTimer(id) { timers.delete(id) },
    advance(duration) {
      const target = time + duration
      while (true) {
        const next = [...timers].filter(([, timer]) => timer.due <= target).sort((a, b) => a[1].due - b[1].due)[0]
        if (!next) break
        time = next[1].due
        timers.delete(next[0])
        next[1].callback()
      }
      time = target
    },
    get pending() { return timers.size },
  }
}

function setup() {
  const timers = clock()
  const tracker = createRequestTracker(timers)
  return { timers, tracker, run: createRequestRunner({ tracker, ...timers }) }
}

test('quick requests never flash a status and clean up their timers', () => {
  const { timers, tracker } = setup()
  let notifications = 0
  tracker.subscribe(() => { notifications++ })
  const finish = tracker.start({ kind: 'mutation' })
  timers.advance(349)
  finish(); finish()
  timers.advance(30000)
  assert.equal(notifications, 0)
  assert.deepEqual(tracker.getSnapshot(), [])
  assert.equal(timers.pending, 0)
})

test('a delayed submission becomes visible then shows slow guidance and disappears on completion', () => {
  const { timers, tracker } = setup()
  const finish = tracker.start({ kind: 'mutation' })
  timers.advance(350)
  assert.equal(tracker.getSnapshot()[0].kind, 'mutation')
  assert.equal(tracker.getSnapshot()[0].slow, false)
  timers.advance(7650)
  assert.equal(tracker.getSnapshot()[0].slow, true)
  finish()
  assert.deepEqual(tracker.getSnapshot(), [])
})

test('concurrent foreground operations remain visible independently and background polling stays quiet', () => {
  const { timers, tracker } = setup()
  const read = tracker.start()
  const mutation = tracker.start({ kind: 'mutation' })
  const poll = tracker.start({ kind: 'mutation', background: true })
  timers.advance(9000)
  assert.equal(tracker.getSnapshot().length, 2)
  mutation()
  assert.equal(tracker.getSnapshot().length, 1)
  assert.equal(tracker.getSnapshot()[0].kind, 'read')
  read(); poll()
  assert.deepEqual(tracker.getSnapshot(), [])
  assert.equal(timers.pending, 0)
})

test('one request lifecycle spans preparation and submission without hiding the wait indicator between them', async () => {
  const { timers, tracker, run } = setup()
  let csrfDone, postDone
  const preparation = new Promise(resolve => { csrfDone = resolve })
  const submission = new Promise(resolve => { postDone = resolve })
  const result = run(async ({ markSubmitted }) => { await preparation; markSubmitted(); return submission }, { kind: 'mutation' })
  await Promise.resolve()
  timers.advance(350)
  const initial = tracker.getSnapshot()[0].id
  csrfDone()
  await Promise.resolve()
  assert.equal(tracker.getSnapshot()[0].id, initial)
  postDone({ saved: true })
  assert.deepEqual(await result, { saved: true })
  assert.deepEqual(tracker.getSnapshot(), [])
  assert.equal(timers.pending, 0)
})

test('a stuck read aborts at the deadline and leaves an actionable timeout', async () => {
  const { timers, tracker, run } = setup()
  let signal, calls = 0
  const result = run(context => { signal = context.signal; calls++; return new Promise(() => {}) })
  const rejected = assert.rejects(result, error => error.code === 'timeout')
  await Promise.resolve()
  timers.advance(25000)
  await rejected
  assert.equal(signal.aborted, true)
  assert.equal(calls, 1)
  assert.deepEqual(tracker.getSnapshot(), [])
  assert.equal(timers.pending, 0)
})

test('a mutation that times out before submission is safe to distinguish from an unknown saved result', async () => {
  const { timers, run } = setup()
  const result = run(() => new Promise(() => {}), { kind: 'mutation' })
  const rejected = assert.rejects(result, error => error.code === 'timeout')
  timers.advance(25000)
  await rejected
})

test('a submitted mutation with a missing response reports an unknown result and never retries', async () => {
  const { timers, tracker, run } = setup()
  let calls = 0
  const result = run(({ markSubmitted }) => { calls++; markSubmitted(); return new Promise(() => {}) }, { kind: 'mutation' })
  const rejected = assert.rejects(result, error => error.code === 'resultUnknown')
  await Promise.resolve()
  timers.advance(25000)
  await rejected
  assert.equal(calls, 1)
  assert.deepEqual(tracker.getSnapshot(), [])
})

test('network failures after submission are ambiguous while server validation errors remain intact', async () => {
  const { run } = setup()
  await assert.rejects(run(({ markSubmitted }) => { markSubmitted(); throw new TypeError('Failed to fetch') }, { kind: 'mutation' }), error => error.code === 'resultUnknown')
  const invalid = new AppError('invalid', 422, ['phone'])
  await assert.rejects(run(({ markSubmitted }) => { markSubmitted(); throw invalid }, { kind: 'mutation' }), error => error === invalid)
})

test('navigation cancellation aborts a read and removes feedback without inventing a connection failure', async () => {
  const { timers, tracker, run } = setup()
  const controller = new AbortController()
  let signal
  const result = run(context => { signal = context.signal; return new Promise(() => {}) }, { signal: controller.signal })
  const rejected = assert.rejects(result, error => error.name === 'AbortError')
  await Promise.resolve()
  timers.advance(350)
  controller.abort()
  await rejected
  assert.equal(signal.aborted, true)
  assert.deepEqual(tracker.getSnapshot(), [])
  assert.equal(timers.pending, 0)
})

test('an already cancelled read does not start a request or show feedback', async () => {
  const { timers, tracker, run } = setup()
  const controller = new AbortController()
  controller.abort()
  let called = false
  await assert.rejects(run(() => { called = true }, { signal: controller.signal }), error => error.name === 'AbortError')
  assert.equal(called, false)
  assert.deepEqual(tracker.getSnapshot(), [])
  assert.equal(timers.pending, 0)
})
