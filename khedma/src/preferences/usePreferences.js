import { useSyncExternalStore } from 'react'
const key = 'khedma-preferences'
const defaults = { reduceMotion: false, largeText: false, storyStatic: false, theme: 'light' }
let current = defaults
try { current = { ...defaults, ...JSON.parse(localStorage.getItem(key) || '{}') } } catch { /* Use defaults when browser storage is unavailable. */ }
const listeners = new Set()
function apply() {
  document.documentElement.dataset.theme = current.theme === 'dark' ? 'dark' : 'light'
  document.documentElement.dataset.bsTheme = current.theme === 'dark' ? 'dark' : 'light'
  document.documentElement.dataset.reduceMotion = current.reduceMotion ? 'true' : 'false'
  document.documentElement.dataset.largeText = current.largeText ? 'true' : 'false'
}
apply()
function subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) }
export function usePreferences() {
  const preferences = useSyncExternalStore(subscribe, () => current)
  function update(name, value) {
    const next = { ...current, [name]: value }
    try { localStorage.setItem(key, JSON.stringify(next)) } catch { /* Apply preferences even when storage is unavailable. */ }
    current = next
    apply()
    listeners.forEach(listener => listener())
  }
  return { preferences, update }
}
window.addEventListener('storage', event => {
  if (event.key !== key) return
  try { current = { ...defaults, ...JSON.parse(event.newValue || '{}') }; apply(); listeners.forEach(listener => listener()) } catch { /* Ignore malformed preferences. */ }
})
