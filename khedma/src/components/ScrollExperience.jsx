import { demosEnabled } from '../config/deployment'
import { useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useDesktopStoryMotion } from '../hooks/useDesktopStoryMotion'

gsap.registerPlugin(ScrollTrigger)
const steps = ['service', 'worker', 'talk', 'fees', 'confirm']

function FeeScreen({ t, worker = false }) {
  return <>
    <span className="experience-screen-kicker">{t('showcase.example')} · 10%</span>
    <h4>{t('showcase.feeScreen.screen')}</h4>
    <div className="experience-fee-price"><span>{t('fees.base')}</span><strong>200 <small>DH</small></strong></div>
    <div className="experience-confirm-summary">
      <div><span>{t('fees.clientFee')}</span><strong>20 DH</strong></div>
      <div><span>{t('fees.workerFee')}</span><strong>20 DH</strong></div>
      <div className="experience-fee-total"><span>{t(worker ? 'fees.workerNet' : 'fees.clientTotal')}</span><strong>{worker ? '180' : '220'} DH</strong></div>
    </div>
    <p className="experience-worker-note">{t('showcase.feeScreen.note')}</p>
    <span className="experience-fee-unlock"><Check />{t('showcase.feeScreen.unlock')}</span>
  </>
}

function Check() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4L19 6" /></svg>
}

function RoleChoice({ role, onChange, t }) {
  return <div className="experience-role-choice" role="group" aria-label={t('showcase.roleChoice')}>
    {['client', 'worker'].map(value => <button key={value} type="button" data-story-role={value} aria-pressed={role === value} onClick={() => onChange(value)}>{t(`showcase.roles.${value}`)}</button>)}
  </div>
}

function WorkerScreen({ step, t }) {
  if (step === 'fees') return <FeeScreen t={t} worker />
  if (step === 'service') return <>
    <span className="experience-screen-kicker">{t('showcase.worker.profileKicker')}</span>
    <h4>{t('showcase.worker.screenProfile')}</h4>
    <div className="experience-person"><span className="experience-person-avatar">Y</span><div><strong>{t('showcase.worker.yourProfile')}</strong><span>Rabat · {t('services.electricity.name')}</span></div></div>
    <div className="experience-profile-lines">{['specialty', 'area', 'available'].map(key => <div key={key}><span className="experience-line-icon"><Check /></span><span>{t(`showcase.worker.${key}`)}</span></div>)}</div>
    <span className="experience-example-button">{t('showcase.worker.saveProfile')} <span>→</span></span>
  </>
  if (step === 'worker') return <>
    <span className="experience-screen-kicker">{t('showcase.worker.newRequest')}</span>
    <h4>{t('showcase.worker.screenRequest')}</h4>
    <div className="experience-request-note"><span>Rabat · {t('services.electricity.name')}</span><strong>{t('showcase.worker.requestDescription')}</strong></div>
    <div className="experience-chat"><span>{t('showcase.clientMessage')}</span><span>{t('showcase.worker.requestReply')}</span></div>
    <span className="experience-example-button">{t('showcase.worker.reply')} <span>→</span></span>
  </>
  if (step === 'talk') return <>
    <span className="experience-screen-kicker">{t('showcase.worker.offerKicker')}</span>
    <h4>{t('showcase.worker.screenOffer')}</h4>
    <div className="experience-offer"><span>{t('job.price')} · {t('showcase.example')}</span><strong>200 <small>DH</small></strong><span>{t('showcase.visitTime')}</span></div>
    <p className="experience-worker-note">{t('showcase.worker.offerNote')}</p>
    <span className="experience-example-button">{t('showcase.worker.sendOffer')} <span>→</span></span>
  </>
  return <>
    <div className="experience-confirm-icon"><Check /></div>
    <span className="experience-screen-kicker">{t('showcase.worker.accepted')}</span>
    <h4>{t('showcase.worker.screenWork')}</h4>
    <div className="experience-profile-lines">{['acceptedStep', 'startStep', 'finishStep'].map(key => <div key={key}><span className="experience-line-icon"><Check /></span><span>{t(`showcase.worker.${key}`)}</span></div>)}</div>
    <p className="experience-worker-note">{t('showcase.worker.finishNote')}</p>
  </>
}

function ExampleScreen({ step, t }) {
  if (step === 'fees') return <FeeScreen t={t} />
  if (step === 'service') return <>
    <span className="experience-screen-kicker">{t('home.searchPrompt')}</span>
    <h4>{t('showcase.screenService')}</h4>
    <div className="experience-input"><span>{t('home.serviceLabel')}</span><strong>{t('services.electricity.name')}</strong><span className="experience-input-icon">⌕</span></div>
    <div className="experience-input"><span>{t('home.locationLabel')}</span><strong>Rabat</strong><span className="experience-input-icon">⌖</span></div>
    <div className="experience-trades">{['plumbing', 'electricity', 'moving'].map((key, index) => <span key={key} className={key === 'electricity' ? 'selected' : ''}><span aria-hidden="true">{['🔧', '💡', '📦'][index]}</span>{t(`services.${key}.name`)}</span>)}</div>
    <span className="experience-example-button">{t('home.findHelp')} <span>→</span></span>
  </>
  if (step === 'worker') return <>
    <span className="experience-screen-kicker">Rabat · {t('services.electricity.name')}</span>
    <h4>{t('showcase.screenWorker')}</h4>
    <div className="experience-person"><span className="experience-person-avatar">Y</span><div><strong>{t('showcase.exampleWorker')}</strong><span>{t('services.electricity.name')}</span></div><span className="experience-person-check"><Check /></span></div>
    <div className="experience-profile-lines">{['skills', 'reviews', 'availability'].map(key => <div key={key}><span className="experience-line-icon"><Check /></span><span>{t(`showcase.${key}`)}</span><span className="experience-line-arrow">↗</span></div>)}</div>
    <span className="experience-example-button">{t('workerCard.viewProfile')} <span>→</span></span>
  </>
  if (step === 'talk') return <>
    <span className="experience-screen-kicker">{t('communication.title')}</span>
    <h4>{t('showcase.screenTalk')}</h4>
    <div className="experience-chat"><span>{t('showcase.clientMessage')}</span><span>{t('showcase.workerMessage')}</span></div>
    <div className="experience-offer"><span>{t('job.price')} · {t('showcase.example')}</span><strong>200 <small>DH</small></strong><span>{t('showcase.visitTime')}</span></div>
  </>
  return <>
    <div className="experience-confirm-icon"><Check /></div>
    <span className="experience-screen-kicker">{t('dashboard.status.confirmed')}</span>
    <h4>{t('showcase.screenConfirm')}</h4>
    <p>{t('showcase.confirmNote')}</p>
    <div className="experience-confirm-summary"><div><span>{t('job.service')}</span><strong>{t('services.electricity.name')}</strong></div><div><span>{t('job.price')}</span><strong>200 DH</strong></div><div><span>{t('job.location')}</span><strong>Rabat</strong></div></div>
    <span className="experience-example-button">{t('job.title')} <span>→</span></span>
  </>
}

export default function ScrollExperience() {
  const { t, i18n } = useTranslation()
  const animated = useDesktopStoryMotion()
  const [role, setRole] = useState('client')
  const [active, setActive] = useState(0)
  const root = useRef(null)
  const stepKey = role === 'worker' ? 'showcase.worker.steps' : 'showcase.steps'

  useLayoutEffect(() => {
    if (!animated) return undefined
    const context = gsap.context(() => {
      const copies = gsap.utils.toArray('.experience-copy')
      const screens = gsap.utils.toArray('.experience-screen')
      gsap.set([...copies, ...screens], { autoAlpha: 0, y: 24 })
      gsap.set([copies[0], screens[0]], { autoAlpha: 1, y: 0 })
      gsap.set(screens, { scale: .94, transformOrigin: '50% 50%' })
      gsap.set(screens[0], { scale: 1 })
      const direction = i18n.dir() === 'rtl' ? -1 : 1
      gsap.set('.experience-device', { transformPerspective: 1200, rotationY: -10 * direction, rotationX: 4 })
      const timeline = gsap.timeline({
        defaults: { ease: 'power2.inOut' },
        scrollTrigger: {
          trigger: root.current,
          start: () => `top top+=${document.querySelector('.site-navigation')?.offsetHeight || 80}`,
          end: 'bottom bottom',
          scrub: 1.15,
          invalidateOnRefresh: true,
        },
      })
      timeline.to(root.current, { '--experience-progress': 1, duration: steps.length, ease: 'none' }, 0)
      timeline.to('.experience-device', { rotationY: 7 * direction, rotationX: -2, scale: 1.035, duration: steps.length / 2, ease: 'none' }, 0)
      timeline.to('.experience-device', { rotationY: -3 * direction, rotationX: 0, scale: 1, duration: steps.length / 2, ease: 'none' }, steps.length / 2)
      timeline.to('.experience-orbit', { rotation: 65, scale: 1.12, duration: steps.length, ease: 'none' }, 0)
      for (let index = 1; index < steps.length; index++) {
        timeline.to(copies[index - 1], { autoAlpha: 0, y: -20, duration: .3 }, index)
        timeline.to(screens[index - 1], { autoAlpha: 0, y: -24, scale: 1.025, duration: .38 }, index)
        timeline.to(copies[index], { autoAlpha: 1, y: 0, duration: .42 }, index + .12)
        timeline.to(screens[index], { autoAlpha: 1, y: 0, scale: 1, duration: .48 }, index + .1)
      }
      let previousStep = -1
      const sync = () => {
        const nextStep = Math.min(steps.length - 1, Math.floor(timeline.progress() * steps.length))
        if (nextStep !== previousStep) {
          previousStep = nextStep
          setActive(nextStep)
        }
      }
      timeline.eventCallback('onUpdate', sync)
      sync()
      // Refresh after fonts/layout and the outer home entrance settle.
      const refresh = requestAnimationFrame(() => ScrollTrigger.refresh())
      return () => cancelAnimationFrame(refresh)
    }, root)
    return () => context.revert()
  }, [animated, i18n, t, role])

  function jump(index) {
    const section = root.current
    const height = section.querySelector('.experience-sticky').offsetHeight
    const navHeight = document.querySelector('.site-navigation')?.offsetHeight || 80
    const start = section.getBoundingClientRect().top + window.scrollY - navHeight
    const progress = (index + .6) / steps.length
    window.scrollTo({ top: start + (section.offsetHeight - height) * progress, behavior: 'smooth' })
  }

  function navigateSteps(event, index) {
    const forward = i18n.dir() === 'rtl' ? 'ArrowLeft' : 'ArrowRight'
    const backward = i18n.dir() === 'rtl' ? 'ArrowRight' : 'ArrowLeft'
    let next
    if (event.key === forward) next = Math.min(steps.length - 1, index + 1)
    else if (event.key === backward) next = Math.max(0, index - 1)
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = steps.length - 1
    else return
    event.preventDefault()
    event.currentTarget.parentElement.children[next].focus({ preventScroll: true })
    jump(next)
  }

  function changeRole(value) {
    if (role === value) return
    setRole(value)
    if (animated) jump(0)
  }

  return <section ref={root} id="how-it-works" className={`scroll-experience ${animated ? 'is-animated' : 'is-static'}`} aria-label={t('home.howItWorksTitle')}>
    <div className="experience-mobile container">
      <h2>{t('showcase.title')}</h2>
      <RoleChoice role={role} onChange={changeRole} t={t} />
      <ol className="mobile-process" aria-label={t('home.howItWorksTitle')}>{(role === 'worker' ? ['request', 'offer', 'work'] : ['chooseService', 'chooseWorker', 'agreeDetails']).map((key, index) => <li key={key}><span aria-hidden="true">{index + 1}</span><strong>{t(role === 'worker' ? `showcase.worker.mobile.${key}` : `home.${key}`)}</strong></li>)}</ol>
      {role === 'worker' && <Link to={demosEnabled ? '/developer/worker/practice' : '/register?role=worker'} className="experience-search-link">{t(demosEnabled ? 'showcase.worker.cta' : 'home.joinWorker')} <span aria-hidden="true">↗</span></Link>}
    </div>
    <div className="experience-sticky">
      <div className="container experience-content">
        <header className="experience-heading"><h2>{t('showcase.title')}</h2><RoleChoice role={role} onChange={changeRole} t={t} /><a href="#services" className="experience-skip">{t('showcase.skip')} <span aria-hidden="true">↓</span></a></header>
        <div className="experience-stage">
          <div className="experience-copy-stack">
            {steps.map((step, index) => <article key={step} className="experience-copy" aria-hidden={animated && active !== index ? true : undefined}>
              <span className="experience-step-number" dir="ltr">0{index + 1} / 0{steps.length}</span>
              <h3>{t(`${stepKey}.${step}.title`)}</h3>
              <p>{t(`${stepKey}.${step}.body`)}</p>
              {!animated && <span className="experience-static-symbol" aria-hidden="true">{['⌕', '◎', '↔', '◇', '✓'][index]}</span>}
            </article>)}
          </div>
          {animated && <div className="experience-visual" aria-hidden="true">
            <div className="experience-orbit" />
            <div className="experience-device">
              <div className="experience-device-bar"><span className="experience-window-dots"><i /><i /><i /></span><strong>Khedma</strong><span>{t('showcase.example')}</span></div>
              <div className="experience-screen-stack">{steps.map(step => <div key={step} className={`experience-screen experience-screen-${step}`}>{role === 'worker' ? <WorkerScreen step={step} t={t} /> : <ExampleScreen step={step} t={t} />}</div>)}</div>
            </div>
          </div>}
        </div>
        <div className="experience-footer">
          {animated && <nav className="experience-step-nav" aria-label={t('home.howItWorksTitle')}>{steps.map((step, index) => <button key={step} type="button" aria-current={active === index ? 'step' : undefined} onClick={() => jump(index)} onKeyDown={event => navigateSteps(event, index)}><span>0{index + 1}</span>{t(`${stepKey}.${step}.label`)}</button>)}</nav>}
          <Link to={role === 'worker' ? (demosEnabled ? '/developer/worker/practice' : '/register?role=worker') : '/search'} className="experience-search-link">{t(role === 'worker' ? (demosEnabled ? 'showcase.worker.cta' : 'home.joinWorker') : 'home.findHelp')} <span aria-hidden="true">↗</span></Link>
        </div>
        {animated && <div className="experience-progress" aria-hidden="true"><span /></div>}
      </div>
    </div>
  </section>
}
