import { useEffect, useState } from 'react'

// Phones use immediate navigation and a static home screen.
export function useSimpleMotion() {
  const [simple, setSimple] = useState(() => window.matchMedia('(max-width: 767.98px), (prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.reduceMotion === 'true')
  useEffect(() => {
    const media = window.matchMedia('(max-width: 767.98px), (prefers-reduced-motion: reduce)')
    const update = () => setSimple(media.matches || document.documentElement.dataset.reduceMotion === 'true')
    const observer = new MutationObserver(update)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-reduce-motion'] })
    media.addEventListener('change', update)
    return () => { observer.disconnect(); media.removeEventListener('change', update) }
  }, [])
  return simple
}
