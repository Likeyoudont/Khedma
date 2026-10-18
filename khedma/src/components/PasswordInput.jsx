import { useState } from 'react'
import { useTranslation } from 'react-i18next'
export default function PasswordInput(props) {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)
  return <div className="password-input-wrap">
    <input {...props} type={visible ? 'text' : 'password'} className="form-control" />
    <button type="button" className="password-toggle" aria-controls={props.id} aria-pressed={visible} onClick={() => setVisible(!visible)}>{t(visible ? 'settings.hide' : 'settings.show')}</button>
  </div>
}
