# Design and login audit — 9 October 2026

The supplied GitLab Pages page is a static preview build. The local design already exists in the React source; development mode enables Laravel accounts while the preview disables live accounts and enables sample demos. Run `npm run dev:preview` from `khedma` for the hosted preview behavior. Run `npm run dev` for real local accounts with the backend running separately. Both use the same design. A laptop window must be at least 1024 × 650 to animate; OS reduced motion, app reduced motion, large text and the new reading mode keep the story static.

## Changes

- Larger desktop hero typography on tall laptops, retaining the room illustration, native scrolling and GSAP walkthrough for both roles.
- A persistent “Read at my pace” control, with an “Enable scroll story” return action. Respect system accessibility settings.
- Arrow keys and Home/End navigate the desktop chapters, including RTL direction.
- Corrected the hero bottom row's inherited grid layout so its four controls fit on one line below search.
- The phone homepage removes the duplicate sign-in/signup row. Search, six service shortcuts, expansion and the bottom navigation stay direct and compact.
- Login now allows six attempts per normalized identity/IP pair, plus a 120-attempt IP-wide minute ceiling. People sharing a network no longer exhaust one common six-attempt allowance. Email case and equivalent phone formats share the same identity limit.
- SQLite uses WAL, a 5-second busy timeout and FULL synchronization. The database cache retries only rolled-back SQLite counter transactions that fail with a lock error, at most ten times with short randomized waits. PHP 8.2 cannot use Laravel's IMMEDIATE transaction implementation; settings alone did not resolve the measured lock errors. Other errors are rethrown. Both the source snapshot and the owner's sibling backend have matching changes.

## Concurrent login results

1000 separate fake accounts, prepared session cookies and CSRF tokens, submitted as 1000 login promises together. Real bcrypt cost 10 verification, SQLite WAL, database cache, file sessions, local PHP development server with eight configured workers plus its parent. The test harness alone supplies simulated client IPs; the real application does not trust this header. No live website or owner database was load tested or seeded.

| Case | Successful | Rate limited (429) | Server errors (500) | p95 |
|---|---:|---:|---:|---:|
| Original, one shared IP | 7 | 991 | 2 | 24.2 s |
| Final, one shared IP | 120 | 880 | 0 | 48.5 s |
| Final, 1000 distinct simulated IPs | 1000 | 0 | 0 | 65.8 s |

Every successful response matched the requested account; no wrong-account responses occurred. An intermediate run after changing SQLite settings still failed, prompting the counter retry fix. Raw final results are in [audit-results](audit-results/). The before run admitted seven rather than six logins due to concurrent limiter checks; this limiter is not an exact transactional admission gate.

**The burst still exceeds the frontend's 25-second deadline.** The local development server queues work; the distinct-IP burst took 71.8 seconds overall. Removing server errors does not make 1000 users fast enough on this setup. Do not raise the UI timeout and present this as solved production capacity. A production server with appropriately provisioned workers and database/cache infrastructure needs its own load test, using its actual password cost and session driver. This local test does not certify production throughput, live browser logins at this load, or a hard concurrency limit.

## Validation

- 41 frontend tests; lint; public and static-preview production builds passed.
- 84 backend tests, 831 assertions, including shared-IP behavior, normalized identities, the network ceiling and bounded cache retry behavior.
- Phone browser flow passed eight checks: impossible date rejection, future offer, client acceptance, two simulated fee payments, start, completion/review, dismissal of cancellation and confirmed cancellation. No runtime errors in that flow.
- 24 browser interaction assertions passed for the reading preference across reload, all ten role chapters, keyboard chapter navigation, service expansion/collapse, search suggestions, menu dismissal and reduced motion.
- 30 short-laptop chapter checks passed at 1024 × 650 across both roles and three languages.
- 10 phone controls/error checks passed, including 429/422/500 login errors with retained inputs, dock visibility during editing, FAQ expansion and outside-tap menu dismissal.
- The built static preview passed five assertions: preview marker, animated homepage, reading mode, disabled live login and practice entry, with no real API writes or runtime errors.
- Desktop and phone screenshots were visually inspected: [desktop](audit-results/desktop.png), [phone](audit-results/phone.png).

**570 layout combinations passed**: 19 public/demo screens × five widths (320, 390, 430, 1024, 1440) × three languages × two themes. No horizontal overflow or runtime errors were found. The layout sweep and the 24 interaction assertions have separate raw result files; the interaction run waits for lazy routes after refresh. These checks use Chromium viewport/touch emulation and isolated demos, with public API responses intercepted. They do not cover every possible human action, physical iOS/Safari, real email/SMS, or merchant payments.

Reproduction instructions: [scripts/audits/README.md](scripts/audits/README.md).
