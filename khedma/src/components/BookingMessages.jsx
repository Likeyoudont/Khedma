import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppApi } from '../demo/useAppApi'
import { useDemo } from '../demo/DemoContext'

export default function BookingMessages({ id, status, contactsLocked }) {
  const { bookingRequest } = useAppApi()
  const demo = useDemo()
  const { t, i18n } = useTranslation()
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [older, setOlder] = useState(false)
  const token = useRef(null)
  const closed = !['pending', 'confirmed', 'in_progress'].includes(status)
  useEffect(() => {
    let active = true, running = false
    async function load() {
      if (running || document.hidden) return
      running = true
      try {
        const data = await bookingRequest(`/${id}/messages`, undefined, { background: true })
        if (!active) return
        setMessages(previous => [...new Map([...previous, ...data.messages].map(item => [item.id, item])).values()].sort((a, b) => a.id - b.id))
        setOlder(data.hasOlder)
        setError('')
        const unread = data.messages.filter(item => item.unread)
        if (unread.length) await bookingRequest(`/${id}/messages/read`, { through_id: unread.at(-1).id }, { background: true })
      } catch (err) { if (active) setError(err.message) }
      finally { running = false }
    }
    load()
    const timer = setInterval(load, 10000)
    document.addEventListener('visibilitychange', load)
    return () => { active = false; clearInterval(timer); document.removeEventListener('visibilitychange', load) }
  }, [id, bookingRequest, demo?.messageRevision])
  async function loadOlder() {
    setBusy(true)
    try {
      const data = await bookingRequest(`/${id}/messages?before=${messages[0].id}`)
      setMessages(previous => [...new Map([...data.messages, ...previous].map(item => [item.id, item])).values()].sort((a, b) => a.id - b.id))
      setOlder(data.hasOlder)
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }
  async function send(event) {
    event.preventDefault()
    if (busy || closed || !draft.trim()) return
    setBusy(true); setError('')
    token.current ||= crypto.randomUUID()
    try {
      const message = await bookingRequest(`/${id}/messages`, { body: draft.trim(), client_token: token.current })
      setMessages(previous => [...new Map([...previous, message].map(item => [item.id, item])).values()].sort((a, b) => a.id - b.id))
      setDraft(''); token.current = null
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }
  return <section className="booking-conversation mt-4 border-top pt-4" aria-labelledby="conversation-title">
    <h2 id="conversation-title" className="h4">{t('communication.title')}</h2>
    <p className="small-muted">{t(contactsLocked ? 'fees.contactHint' : 'communication.hint')}</p>
    {error && <p role="alert" className="text-danger">{error}</p>}
    {older && messages.length > 0 && <button className="btn btn-outline-primary mb-3" disabled={busy} onClick={loadOlder}>{t('communication.older')}</button>}
    <div role="log" aria-label={t('communication.title')} aria-live="polite" style={{ maxHeight: 400, overflowY: 'auto' }}>
      {!messages.length && <p>{t('communication.empty')}</p>}
      {messages.map(message => <article key={message.id} className={`p-3 mb-2 rounded ${message.mine ? 'bg-light' : 'border'}`}>
        <strong>{message.mine ? t('communication.you') : message.sender}</strong>
        <p className="mb-1" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{message.body}</p>
        <time className="small-muted" dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString(i18n.language)}</time>
      </article>)}
    </div>
    {closed ? <p>{t('communication.closed')}</p> : <form onSubmit={send} className="d-grid gap-2 mt-3">
      <label htmlFor="booking-message">{t('communication.label')}</label>
      <textarea id="booking-message" className="form-control" maxLength={2000} required value={draft} disabled={busy} onChange={event => { setDraft(event.target.value); token.current = null }} />
      <button className="btn btn-primary" disabled={busy || !draft.trim()}>{t('communication.send')}</button>
    </form>}
  </section>
}
