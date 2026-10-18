# Desktop design refinement

The laptop palette now uses forest green, sage and warm ivory, including the navigation, signup/search buttons, service cards, walkthrough, FAQ and closing panel. Dark mode uses deep green surfaces with pale sage accents. The room illustration's walls and window adopt the corresponding theme instead of retaining white walls in dark mode.

The hero stage grows from 195 to 245 viewport heights and the five-chapter walkthrough from 470 to 600. This gives roughly 50% and 35% more scroll distance respectively, depending on navigation height. GSAP catch-up grows from 0.6 to 1.15 seconds. Chapter transitions use longer fades and smaller movement/scale changes. Native scrolling, direct step navigation and Skip to services remain available. React state updates only when a chapter or hero text actually changes.

A desktop introduction adds three concise explanations: local services, agreeing on the price/time, and seeing costs before confirmation. It links to the existing guide. The introduction is hidden below 1024 px; the compact phone flow and phone colors remain unchanged. Reading mode, large text and reduced motion still provide static content.

Screenshots:

- [Light hero](audit-results/desktop-redesign/hero.png)
- [Dark hero](audit-results/desktop-redesign/dark.png)
- [Introduction](audit-results/desktop-redesign/introduction.png)
- [Walkthrough](audit-results/desktop-redesign/story.png)
- [Services](audit-results/desktop-redesign/services.png)

41 frontend tests, lint, and public/static-preview production builds passed. The main text contrast is 11.78:1 on the light background and 15.32:1 on the dark background; muted copy is 4.65:1 and 9.21:1 respectively. These calculations cover those color pairs, not a full accessibility audit.

A wheel-input check confirmed gradual catch-up after a 400 px wheel scroll: hero progress moved from 0 to 0.119 at 150 ms, 0.280 at 600 ms and 0.289 at 1500 ms. Search submission remained usable midway through the scene. This measures the animation response, not frame-rate performance.

Browser verification uses Chromium emulation and intercepted public API reads; it does not establish physical iOS/Safari behavior or production performance. Reproduction instructions are in [scripts/audits/README.md](scripts/audits/README.md).

The final browser sweep passed 240 section/viewport checks (five sections × eight viewport sizes × three languages × two themes), 60 short-laptop chapter checks and 36 reading/reduced-motion/phone-visibility assertions. No horizontal overflow, chapter clipping or runtime errors were found. Evidence: [results](audit-results/desktop-redesign/results.json).
