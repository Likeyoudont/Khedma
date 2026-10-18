import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { phoneDigits } from '../account/phone'

export default function VisitSchedule({ error }) {
  const { t, i18n } = useTranslation()
  const id = useId()
  const [today] = useState(() => new Date())
  const [day, setDay] = useState(() => String(today.getDate()))
  const [month, setMonth] = useState(() => String(today.getMonth() + 1))
  const months = Array.from({ length: 12 }, (_, index) => new Intl.DateTimeFormat(i18n.language, { month: 'long', calendar: 'gregory' }).format(new Date(today.getFullYear(), index, 1)))
  const monthNumber = Number(month)
  const monthName = monthNumber >= 1 && monthNumber <= 12 ? months[monthNumber - 1] : ''
  function enterNumber(event, update) {
    const value = phoneDigits(event.target.value)
    if (/^\d{0,2}$/.test(value)) update(value)
  }
  return <fieldset className="visit-schedule" aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`}>
    <legend className="h6">{t('booking.scheduled')}</legend>
    <p id={`${id}-hint`} className="small-muted">{t('booking.dateHint', { year: today.getFullYear() })}</p>
    <div className="visit-schedule-grid">
      <label>{t('booking.day')}<input name="visit_day" type="text" inputMode="numeric" dir="ltr" className="form-control" value={day} onChange={event => enterNumber(event, setDay)} maxLength={2} pattern="[0-9]{1,2}" placeholder="1–31" autoComplete="off" required aria-invalid={!!error} /></label>
      <label>{t('booking.month')}<input name="visit_month" type="text" inputMode="numeric" dir="ltr" className="form-control" value={month} onChange={event => enterNumber(event, setMonth)} maxLength={2} pattern="[0-9]{1,2}" placeholder="1–12" autoComplete="off" list={`${id}-months`} required aria-describedby={`${id}-month-help ${id}-month-name`} aria-invalid={!!error} />
        <datalist id={`${id}-months`}>{months.map((name, index) => <option key={index} value={index + 1} label={name} />)}</datalist>
        <span id={`${id}-month-name`} className="visit-month-name" aria-live="polite">{monthName || t('booking.monthRange')}</span>
        <span id={`${id}-month-help`} className="visit-month-help">{t('booking.monthHelp', { example: months[5] })}</span>
      </label>
      <label>{t('booking.time')}<input name="visit_time" type="time" className="form-control" dir="ltr" required aria-invalid={!!error} /></label>
    </div>
    {error && <p id={`${id}-error`} role="alert" className="schedule-error">{t(error)}</p>}
  </fieldset>
}
