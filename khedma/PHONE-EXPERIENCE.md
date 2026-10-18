# Phone experience fixes — 4 October 2026

The selected service and city now survive worker-profile navigation and signup/login. An electricity search stays electricity when creating the request. Worker cards highlight the matching trade. Profile summaries show the trade, city, rating and reviews link before the phone booking form; busy workers offer an available-worker search.

Worker signup is three short steps. Six common trades are shown first, with all 18 available. New workers visibly start available; experience and introduction are optional. Settings group editable fields, keep account-scoped drafts during internal navigation without persisting passwords, and offer a sticky phone save bar. Demo navigation identifies the fake session and uses a compact banner.

Cancellation and decline require a reason and a confirmation screen. Cancellation is available before work starts. The assigned worker starts confirmed work; the client explicitly confirms completion afterwards. Either participant can record a private, retry-safe problem note, including after closure; the other participant sees activity and the note on the job. This records the issue between the participants; no staffed support or refund process is connected.

Moving requests collect pickup/destination, belongings, access, vehicle and carrying-help choices. The server validates and stores these details and includes them in request retry checks. Existing moving bookings remain readable. API/demo errors are translated into Arabic, French and English; city-based search explains that travel must be agreed.

## Deploy

Back up the database, deploy matching frontend/backend versions and run:

```sh
php artisan migrate --force
```

The new migration adds `moving_details` and `cancellation_reason`. It was applied to the local database after a verified SQLite backup. GitLab Pages is still a static preview; its demos work without a server, while real accounts require the hosted Laravel backend. SMS recovery, real mail delivery and Google/Apple credentials require separate setup.

## Verification

- Frontend test files and lint passed; live and static-preview production builds passed.
- Backend: 57 tests, 431 assertions, isolated in-memory database.
- Phone-emulated real Laravel journey with a disposable database: worker/client signup, retained electricity/Rabat context, profile-draft navigation, messaging, proposal/confirmation/start/completion/review and shared problem notes passed.
- Worker/client fake-data workflow and 48 account layout combinations passed.
- Physical phone keyboards, Safari and production hosting/provider delivery were not exercised.

Additional phone checks passed: 144 screen/layout cases at 320, 390 and 430 px across Arabic/French/English and both themes, including expanded moving forms. Retained service/city, busy-worker handling, cancellation confirmation, draft restoration, translated Arabic errors and saved vehicle choices passed without JavaScript errors or horizontal overflow.

## Desktop, suggestions and worker practice update

The desktop homepage now uses a spacious layout, large system typography, soft neutral surfaces and a custom SVG home illustration. Search spans the hero width; service cards have restrained hover motion. Phones keep the short layout, and reduced-motion preferences are respected. The external hero video is no longer loaded.

Search suggestions are explicit choices. Leaving a field or submitting does not replace a misspelling with a different trade. Exact `plombier` only suggests plumbing in all three languages; partial/typo queries offer selectable choices with arrow-key/Enter/Escape support. City typo suggestions also require a choice. A city with no matches, including Figuig, offers available professionals elsewhere and any available local trades. Profiles preserve the requested destination and explain that travel and extra fees require agreement; these are possibilities to discuss, not confirmed service coverage.

Signup and settings phone fields explain ten Moroccan digits beginning with 05/06/07, show the entered count, and distinguish nine digits after +212. Arabic/Persian numerals become Latin digits. Frontend and backend reject incomplete or overlong Moroccan numbers while retaining international numbers. Login includes a phone example.

Open `/developer/worker/practice` to act as the worker. A fake client requests two ceiling lights in Rabat. Read and reply in Messages, discuss the details, then propose the total price and visit time. Labelled practice controls provide a sample client reply, confirm the offer, and confirm completion/review after the worker starts work. Real bookings and accounts are unaffected. Only this practice booking/thread persist in the current tab's session storage; sample account profiles and passwords remain in memory. Reset demo clears the practice job. Negotiation messages appear before the price form on booking pages.

Validation for this update: 21 frontend tests, lint, both production builds, and 59 backend tests with 443 assertions passed. Browser checks exercised exact/typo suggestions in Arabic/French/English, keyboard selection, Figuig alternatives, destination retention, phone counts/validation/numerals, and the complete practice journey including refresh persistence. Layout checks covered 120 combinations at 320/390/768/1024/1440 px across three languages, two themes and four screens, with no horizontal overflow or JavaScript exceptions. These are browser-emulated checks, not physical-device or Safari tests.

The final static-preview check also passed the practice request/message/offer/client-acceptance flow, refresh retention, city/trade alternatives and 12 language/theme/layout cases. Live sign-in remains correctly disabled in that preview. The phone demo header uses compact touch controls and scrolling tabs rather than repeated introduction blocks on job pages.

## Scroll-driven desktop walkthrough

The homepage now introduces its workflow with a pinned desktop section. Scrolling changes the explanation and a rotating example interface across four stages: service, worker, negotiation and confirmation. Step buttons allow jumping forwards or backwards, and a skip link leads directly to services. The example price and conversation are labelled illustrations and never call the booking API.

The section uses native scrolling and releases at its end. It becomes static for tablet/short viewports, reduced-motion preferences and large text. Phones retain their compact three-step guide and service-first layout.

Verification: frontend test files, lint and live/static-preview builds passed. Browser-emulated checks covered 30 viewport/language/theme combinations, including 1024 × 650, all four stages, reverse scrolling, step buttons, skipping, resize to phone and back, and reduced motion. No horizontal overflow, clipped active copy, JavaScript exceptions or real API writes were observed. Physical devices and Safari were not exercised.

The GitLab Pages production preview also passed all four stages, the large-text fallback, the search link and navigation away and back to the homepage.

## Hero animation and worker explanation

The top desktop section now has its own pinned scroll sequence. The home illustration zooms and rotates, trade labels appear, and the description explains how the client and professional meet. Search stays usable throughout; its suggestions appear above the field to remain within the viewport. Its scroll cue skips directly to the detailed walkthrough.

Role buttons switch the detailed walkthrough between client and worker explanations. The worker path covers the profile and availability, reading and discussing a request (including declining with a reason), agreeing on travel and sending a total price and visit time, client acceptance, starting the work and client-confirmed completion/review. Payment remains arranged directly. The worker action leads to the isolated practice job. On phones, the same role buttons switch a compact three-step guide instead of adding a long animated section.

Validation: frontend test files, lint and both production builds passed. Thirty viewport/language/theme cases covered the hero and both walkthrough roles at 390/768/1024/1366/1440 px, including a 650 px high laptop. No active text or sample content was clipped, no horizontal overflow was observed and no real API writes occurred. Browser checks also covered keyboard search suggestions, destination retention, the worker stages and demo link, reverse scrolling and reduced-motion/large-text cleanup. These checks use browser emulation; physical devices and Safari were not tested.

The final static production preview passed the hero sequence, keyboard role switching, all four worker stages and the worker practice links from both laptop and phone layouts.

## Direct day/month entry

The worker proposal now accepts day and month numbers directly, without spinner arrows. A month can also be selected from numbered suggestions; typing `6` immediately displays June in the chosen interface language. Arabic/Persian digits and leading zeroes work. The year stays automatic, and existing incomplete/impossible/past-date explanations and ISO timestamp submission are retained.

Verification: 21 frontend tests, lint and live/static-preview builds passed. Browser checks covered 12 phone/laptop language/theme combinations, numeric/Arabic/Persian month entry, empty and invalid months, impossible dates, past dates and a valid fake worker proposal. No real API writes or JavaScript exceptions occurred. Physical phone keyboards were not tested.

## Separate connection fees

New developer requests show a 10% fee to each participant, with client total cost and worker net earnings displayed before consent. Both independent fake payments are needed to reveal contacts and enable Start. The client fee card was checked at 320/390/1024/1440 px in English, French and Arabic, in white and black modes. All 24 combinations have no horizontal page overflow and no untranslated fee keys. A phone demo completed proposal, consent, confirmation, separate Cash Plus/card simulations, start, completion and review with zero real payment requests or browser exceptions.

The real merchant setup remains pending. See [PAYMENTS.md](PAYMENTS.md).

## Complete experience audit — 5 October 2026

Signup now offers a phone/email choice, localized field guidance and stage navigation that keeps the next heading visible below the phone menu. The worker map is optional. Password controls and optional sections have larger phone touch targets. Job decisions and a Messages shortcut precede the conversation; empty price/date rows are hidden until an offer exists. Refresh preserves the draft offer. Outside taps and Escape close the menu. Cross-page anchors wait for lazy content and the collapsed navigation height.

The desktop hero now animates room layers and lighting. Both role walkthroughs have five chapters, including a clear example of the separate participant fees. Phone visitors keep the compact three-step guide. The configured rate remains 10% each.

The real client/worker cycle and moving, cancellation, decline, issue, profile-draft and error/retry paths passed using a separate disposable database. All 570 page/layout combinations, 16 large-text/reduced-motion layouts and 60 desktop chapter checks passed. Worker signup stages, all 18 specialties, transport choices, back navigation and the optional map also passed at 320/390 px in three languages and both themes. Frontend: 29 tests. Laravel: 72 tests, 627 assertions. See [EXPERIENCE-AUDIT.md](EXPERIENCE-AUDIT.md) for findings, evidence and test limits.

## Processing feedback and simpler phone navigation — 5 October 2026

Complete Moroccan 05/06/07 numbers, spaced/Arabic-digit entry and pasted +212(0)…/00212 formats now share frontend/backend validation and canonical uniqueness. Existing phone/email accounts receive a clear Sign in action. The language and account loader also tolerate blocked browser storage.

Requests show centered wait feedback after 350 ms, a slow-response explanation after eight seconds and recovery guidance at 25 seconds. Submitted requests with an unknown result are not retried automatically. Page controls stay blocked during submission; polling and read receipts remain quiet. Foreground booking reads stop when leaving a page, and server failures have wording separate from internet errors.

Phones have large quick navigation links, readable compact job summaries, distinct waiting-for-worker status, and dashboard cards with the next action. Navigation space is measured, including wrapped labels and safe areas; Account Save stays above it. Closing/reopening a request form preserves its fields. Desktop scroll explanations remain available. Unused Bootstrap JavaScript was removed to reduce the download.

Validation: 41 frontend tests; 75 Laravel tests (673 assertions); lint and both builds; 570 screen/language/theme/size combinations and 16 accessibility layouts; 101 built-preview workflow assertions; 17 waiting-state checks and 16 feedback/navigation regression checks. No real payments or owner-data mutations were used. See EXPERIENCE-AUDIT.md for evidence and physical-device limits.

Yedli.ma and matching Yedli.com were unregistered in direct registry checks today. No name was purchased and Khedma branding remains. See DOMAIN-NAMES.md and MOROCCO-MOBILE-RESEARCH.md for the short shortlist and the seven-service Moroccan research sample.

A final 29 browser checks passed for native 05/06/07/pasted/Arabic phone entry, malformed-number rejection, duplicate-account guidance in all three languages, preserved signup fields and return destination, and language/theme controls with browser storage blocked. Evidence: `/tmp/khedma-phone-signup-final-results.json`. All three signup POSTs were intercepted; no owner database writes occurred.

## Public deployment preparation — 6 October 2026

Real users will register themselves; no public sample people/jobs are seeded or substituted for an empty directory. Default production builds disable developer routes and demo links. Worker recruitment opens worker signup. Local developer practice and the explicitly labelled GitLab Pages static preview remain available. The public brand/domain is pending the owner’s choice.

The launch command now rejects invalid application keys, reports when fees collect no money, and supports `--require-fees` for the intended paid launch. Production frontend/backend environment templates are in deployment/. A fresh server database should contain only the catalogue until real users register; existing local accounts have not been deleted.

41 frontend tests and 78 backend tests (681 assertions), lint, both builds, dependency audits, the 68-check database-backed production browser pilot and a disposable backup restore passed. The current production/paid checks still fail for local settings and unconfigured live services. See PUBLIC-LAUNCH-CHECK.md for the actual launch blockers and server steps. Do not treat these local checks as confirmation that HTTPS, email, real card/Cash Plus settlement or refunds work on a server.
