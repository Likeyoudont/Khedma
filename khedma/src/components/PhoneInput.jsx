import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { phoneDigits, phoneFeedback } from '../account/phone'

export default function PhoneInput({ id, value, defaultValue = '', onChange, required = false, className = 'form-control', ...props }) {
  const { t } = useTranslation()
  const input = useRef(null)
  const [typed, setTyped] = useState(defaultValue)
  const [touched, setTouched] = useState(false)
  const current = value ?? typed
  const feedback = phoneFeedback(current)
  const messageFor = result => result.valid ? '' : t(result.kind === 'local' ? 'phone.localError' : result.kind === 'moroccoInternational' ? 'phone.internationalError' : 'phone.invalid')
  const error = messageFor(feedback)
  useEffect(() => { input.current?.setCustomValidity(error) }, [error])
  return <div className="phone-field">
    <input {...props} ref={input} id={id} name="phone" type="tel" dir="ltr" inputMode="tel" autoComplete="tel" maxLength={40}
      placeholder="0612345678" className={className} required={required} value={current}
      aria-describedby={`${id}-help ${id}-count`} aria-invalid={touched && !feedback.valid ? true : undefined}
      onBlur={() => setTouched(true)} onChange={event => {
        const next = phoneDigits(event.target.value)
        event.target.value = next
        event.target.setCustomValidity(messageFor(phoneFeedback(next)))
        setTyped(next)
        onChange?.(event)
      }} />
    <p id={`${id}-help`} className="phone-help">{t('phone.help')}</p>
    <p id={`${id}-count`} className={`phone-count ${touched && error ? 'text-danger' : ''}`} aria-live="polite">
      {feedback.kind === 'local' ? t('phone.localCount', { count: feedback.count }) : feedback.kind === 'moroccoInternational' ? t('phone.internationalCount', { count: feedback.count }) : feedback.valid && feedback.kind !== 'empty' ? t('phone.ready') : touched && error ? error : t('phone.example')}
    </p>
  </div>
}
