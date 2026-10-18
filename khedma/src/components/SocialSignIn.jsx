import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

export default function SocialSignIn({ role = 'ba7it' }) {
  const { t } = useTranslation()
  const [options, setOptions] = useState(null)
  useEffect(() => {
    if (import.meta.env.VITE_STATIC_PREVIEW === 'true') return undefined
    const controller = new AbortController()
    fetch('/api/auth/social/options', { signal: controller.signal, headers: { Accept: 'application/json' } })
      .then(response => { if (!response.ok) throw new Error(); return response.json() })
      .then(setOptions).catch(() => {})
    return () => controller.abort()
  }, [])
  const providers = ['google', 'apple'].filter(provider => options?.[provider])
  if (!providers.length) return null
  return <div className="social-sign-in mb-4">
    <div className="d-grid gap-2">
      {providers.map(provider => <a key={provider} className={`btn social-button social-${provider}`} href={`/api/auth/social/${provider}/redirect?role=${role}`}><span aria-hidden="true">{provider === 'google' ? 'G' : '●'}</span> {t(`social.${provider}`)}</a>)}
    </div>
    <p className="text-center small-muted mt-3 mb-0">{t('social.or')}</p>
  </div>
}
