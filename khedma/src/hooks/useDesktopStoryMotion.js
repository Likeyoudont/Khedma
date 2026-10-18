import { useEffect, useState } from 'react'
import { useSimpleMotion } from './useSimpleMotion'
import { usePreferences } from '../preferences/usePreferences'

const mediaQuery = '(min-width: 1024px) and (min-height: 650px)'

export function useDesktopStoryMotion() {
  const simple = useSimpleMotion()
  const { preferences } = usePreferences()
  const [largeViewport, setLargeViewport] = useState(() => window.matchMedia(mediaQuery).matches)
  useEffect(() => {
    const media = window.matchMedia(mediaQuery)
    const update = () => setLargeViewport(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  return largeViewport && !simple && !preferences.largeText && !preferences.storyStatic
}
