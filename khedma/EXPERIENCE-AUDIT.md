# Experience audit — 5 October 2026

The update makes the phone journey shorter and gives desktop visitors a clearer scroll-driven explanation for both clients and workers. Existing free typing and explicit spelling suggestions are retained; a plumbing query is never silently replaced with painting.

## Further phone improvements — latest update

- Number entry now accepts complete 05/06/07 numbers with spaces, supported Arabic/Persian digits and pasted `+212 (0)6…`/`00212` equivalents. Frontend and backend use matching validation and canonical storage; incomplete/extra digits are rejected. Duplicate phone/email accounts get distinct guidance and a direct Sign in link.
- User-triggered requests get a centered status after 350 ms. Submission blocks repeated interaction; read feedback is nonblocking. After eight seconds, the copy explains the wait, and a 25-second deadline supplies recovery guidance. A submitted request with no confirmed response says the result may already be saved and is never retried automatically. Fast requests do not flash a popup.
- Worker replies are separate from server processing: saved requests, offers, accepted visits, unpaid fees, work in progress and closed jobs each have short next-step copy. Phone job metadata uses readable compact cards. A client can revisit the worker’s profile with the job’s service and city preserved.
- A bottom phone navigation offers Home, search/requests, jobs and account/sign-in. It has large touch targets, measured space for wrapped labels and safe-area padding, and hides during field editing and on authentication forms. Desktop navigation retains its layout.
- Dashboard cards show the trade, person, city, proposed price and next action. Successful polling clears earlier read failures. Routine job/activity/message polling and read receipts stay quiet; foreground booking reads abort when leaving the page.
- Closing and reopening an unsent request form preserves its fields. Password requirements are visible before submission. Phone input fonts are at least 16 px to avoid automatic iOS field zoom; browser-storage denial no longer crashes initial language/account loading.
- Unused Bootstrap JavaScript was removed: the main compiled chunk fell by about 79 kB, or 23 kB compressed, compared with the same update before that removal. The app’s controls use React.

The new research sample covers Avito, JumiaPay Morocco, Glovo, inDrive, Bricole, BricolApp and My Wafa. Official product behavior and individual review anecdotes are distinguished in [MOROCCO-MOBILE-RESEARCH.md](MOROCCO-MOBILE-RESEARCH.md). Short-name registry checks recommend Yedli.ma/Yedli.com; no purchase or automatic branding change was made.

## Issues found and fixed in the earlier full audit

- Signup showed both contact fields and extra explanatory text. Users now choose phone or email; only the chosen field is required and submitted. Values stay available when switching. Worker experience and the map remain optional.
- Native browser signup errors could appear in another language. Required fields, malformed email, incomplete phone numbers and short passwords now get an explanation in the selected interface language and focus the affected field.
- After advancing signup, the old scroll position could leave the new stage partly hidden. Stage navigation now brings its heading below the sticky menu, while validation keeps focus on an invalid field.
- Job confirmation and worker actions appeared below the fee panel and conversation. Decisions now appear immediately after the job summary, with a direct Messages link. Fees are shown before consent; confirmed fee-enabled jobs link to the participant’s payment section. Empty price/date rows are omitted until an offer exists.
- Manual Refresh temporarily unmounted the booking form and discarded an unfinished offer. It now keeps the form mounted and disables actions while refreshing; price and visit inputs survive.
- The Show/Hide password button was about 30 px tall on the baseline phone screen. It is now at least 44 × 44 px, with space reserved inside the input. Optional signup/settings sections also have larger phone targets.
- The phone menu could stay open after an outside tap or Escape. Both now close it; Escape returns focus to the menu button.
- Cross-page anchors could run before a lazy page appeared or use the phone menu’s previous expanded height. Navigation now waits for the section and the collapsed header layout. Malformed hashes do not crash the route.
- The desktop illustration needed more depth and the workflow omitted fee amounts. Native scrolling now animates the room layers, lamp glow, orbit and service labels. Both role stories have five chapters, including an explicitly labelled 200 DH example: 20 DH per participant, 220 DH client total and 180 DH worker earnings. Phone visitors keep the short three-step guide.

The implemented rate remains **10% per person**. The recommendation to try 5% for launch is documented in [DOMAIN-NAMES.md](DOMAIN-NAMES.md); no fee rate was changed by this audit.

## Functional verification

Real worker and client accounts were created in a disposable SQLite database, served by a separate Laravel instance. The owner’s live database and accounts were not used for these mutations. The checks covered:

- Phone-only worker and email-only client registration, Arabic phone digits, required specialties and moving vehicles, retained selected trade/city through signup, login failure and successful login.
- A complete request → messages → worker quote/date → client acceptance → worker start → client completion → review journey. The public professional profile displayed the new review.
- Invalid dates, direct month entry (`6` → June), and Refresh preserving the offer draft.
- Moving pickup/destination, belongings, access, vehicle and carrying helpers; cancellation reason/confirmation; dismissing an accidental cancellation; worker decline; read-only messages after closure; a shared problem note.
- Account drafts across internal navigation, saved profile changes, password-confirmation mismatch, worker availability and available-worker alternatives, protected routes and unknown-route recovery.
- Touch-driven spelling suggestion selection in English/French/Arabic, freely typed input, matching-trade travel suggestions for Figuig, destination retention, language/theme controls, localized email/password errors, menu dismissal and lazy-page anchor navigation.
- A deliberately interrupted worker-directory request showed localized retry guidance and recovered after Retry. System reduced motion produced readable static content. Unconfigured email recovery showed its explicit availability notice.

The same fee-enabled demo was exercised separately with fake payments; no real card or Cash Plus transaction was made. Live merchant checkout, SMS/email delivery and social-provider credentials remain external setup items, described in [PAYMENTS.md](PAYMENTS.md) and [LAUNCH-READINESS.md](LAUNCH-READINESS.md).

## Layout and build verification

- **570 page combinations passed**: 19 public/client/worker screens × 320/390/430/1024/1440 px × Arabic/French/English × light/dark. The 1024 px case used a 650 px high viewport. Screens included search/profile/settings, both dashboards, pending/proposed/confirmed/in-progress/completed/reviewed/cancelled jobs, signup/login, recovery and unknown routes.
- **16 additional layouts passed** for large text and reduced motion, including homepage, signup, worker settings and proposal screens.
- **60 desktop chapter checks passed**: every client and worker chapter in all three languages at 1024 × 650 and 1440 × 900, with active copy and example content contained in the sticky section. Another **30 short-laptop chapter checks passed** for anonymous visitors, whose visible sign-in row makes the menu taller.
- **24 additional worker-signup stage layouts passed** at 320/390 px in all three languages and both themes, including all 18 specialties, transport, the optional map and preserving values on Back.
- **24 fee layouts passed** across phone/laptop sizes, three languages and both themes. The complete demo paid the client and worker fees separately before revealing contacts and starting.
- The **built static preview passed** its disabled-live-sign-in notice, client/worker scroll chapters and the full fake request/fee/start/completion/review journey, with no real API writes.
- 29 frontend tests and 72 Laravel tests (627 backend assertions) passed. Lint and live/static-preview production builds passed.

No horizontal page overflow, untranslated new UI keys or uncaught application errors were found in the completed layout and story checks. Browser screenshots were visually inspected to catch clipping that page-width measurements alone would miss.

## Evidence and limits

The local evidence files are `/tmp/khedma-layout-matrix-results.json`, `/tmp/khedma-scroll-visual-results.json`, `/tmp/khedma-scroll-anonymous-results.json`, `/tmp/khedma-real-mobile-audit-results.json`, `/tmp/khedma-mobile-branches-results.json` and `/tmp/khedma-controls-results.json`, `/tmp/khedma-signup-stages-results.json`, `/tmp/khedma-fees-current-results.json` and `/tmp/khedma-preview-smoke-results.json`. The desktop screenshot is `/tmp/khedma-after-home-desktop.png`; additional phone, moving-request and story screenshots are stored beside these reports.

These are Chromium/Brave browser checks with viewport and touch emulation. Physical phone keyboards, iOS Safari, production VPS/network behaviour, accessibility screen readers and live merchant payments were not tested. This broad audit does not claim to enumerate every possible human action or guarantee that no future issue can occur.

## Latest validation — request feedback and phone navigation

The updated app passed **41 frontend tests**, **75 Laravel tests with 673 assertions**, lint, and live/static-preview production builds. The backend phone/auth files and tests match the owner’s running Laravel source.

The latest layout sweep passed **570 combinations** (19 screens, five widths from 320 to 1440 px, three languages, both themes) and **16 reduced-motion/large-text cases**, with no horizontal overflow, missing new UI copy, runtime errors or inadequate bottom-navigation reserve. This repeats the broad layout check after the phone navigation/status update; it is distinct from the earlier audit above.

The built preview passed **101 browser assertions** through worker/client requests, negotiations, proposals, fee gates, start/completion/review, cancellations, retained request fields, dock destinations/focus, sticky Save, 320 px Arabic layouts, both themes and all ten desktop role chapters. These are fake demo payments with no real API writes.

A separate **17-check request-feedback audit** verified delayed CSRF/submission feedback, duplicate-click prevention, retained inputs on validation failure, eight-second slow guidance, the actual 25-second deadline, unknown-result recovery, quiet read receipts and read failures. A further **16-check regression audit** confirmed newly mounted navigation stays keyboard-inaccessible during submission and pending dashboard/job/worker-search reads abort on navigation. All synthetic POSTs were intercepted; no owner database writes occurred.

Evidence: `/tmp/khedma-phone-refinement-matrix-results.json`, `/tmp/khedma-phone-preview-final-results.json`, `/tmp/khedma-request-feedback-browser-results.json`, `/tmp/khedma-feedback-regressions-results.json`. Screenshots of the phone request, large-text Arabic home/settings, wait indicator and desktop story were visually inspected.

Physical phone keyboards, iOS Safari, screen readers, production networks and live merchant payments remain outside these browser-emulated checks.

A final 29 browser checks passed for native 05/06/07/pasted/Arabic phone entry, malformed-number rejection, duplicate-account guidance in all three languages, preserved signup fields and return destination, and language/theme controls with browser storage blocked. Evidence: `/tmp/khedma-phone-signup-final-results.json`. All three signup POSTs were intercepted; no owner database writes occurred.

## Public deployment preparation — 6 October 2026

Real users will register themselves; no public sample people/jobs are seeded or substituted for an empty directory. Default production builds disable developer routes and demo links. Worker recruitment opens worker signup. Local developer practice and the explicitly labelled GitLab Pages static preview remain available. The public brand/domain is pending the owner’s choice.

The launch command now rejects invalid application keys, reports when fees collect no money, and supports `--require-fees` for the intended paid launch. Production frontend/backend environment templates are in deployment/. A fresh server database should contain only the catalogue until real users register; existing local accounts have not been deleted.

41 frontend tests and 78 backend tests (681 assertions), lint, both builds, dependency audits, the 68-check database-backed production browser pilot and a disposable backup restore passed. The current production/paid checks still fail for local settings and unconfigured live services. See PUBLIC-LAUNCH-CHECK.md for the actual launch blockers and server steps. Do not treat these local checks as confirmation that HTTPS, email, real card/Cash Plus settlement or refunds work on a server.
