import { AppError } from './errors-core.js'

export const REQUEST_DELAY_MS = 350
export const REQUEST_SLOW_MS = 8000
export const REQUEST_TIMEOUT_MS = 25000

// Keep a stable snapshot for useSyncExternalStore. Background requests still
// have a deadline, but never interrupt someone reading or writing a form.
export function createRequestTracker({ setTimer = setTimeout, clearTimer = clearTimeout, delayMs = REQUEST_DELAY_MS, slowMs = REQUEST_SLOW_MS } = {}) {
  const entries = new Map()
  const listeners = new Set()
  let snapshot = []
  let nextId = 0
  const publish = () => {
    snapshot = [...entries.values()].filter(entry => entry.visible).map(({ id, kind, slow }) => ({ id, kind, slow }))
    listeners.forEach(listener => listener())
  }
  return {
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
    getSnapshot() { return snapshot },
    start({ kind = 'read', background = false } = {}) {
      if (background) return () => {}
      const entry = { id: ++nextId, kind, visible: false, slow: false }
      entries.set(entry.id, entry)
      const show = setTimer(() => { entry.visible = true; publish() }, delayMs)
      const slow = setTimer(() => { entry.slow = true; if (entry.visible) publish() }, slowMs)
      let finished = false
      return () => {
        if (finished) return
        finished = true
        clearTimer(show)
        clearTimer(slow)
        entries.delete(entry.id)
        if (entry.visible) publish()
      }
    },
  }
}

export const requestTracker = createRequestTracker()

export function createRequestRunner({ tracker = requestTracker, setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
  return async function runRequest(operation, { kind = 'read', background = false, signal, timeoutMs = REQUEST_TIMEOUT_MS } = {}) {
    if (signal?.aborted) throw signal.reason || new DOMException('Aborted', 'AbortError')
    const finish = tracker.start({ kind, background })
    const controller = new AbortController()
    let submitted = false
    let rejectDeadline
    const interrupted = new Promise((_, reject) => { rejectDeadline = reject })
    const interrupt = error => {
      controller.abort(error)
      rejectDeadline(error)
    }
    const abort = () => interrupt(signal.reason || new DOMException('Aborted', 'AbortError'))
    signal?.addEventListener('abort', abort, { once: true })
    const timer = setTimer(() => interrupt(new AppError(kind === 'mutation' && submitted ? 'resultUnknown' : 'timeout')), timeoutMs)
    try {
      return await Promise.race([
        Promise.resolve().then(() => operation({ signal: controller.signal, markSubmitted: () => { submitted = true } })),
        interrupted,
      ])
    } catch (error) {
      // A network break after submitting is ambiguous: the server may have
      // committed the change. Never retry it automatically or claim it failed.
      if (kind === 'mutation' && submitted && !error.code) throw new AppError('resultUnknown')
      throw error
    } finally {
      clearTimer(timer)
      signal?.removeEventListener('abort', abort)
      finish()
    }
  }
}

export const runRequest = createRequestRunner()
