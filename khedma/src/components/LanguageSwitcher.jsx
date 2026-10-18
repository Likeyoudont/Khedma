import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

const languages = [
  { code: 'ar', label: 'العربية' },
  { code: 'fr', label: 'FR' },
  { code: 'en', label: 'EN' },
]

function LanguageSwitcher() {
  const { i18n, t } = useTranslation()

  useEffect(() => {
    const code = i18n.resolvedLanguage || i18n.language
    document.documentElement.dir = code === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = code
  }, [i18n.language, i18n.resolvedLanguage])

  const changeLanguage = (code) => {
    i18n.changeLanguage(code)
    try { localStorage.setItem('khedma-language', code) } catch { /* Keep language usable when storage is unavailable. */ }
  }

  return (
    <div role="group" className="language-options" aria-label={t('common.language')}>
      {languages.map((lang) => (
        <button
          key={lang.code}
          type="button"
          lang={lang.code}
          onClick={() => changeLanguage(lang.code)}
          aria-pressed={i18n.resolvedLanguage === lang.code}
          className={`language-option ${i18n.resolvedLanguage === lang.code ? 'is-active' : ''}`}
        >
          {lang.label}
        </button>
      ))}
    </div>
  )
}

export default LanguageSwitcher
