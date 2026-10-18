import { useEffect, useRef, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { requestTracker } from '../api/request-state'
import './request-status.css'

const empty = []

export default function RequestStatus() {
  const requests = useSyncExternalStore(requestTracker.subscribe, requestTracker.getSnapshot, () => empty)
  const { t } = useTranslation()
  const statusRef = useRef(null)
  const blocking = requests.some(request => request.kind === 'mutation')
  const slow = requests.some(request => request.slow && (!blocking || request.kind === 'mutation'))

  useEffect(() => {
    if (!blocking) return undefined
    const previousFocus = document.activeElement
    const statusElement = statusRef.current
    const shell = statusElement?.closest('.app-shell')
    const original = new Map()
    const lockRegions = () => {
      for (const element of shell?.children || []) {
        if (element.classList.contains('request-feedback')) continue
        if (!original.has(element)) original.set(element, element.inert)
        element.inert = true
      }
    }
    lockRegions()
    // Focusing this status can mount the phone navigation after an input loses
    // focus. Keep new page regions blocked for the full submission as well.
    const observer = new MutationObserver(lockRegions)
    if (shell) observer.observe(shell, { childList: true })
    statusRef.current?.focus({ preventScroll: true })
    return () => {
      observer.disconnect()
      original.forEach((wasInert, element) => { element.inert = wasInert })
      // Do not pull focus away from a newly opened page after a successful action.
      if (previousFocus?.isConnected && (document.activeElement === statusElement || document.activeElement === document.body)) previousFocus.focus({ preventScroll: true })
    }
  }, [blocking])

  if (!requests.length) return null
  return <div className={`request-feedback ${blocking ? 'request-feedback-blocking' : 'request-feedback-reading'}`}>
    <div className="request-feedback-card" ref={statusRef} tabIndex={-1} role="status" aria-live="polite" aria-atomic="true">
      <span className="request-feedback-spinner" aria-hidden="true"><span /></span>
      <strong>{t(blocking ? 'processing.sending' : 'processing.loading')}</strong>
      <p>{t(slow ? (blocking ? 'processing.slowSending' : 'processing.slowLoading') : (blocking ? 'processing.wait' : 'processing.loadHelp'))}</p>
      {slow && <span className="request-feedback-note">{t('processing.boundedWait')}</span>}
    </div>
  </div>
}
