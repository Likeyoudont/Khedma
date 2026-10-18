# Khedma

A React frontend and Laravel backend connecting clients with local professionals in Morocco. The interface supports Arabic, French and English, white/black appearance, worker service-area maps, transport options and custom trades.

## Repository layout

- `src`, `public`, `package.json`: React/Vite frontend.
- `backend`: Laravel source, database migrations, seeders and tests.
- `scripts`: release packaging and manual SQLite/source backup utilities.
- `deployment`: Nginx and queue-worker templates.
- `LAUNCH-READINESS.md`: deployment instructions, verification and remaining setup.

## Run locally

```sh
npm ci
npm run dev
```

Run this from the **`khedma` frontend folder**. To match the GitLab Pages
preview's behavior (including sample demos and disabled live sign-in), use
`npm run dev:preview` instead. The design is in `src/components/ScrollHero.jsx`,
`ScrollExperience.jsx` and `src/styles`; both modes use the same design.
Desktop scroll scenes need a viewport of at least 1024 × 650, with reduced
motion and large text disabled. “Read at my pace” switches to a static story
and remembers your choice; “Enable scroll story” restores the animation.

In another terminal:

```sh
cd backend
composer install
cp .env.example .env
php artisan key:generate
# Create database/database.sqlite if using SQLite on a new checkout.
php artisan migrate
php artisan db:seed --class=ServiceCategorySeeder
php artisan serve --host=127.0.0.1 --port=8000
```

Vite proxies `/api` to Laravel. The GitLab Pages deployment is a static frontend preview; full accounts, bookings and messages require the Laravel server on the same origin.

## Checks

```sh
npm run build
npm run lint
node --test --experimental-test-isolation=none tests/*.test.js
cd backend
php artisan test
php artisan khedma:launch-check --local
```

Passwords, `.env`, installed dependencies, logs, live databases, user uploads, local backups and release archives are excluded from Git. Configure production secrets on the hosting server.

## Existing owner workspace

The owner's frontend checkout is the `khedma` directory. Its running backend remains in the sibling `khedma backend` directory. `backend` here is a source snapshot for GitLab and deployment; it does not contain the owner's live database or credentials. Fresh GitLab checkouts use the layout above.

## Developer demos

Open `/developer` to choose `/developer/worker` or `/developer/client`. The existing `/worker-preview` link also opens the worker demo; `/client-preview` opens the client demo. Both roles use the real dashboard, booking, messaging, directory, public profile and settings screens with an isolated in-memory sample API. Switch roles to try both sides of the same booking, and use Reset demo to start again. Refreshing discards sample account edits. The initial sample password is `demo1234`.

Open `/developer/worker/practice` for a fresh client request to install two lights in Rabat. Read the client message, negotiate in the conversation, propose a total price and visit time, and use the clearly labelled practice controls to simulate client acceptance and completion/review. Only this fake practice booking and conversation persist in session storage in the current tab; profiles and passwords remain in memory. Reset demo clears the practice job.

Sample actions never write to the backend or replace the real signed-in account. Account export downloads sample JSON; password changes are simulated and recovery does not send email. Language, theme and accessibility controls still use normal browser preferences. Map tiles remain external map images. These demos can be used on GitLab Pages without a running Laravel server.

## Search, scheduling and preview behavior

Service search is a free text field on the home and results pages. Recognized mistakes offer selectable suggestions across Arabic, French and English; leaving or submitting the field does not replace the typed text. City suggestions also require a choice. Moving services cover furniture, belongings and house moves.

Visit proposals use directly typed day/month numbers and a time with the current browser-local year. Month entry offers numbered choices and immediately shows the translated month name (for example, `6` → June); Arabic/Persian digits are normalized. Incomplete, impossible and past times receive translated inline explanations. The API still receives an ISO timestamp. Anonymous visitors are prompted to sign in or register from the worker profile and return to that profile afterward.

The GitLab Pages build sets `VITE_STATIC_PREVIEW=true`: real directory/account actions are unavailable there, and visitors are directed to the isolated demos. A normal build on the Laravel hosting server leaves this variable unset. A directory connection failure offers Retry and a clearly labelled sample-data search; it is never presented as an empty directory or silently replaced with fake workers.

## Desktop scroll walkthrough

On laptops, the top homepage section stays below the navigation while its home illustration zooms, service labels appear and its description changes. The search remains usable throughout; suggestions open above the field to stay within the viewport.

The `/#how-it-works` section offers client and worker walkthroughs. The client path explains choosing a service, selecting a worker, negotiating, understanding the fees and confirming. The worker path covers setting up a profile, reading and discussing a request, proposing the price and visit time, understanding the fees, then starting the accepted job and waiting for client-confirmed completion. A labelled example interface changes with the explanation and moves with scroll progress. Five step buttons jump through the sequence; Skip to services and the role's action link remain available. The worker action opens `/developer/worker/practice`. The illustrations do not create bookings or claim online payment handling.

Animation runs at widths of at least 1024 px and heights of at least 650 px. Tablets, shorter windows, reduced-motion preferences and the large-text setting get readable static explanations. Phones retain a compact three-step guide below the service and worker sections, with the same role buttons. Arabic, French and English and both themes are supported.

## Connection fees

New fee-enabled bookings charge each participant 10% of the agreed job price, separately from payment to the worker. Consent, both payment states and contact/start locks are implemented, with fake Cash Plus flows in the developer demo. Live charging stays disabled until a merchant account and provider-specific adapter are connected and verified. See [PAYMENTS.md](PAYMENTS.md) for the flow, adapter contract, refund limits and activation steps.

## Experience verification

See [EXPERIENCE-AUDIT.md](EXPERIENCE-AUDIT.md) for the latest client/worker browser audit and [DOMAIN-NAMES.md](DOMAIN-NAMES.md) for registry-checked name ideas and launch pricing recommendations.
