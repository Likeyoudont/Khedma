import { useTranslation } from 'react-i18next'
import { usePreferences } from '../preferences/usePreferences'

export default function ThemeSwitch() {
  const { t } = useTranslation()
  const { preferences, update } = usePreferences()
  const dark = preferences.theme === 'dark'
  return (
    <button type="button" className="theme-toggle" role="switch" aria-checked={dark}
      aria-label={`${t('common.appearance')}: ${t('common.dark')}`}
      title={`${t('common.appearance')}: ${t(`common.${dark ? 'light' : 'dark'}`)}`}
      onClick={() => update('theme', dark ? 'light' : 'dark')}>
      <svg className="theme-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></svg>
      <svg className="theme-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.8 13A9 9 0 0 1 11 3.2 9 9 0 1 0 20.8 13Z" /></svg>
      <span className="theme-toggle-thumb" aria-hidden="true" />
    </button>
  )
}
