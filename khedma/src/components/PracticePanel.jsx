import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDemo } from '../demo/DemoContext'
import { translatedError } from '../api/errors'

export default function PracticePanel({ job, onChange }) {
  const demo = useDemo()
  const { t, i18n } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (!demo || demo.role !== 'worker' || !job.practice) return null
  const stage = job.status === 'completed' ? 'finished' : job.status === 'cancelled' ? 'cancelled' : job.status === 'in_progress' ? 'finish' : job.status === 'confirmed' ? job.fees?.required && !job.fees.unlocked ? 'fees' : 'start' : job.price != null ? 'confirm' : 'reply'
  const stages = ['reply', 'offer', 'confirm', 'fees', 'start', 'finish', 'finished']
  const step = stages.indexOf(stage)
  const canAct = ['confirm', 'finish'].includes(stage) || (stage === 'reply' && demo.canPracticeReply)
  async function clientTurn() {
    if (busy || !canAct) return
    setBusy(true); setError('')
    try {
      onChange(await demo.practiceClient(job.id, {
        reply: t('practice.clientReply'), accept: t('practice.clientAccept', { price: job.price, date: new Date(job.scheduledAt).toLocaleString(i18n.language) }),
        done: t('practice.clientDone'), review: t('practice.clientReview'),
      }))
    } catch (err) { setError(translatedError(err, t).message) }
    finally { setBusy(false) }
  }
  return <section className="practice-panel" aria-labelledby="practice-title">
    <h2 id="practice-title">{t('practice.title')}</h2>
    <ol className="practice-progress" aria-label={t('flow.progress', { step: Math.min(stages.length - 1, step + 1), total: stages.length - 1 })}>{stages.slice(0, -1).map((key, index) => <li key={key} className={index <= step ? 'done' : ''} aria-label={t(`practice.steps.${key}`)} aria-current={index === step ? 'step' : undefined} />)}</ol>
    <p>{t(`practice.steps.${stage}`)}</p>
    {stage === 'reply' && <div className="practice-quick-links"><a href="#conversation-title">{t('communication.title')} ↓</a><a href="#worker-proposal">{t('booking.propose')} ↓</a></div>}
    {['reply', 'confirm', 'finish'].includes(stage) && <button type="button" className="btn btn-outline-primary" disabled={busy || !canAct} onClick={clientTurn}>{t(`practice.actions.${stage}`)}</button>}
    {error && <p className="text-danger mt-2" role="alert">{error}</p>}
    <details className="practice-note"><summary>{t('flow.demoDetails')}</summary><p>{t('practice.notice')}</p></details>
  </section>
}
