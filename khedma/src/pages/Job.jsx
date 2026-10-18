import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Link } from '../demo/navigation'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/useAuth'
import BookingMessages from '../components/BookingMessages'
import JobStatus from '../components/JobStatus'
import { useAppApi } from '../demo/useAppApi'
import VisitSchedule from '../components/VisitSchedule'
import { visitTime } from '../booking/scheduling'
import { workerPath } from '../booking/context'
import PracticePanel from '../components/PracticePanel'
import BookingFees, { FeeBreakdown } from '../components/BookingFees'
import { feeQuote } from '../booking/fees'
import { useSimpleMotion } from '../hooks/useSimpleMotion'

function Job() {
  const { id } = useParams()
  return <BookingDetail key={id} id={id} />
}

function BookingDetail({ id }) {
  const { bookingRequest } = useAppApi()
  const { user } = useAuth()
  const { t, i18n } = useTranslation()
  const simpleMotion = useSimpleMotion()
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [scheduleError, setScheduleError] = useState('')
  const [proposedPrice, setProposedPrice] = useState('')
  const [now, setNow] = useState(() => Date.now())
  const [refresh, setRefresh] = useState({ count: 0, foreground: true })
  const [confirmation, setConfirmation] = useState('')
  const [issueOpen, setIssueOpen] = useState(false)
  const issueToken = useRef(null)
  const confirmationRef = useRef(null)
  useEffect(() => {
    if (confirmation) { confirmationRef.current?.scrollIntoView({ block: 'center', behavior: simpleMotion ? 'auto' : 'smooth' }); confirmationRef.current?.querySelector('input, select, button')?.focus() }
  }, [confirmation, simpleMotion])
  useEffect(() => {
    let active = true
    const controller = new AbortController()
    bookingRequest(`/${id}`, undefined, { background: !refresh.foreground, signal: controller.signal }).then(data => { if (active) setJob(data) })
      .catch(err => { if (active && err.name !== 'AbortError') setError(err.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false; controller.abort() }
  }, [id, refresh, bookingRequest])
  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden && !busy) { setNow(Date.now()); setRefresh(value => ({ count: value.count + 1, foreground: false })) }
    }, 15000)
    return () => clearInterval(timer)
  }, [busy])
  async function mutate(path, body) {
    if (busy) return
    setBusy(true)
    setError('')
    try { setJob(await bookingRequest(`/${id}/${path}`, body)); setConfirmation(''); if (path === 'issue') { setIssueOpen(false); issueToken.current = null } }
    catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }
  function accept(event) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const schedule = visitTime({ month: fields.get('visit_month'), day: fields.get('visit_day'), time: fields.get('visit_time') })
    setScheduleError(schedule.error || '')
    if (schedule.error) return
    const price = Number(fields.get('price'))
    if (!String(fields.get('price') || '').trim() || !Number.isFinite(price) || price < 0 || price > 999999.99) { setError(t('booking.priceInvalid')); return }
    if (job.fees?.required && fields.get('fees_accepted') !== 'on') { setError(t('fees.consentRequired')); return }
    mutate('action', { action: 'accept', price, scheduled_at: schedule.scheduledAt, fees_accepted: fields.get('fees_accepted') === 'on' })
  }
  function confirmAction(event) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    mutate('action', confirmation === 'complete' ? { action: 'complete', completion_confirmed: fields.get('completion_confirmed') === 'on' } : { action: confirmation, reason: fields.get('reason') })
  }
  function reportIssue(event) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const details = { reason: fields.get('reason'), details: String(fields.get('details')).trim() }
    const signature = JSON.stringify(details)
    if (issueToken.current?.signature !== signature) issueToken.current = { signature, token: crypto.randomUUID() }
    mutate('issue', { ...details, client_token: issueToken.current.token })
  }
  function review(event) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    mutate('review', { rating: Number(fields.get('rating')), comment: fields.get('comment') })
  }
  const worker = user.role === 'mihaniy'
  const expired = job?.status === 'pending' && job.price != null && new Date(job.scheduledAt).getTime() <= now
  return <div className="container py-5 job-page"><div className="job-card mx-auto" style={{ maxWidth: 760 }}>
    <h1>{t('job.title')}</h1>
    <Link to="/dashboard">{t('job.back')}</Link>
    <button className="btn btn-outline-primary ms-3" disabled={busy || loading} onClick={() => { setLoading(true); setError(''); setRefresh(value => ({ count: value.count + 1, foreground: true })) }}>{t('booking.refresh')}</button>
    {error && <p className="text-danger mt-3" role="alert">{error}</p>}
    {loading && !job ? <p role="status">{t('common.loading')}</p> : job && <>
      <JobStatus job={job} worker={worker} expired={expired} />
      <div className="job-summary">{[
        [worker ? 'booking.client' : 'job.worker', worker ? job.clientName : job.workerName],
        ['job.service', t(`services.${job.service}.name`)],
        ['job.location', job.location], ['job.status', t(`dashboard.status.${job.status}`)],
        ['job.price', job.price == null ? t('job.awaitingProposal') : `${job.price} DH`],
        ['booking.scheduled', job.scheduledAt ? new Date(job.scheduledAt).toLocaleString(i18n.language) : t('job.awaitingProposal')],
      ].filter(([label]) => !(job.price == null && ['job.price', 'booking.scheduled'].includes(label))).map(([label, value]) => <div className={`meta-row ${label === 'job.status' ? 'meta-status' : ''}`} key={label}><span>{t(label)}</span><strong>{!worker && label === 'job.worker' && job.workerId ? <Link className="job-participant-link" to={workerPath(job.workerId, job.service, job.location)}>{value} ↗</Link> : value}</strong></div>)}</div>
      {job.detailsLocked && <p role="status">{t('fees.detailsLocked')}</p>}
      {job.movingDetails && <dl className="moving-job-details">{Object.entries(job.movingDetails).filter(([, value]) => value).map(([key, value]) => <div className="meta-row" key={key}><dt>{t(`flow.moving.${key}`)}</dt><dd>{key === 'vehicle' ? t(`transportVehicles.${value}`) : key === 'helpers' ? t(`flow.helpers.${value}`) : value}</dd></div>)}</dl>}
      {job.cancellationReason && <p>{t('flow.reason')}: {t(`flow.cancelReasons.${job.cancellationReason}`)}</p>}
      <p className="mt-4" style={{ whiteSpace: 'pre-wrap' }}>{job.description}</p>
      {expired && <p role="alert" className="schedule-error">{t('booking.proposalExpired')}</p>}
      {!worker && job.workerPhone && <p>{t('job.contactInfo')}: <a href={`tel:${job.workerPhone}`}>{job.workerPhone}</a></p>}
      {worker && job.clientPhone && <p>{t('job.contactInfo')}: <a href={`tel:${job.clientPhone}`}>{job.clientPhone}</a></p>}
      <fieldset disabled={busy || loading} className="job-actions" aria-label={t('flow.nextStep')}>
        {['pending', 'confirmed', 'in_progress'].includes(job.status) && <div className="job-action-heading">{(worker || job.status !== 'pending' || job.price != null) && <h2 className="h5">{t('flow.nextStep')}</h2>}<a href="#conversation-title">{t('communication.title')} ↓</a></div>}
        {!worker && job.status === 'pending' && job.price != null && <form className="d-grid gap-3" onSubmit={event => {
          event.preventDefault()
          const consent = new FormData(event.currentTarget).get('fees_accepted') === 'on'
          if (job.fees?.required && !consent) { setError(t('fees.consentRequired')); return }
          mutate('action', { action: 'confirm', fees_accepted: consent })
        }}>
          {job.fees?.required && <><FeeBreakdown quote={job.fees.quote} worker={false} /><label className="fee-consent"><input type="checkbox" name="fees_accepted" required />{t('fees.clientConsent')}</label></>}
          <button className="btn btn-success" disabled={expired}>{t('booking.confirm')}</button>
        </form>}
        {worker && job.status === 'pending' && job.price == null && <form id="worker-proposal" onSubmit={accept} noValidate className="d-grid gap-3 mt-4">
          <p>{t('booking.agreedDetails')}</p>
          <label>{t('job.price')} (DH)<input name="price" className="form-control" type="number" min="0" max="999999.99" step="0.01" required onChange={event => setProposedPrice(event.target.value)} /></label>
          {job.fees?.required && <><FeeBreakdown quote={feeQuote(proposedPrice)} worker /><label className="fee-consent"><input type="checkbox" name="fees_accepted" required />{t('fees.workerConsent')}</label></>}
          <VisitSchedule error={scheduleError} />
          <button className="btn btn-success">{t('booking.propose')}</button>
          <button type="button" className="btn btn-outline-danger" onClick={() => setConfirmation('decline')}>{t('dashboard.declineButton')}</button>
        </form>}
        {job.status === 'confirmed' && job.fees?.required && !job.fees.unlocked && <a className="btn btn-primary" href="#booking-fees-title">{t(job.fees.ownPayment?.status === 'pending' ? 'fees.openPayment' : 'fees.waitOther')}</a>}
        {worker && job.status === 'confirmed' && <button className="btn btn-success mt-3" disabled={job.fees?.required && !job.fees.unlocked} onClick={() => mutate('action', { action: 'start' })}>{t('booking.start')}</button>}
        {['pending', 'confirmed'].includes(job.status) && <button className="btn btn-outline-danger mt-3" onClick={() => setConfirmation('cancel')}>{t('dashboard.cancelButton')}</button>}
        {!worker && job.status === 'in_progress' && <button className="btn btn-primary mt-3 ms-2" onClick={() => setConfirmation('complete')}>{t('job.markComplete')}</button>}
        {!worker && job.status === 'confirmed' && <p className="small-muted mt-3" role="status">{t('flow.waitForStart')}</p>}
        {job.status === 'in_progress' && <p className="small-muted mt-3">{t('flow.workStarted')}</p>}
        {confirmation && <form ref={confirmationRef} className="action-confirmation form-grid mt-3" onSubmit={confirmAction}>
          <h2 className="h5">{t(confirmation === 'complete' ? 'flow.completeTitle' : 'flow.cancelTitle')}</h2>
          {confirmation === 'complete' ? <label className="checkbox-chip"><input name="completion_confirmed" type="checkbox" required />{t('flow.completeCheck')}</label> : <>
            <p>{t('flow.cancelHelp')}</p>
            <label>{t('flow.reason')}<select name="reason" className="form-select" required defaultValue=""><option value="" disabled>{t('flow.chooseReason')}</option>{['changed_plans', 'no_response', 'unavailable', 'no_show', 'other'].map(key => <option key={key} value={key}>{t(`flow.cancelReasons.${key}`)}</option>)}</select></label>
          </>}
          <div className="d-flex flex-wrap gap-2"><button type="submit" className={`btn ${confirmation === 'complete' ? 'btn-primary' : 'btn-danger'}`}>{t(confirmation === 'complete' ? 'flow.confirmComplete' : 'flow.confirmCancel')}</button><button type="button" className="btn btn-outline-primary" onClick={() => setConfirmation('')}>{t('flow.keepJob')}</button></div>
        </form>}
        <button type="button" className="btn btn-outline-primary mt-3 d-block" aria-expanded={issueOpen} onClick={() => setIssueOpen(value => !value)}>{t('flow.reportProblem')}</button>
        {issueOpen && <form className="action-confirmation form-grid mt-3" onSubmit={reportIssue}>
          <p>{t('flow.reportHelp')}</p><label>{t('flow.reason')}<select name="reason" className="form-select" required defaultValue=""><option value="" disabled>{t('flow.chooseReason')}</option>{['no_show', 'quality', 'price', 'safety', 'other'].map(key => <option key={key} value={key}>{t(`flow.issueReasons.${key}`)}</option>)}</select></label>
          <label>{t('flow.problemDetails')}<textarea name="details" className="form-control" required maxLength={1500} rows={3} /></label>
          <button type="submit" className="btn btn-primary">{t('flow.saveReport')}</button>
        </form>}
        {job.issues?.map(issue => <article key={issue.id} className="issue-note mt-3"><strong>{issue.sender} · {t(`flow.issueReasons.${issue.reason}`)}</strong><time className="d-block small-muted" dateTime={issue.createdAt}>{new Date(issue.createdAt).toLocaleString(i18n.language)}</time><p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{issue.details}</p></article>)}
        {job.rating ? <p className="mt-4">{t('job.alreadyRated')}: {'★'.repeat(job.rating)} {job.comment}</p> : !worker && job.status === 'completed' && <form className="d-grid gap-3 mt-4" onSubmit={review}>
          <label>{t('job.rateJob')}<select name="rating" className="form-select" required defaultValue=""><option value="" disabled>—</option>{[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{'★'.repeat(n)}</option>)}</select></label>
          <label>{t('booking.comment')}<textarea name="comment" className="form-control" maxLength={1500} /></label>
          <button className="btn btn-primary">{t('booking.submitReview')}</button>
        </form>}
      </fieldset>
      <p className="small-muted">{t(job.fees?.required ? 'fees.separate' : 'job.paymentText')}</p>
      <BookingFees job={job} worker={worker} onChange={setJob} now={now} />
      <PracticePanel job={job} onChange={setJob} />
      <BookingMessages id={id} status={job.status} contactsLocked={job.fees?.required && !job.fees.unlocked} />
    </>}
  </div></div>
}
export default Job
