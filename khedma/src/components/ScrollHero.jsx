import { useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useDesktopStoryMotion } from '../hooks/useDesktopStoryMotion'
import { useSimpleMotion } from '../hooks/useSimpleMotion'
import HomeScene from './HomeScene'
import SearchBar from './SearchBar'
import { usePreferences } from '../preferences/usePreferences'

gsap.registerPlugin(ScrollTrigger)

export default function ScrollHero({ cities }) {
  const { t, i18n } = useTranslation()
  const animated = useDesktopStoryMotion()
  const simple = useSimpleMotion()
  const { preferences, update } = usePreferences()
  const root = useRef(null)
  const [connected, setConnected] = useState(false)

  useLayoutEffect(() => {
    if (!animated) return undefined
    const context = gsap.context(() => {
      const direction = i18n.dir() === 'rtl' ? -1 : 1
      gsap.set('.hero-subtitle-next', { autoAlpha: 0, y: 14 })
      gsap.set('.hero-scene-trade', { autoAlpha: 0, scale: .75, y: 24 })
      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: () => `top top+=${document.querySelector('.site-navigation')?.offsetHeight || 80}`,
          end: 'bottom bottom',
          scrub: 1.15,
          invalidateOnRefresh: true,
        },
      })
      timeline.to('.home-scene-art', { scale: 1.12, rotation: -4 * direction, xPercent: -3 * direction, duration: 1, ease: 'none', transformOrigin: '50% 65%' }, 0)
      timeline.to('.scene-orbit', { scale: 1.25, rotation: 30, duration: 1, ease: 'none' }, 0)
      timeline.fromTo('.scene-furniture', { y: 20 }, { y: 0, duration: .65, ease: 'power2.out' }, 0)
      timeline.fromTo('.scene-plant', { y: 12 }, { y: -8, duration: 1, ease: 'none' }, 0)
      timeline.to('.scene-lamp-glow', { opacity: .9, duration: .4 }, .4)
      timeline.to('.scene-window', { x: -5 * direction, y: -5, duration: 1, ease: 'none' }, 0)
      timeline.to('.hero-title-accent', { x: 8 * direction, duration: 1, ease: 'none' }, 0)
      timeline.to('.scene-label-top', { y: -12, duration: 1, ease: 'none' }, 0)
      timeline.to('.scene-label-bottom', { y: 12, duration: 1, ease: 'none' }, 0)
      timeline.to('.hero-subtitle-first', { autoAlpha: 0, y: -14, duration: .15 }, .35)
      timeline.to('.hero-subtitle-next', { autoAlpha: 1, y: 0, duration: .2 }, .48)
      timeline.to('.hero-scene-trade', { autoAlpha: 1, scale: 1, y: 0, duration: .25, stagger: .06 }, .28)
      timeline.to(root.current, { '--hero-progress': 1, duration: 1, ease: 'none' }, 0)
      let previousConnected
      const syncConnection = () => {
        const nextConnected = timeline.progress() >= .5
        if (nextConnected !== previousConnected) {
          previousConnected = nextConnected
          setConnected(nextConnected)
        }
      }
      timeline.eventCallback('onUpdate', syncConnection)
      syncConnection()
      const refresh = requestAnimationFrame(() => ScrollTrigger.refresh())
      return () => cancelAnimationFrame(refresh)
    }, root)
    return () => context.revert()
  }, [animated, i18n, t])

  return <div ref={root} className={`hero-scroll-stage ${animated ? 'hero-story-animated' : ''}`}>
    <section className="hero-section" aria-labelledby="home-title">
      <div className="hero-content container">
        <div className="hero-copy">
          <div className="hero-eyebrow"><span className="hero-eyebrow-mark" />{t('home.heroEyebrow')}</div>
          <h1 id="home-title"><span className="desktop-home-title">{t('home.heroTitleLineOne')}<br /><em className="hero-title-accent">{t('home.heroTitleLineTwo')}</em></span><span className="mobile-home-title">{t('home.mobileTitle')}</span></h1>
          <div className="hero-subtitle-stack desktop-home-copy">
            <p className="hero-subtitle hero-subtitle-first" aria-hidden={animated && connected ? true : undefined}>{t('home.heroSubtitle')}</p>
            {animated && <p className="hero-subtitle hero-subtitle-next" aria-hidden={!connected ? true : undefined}>{t('heroScroll.connection')}</p>}
          </div>
          <p className="mobile-home-subtitle">{t('home.mobileSubtitle')}</p>
          <a className="hero-service-link" href="#services">{t('home.browseAll')} <span aria-hidden="true">↗</span></a>
        </div>
        <HomeScene showTrades={animated} />
        <div className="hero-search-panel">
          <span className="hero-search-caption">{t('home.searchPrompt')}</span>
          <p className="hero-panel-note">{t('home.searchNote')}</p>
          <SearchBar simple cities={cities} />
          <div className="hero-trust-row"><span aria-hidden="true">✓</span><span>{t('home.agreeFirst')}</span></div>
        </div>
      </div>
      <div className="hero-bottomline container">
        <span>{animated ? t(connected ? 'heroScroll.connected' : 'heroScroll.start') : t('home.heroLocation')}</span>
        {animated && <span className="hero-scroll-progress" aria-hidden="true"><span /></span>}
        {!simple && !preferences.largeText && <button type="button" className="story-mode-button" aria-pressed={Boolean(preferences.storyStatic)} onClick={() => update('storyStatic', !preferences.storyStatic)}>{t(preferences.storyStatic ? 'storyControls.animate' : 'storyControls.read')}</button>}
        <a href="#how-it-works" className="hero-scroll-cue" onClick={event => {
          event.preventDefault()
          document.getElementById('how-it-works')?.scrollIntoView({ behavior: simple ? 'auto' : 'smooth', block: 'start' })
        }}>{t('showcase.scrollCue')} <span aria-hidden="true">↓</span></a>
      </div>
    </section>
  </div>
}
