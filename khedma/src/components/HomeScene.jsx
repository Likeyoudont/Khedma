import { useId } from 'react'
import { useTranslation } from 'react-i18next'

export default function HomeScene({ showTrades = false }) {
  const { t } = useTranslation()
  const id = useId().replace(/:/g, '')
  return <div className="home-scene" aria-hidden="true">
    <div className="scene-orbit" />
    <svg viewBox="0 0 600 520" fill="none" className="home-scene-art">
      <defs>
        <linearGradient id={`${id}-floor`} x1="160" y1="295" x2="430" y2="510" gradientUnits="userSpaceOnUse"><stop stopColor="#dfc3a0"/><stop offset="1" stopColor="#b5926e"/></linearGradient>
        <linearGradient id={`${id}-wall`} x1="100" y1="100" x2="500" y2="300" gradientUnits="userSpaceOnUse"><stop stopColor="var(--scene-wall-start, #fffef9)"/><stop offset="1" stopColor="var(--scene-wall-end, #deddd5)"/></linearGradient>
        <linearGradient id={`${id}-window`} x1="140" y1="110" x2="250" y2="265" gradientUnits="userSpaceOnUse"><stop stopColor="var(--scene-window-start, #deede6)"/><stop offset="1" stopColor="var(--scene-window-end, #a8c6b3)"/></linearGradient>
        <filter id={`${id}-shadow`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>
      </defs>
      <ellipse cx="312" cy="428" rx="215" ry="46" fill="#35463c" opacity=".13" filter={`url(#${id}-shadow)`}/>
      <path d="m82 320 229-119 222 120-224 127z" fill={`url(#${id}-floor)`}/>
      <path d="m82 320 227 128v18L82 338z" fill="#ab8762"/>
      <path d="m309 448 224-127v18L309 466z" fill="#c6a37d"/>
      <path d="m82 320 229-119V46L82 170z" fill={`url(#${id}-wall)`}/>
      <path d="m311 46 222 121v154L311 201z" fill="var(--scene-wall-side, #e9e8e0)"/>
      <g className="scene-window">
      <path d="m130 196 125-68v120l-125 68z" fill="#aaac9f"/>
      <path d="m138 198 109-59v105l-109 59z" fill={`url(#${id}-window)`}/>
      <path d="m192 169 1 107M138 252l109-60" stroke="#fffef8" strokeWidth="5"/>
      <path d="m144 309 111-60 140 78-108 60z" fill="#fff9dd" opacity=".28"/>
      </g>
      <path d="m345 93 107 58v82l-107-57z" fill="#a99f84"/>
      <path d="m351 103 95 51v68l-95-51z" fill="#e3e7d5"/>
      <path d="m372 181 33-33 29 58z" fill="#71876b"/>
      <ellipse cx="424" cy="169" rx="9" ry="12" fill="#cba779"/>
      <path d="m194 345 130-69 117 63-130 74z" fill="#dad9cf"/>
      <g className="scene-furniture">
      <path d="m270 269 110 60v64l-110-60z" fill="#728979"/>
      <path d="m270 269 44-24 110 60-44 24z" fill="#93a999"/>
      <path d="m380 329 44-24v64l-44 24z" fill="#536e5b"/>
      <path d="m262 330 38-21 79 43-37 23z" fill="#9bab99"/>
      <path d="m262 330 80 45v35l-80-44z" fill="#82977f"/>
      <path d="m342 375 37-23v36l-37 22z" fill="#5e785e"/>
      <path d="m292 310 17-9 46 25-16 10z" fill="#ece7da"/>
      </g>
      <path d="m180 350 49-25 42 23-48 26z" fill="#eee8dc"/>
      <path d="M193 365v38m63-40v24" stroke="#a88d6a" strokeWidth="7" strokeLinecap="round"/>
      <path d="m194 349 20-11 19 10-19 11z" fill="#c4b494"/>
      <g className="scene-plant">
      <path d="M480 274v59" stroke="#7e6950" strokeWidth="5"/>
      <path d="M479 298c-37-1-53-31-42-43 22-6 42 16 42 43Z" fill="#76956c"/>
      <path d="M481 288c-1-37 26-53 39-45 5 23-12 42-39 45Z" fill="#526f50"/>
      <path d="M479 273c-24-19-25-48-10-54 18 11 21 31 10 54Z" fill="#99ae84"/>
      <path d="m463 323 36 1-6 32h-24z" fill="#c4a68b"/>
      </g>
      <path d="M311 46v-9" stroke="#cbcbbf" strokeWidth="3"/>
      <ellipse className="scene-lamp-glow" cx="315" cy="156" rx="34" ry="18" fill="#f8dba1" opacity="0" filter={`url(#${id}-shadow)`}/>
      <path d="m295 143 18-10 24 13-18 11z" fill="#d4b67b"/>
      <path d="M313 65v74" stroke="#a69573" strokeWidth="2"/>
    </svg>
    {showTrades && <div className="hero-scene-trades">{['plumbing', 'electricity', 'moving'].map((key, index) => <span key={key} className={`hero-scene-trade hero-scene-trade-${index}`}><span>{['🔧', '💡', '📦'][index]}</span>{t(`services.${key}.name`)}</span>)}</div>}
    <div className="scene-label scene-label-top"><span className="scene-status-dot" />{t('home.sceneLabel')}</div>
    <div className="scene-label scene-label-bottom"><span className="scene-mini-icon">✓</span><div><strong>{t('home.agreeDetails')}</strong><span>{t('home.sceneNote')}</span></div></div>
  </div>
}
