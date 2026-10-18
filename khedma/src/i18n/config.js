import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './locales/en.json'
import fr from './locales/fr.json'
import ar from './locales/ar.json'

let storedLanguage = 'en'
try { storedLanguage = localStorage.getItem('khedma-language') || 'en' } catch { /* Use English when browser storage is unavailable. */ }

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
      ar: { translation: ar },
    },
    lng: storedLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  })

if (typeof document !== 'undefined') {
  document.documentElement.lang = i18n.language
  document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr'
}

export default i18n