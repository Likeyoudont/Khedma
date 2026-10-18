# Khedma

Khedma connects clients with local professionals in Morocco. Clients can find workers, discuss a job, agree on a price and visit time, and follow the booking through completion. Workers can manage their profiles, service areas, requests and conversations.

## What I worked on

I built Khedma around the full journey between a client and a local worker: finding someone, sending a request, discussing the details, agreeing on a price and visit, and confirming completion. My work covers the React interface, Laravel API, database structure, account flows and developer demos.

I also worked on making that journey usable in Morocco: Arabic, French and English; Moroccan phone-number formats; city and service search; worker service areas; and moving requests that need more detail than a simple appointment.

## Challenges and how I addressed them

| Challenge | What I worked on |
| --- | --- |
| Supporting three languages on small screens | Added translated validation, RTL layouts, Arabic/Persian digit normalization and layout checks across languages, themes and screen sizes. |
| Explaining two different user journeys | Built separate client and worker walkthroughs, dashboards and practice demos, with clear next actions for each booking state. |
| Keeping the animated homepage readable | Added static layouts for small windows, reduced-motion support, keyboard chapter navigation and a remembered “Read at my pace” option. |
| Preventing lost work and confusing retries | Preserved form drafts during refresh/navigation, added delayed loading feedback and timeout guidance, and used retry tokens for booking/message writes. A timed-out submission can already have been saved, so it is not automatically repeated. |
| Handling Moroccan phone input consistently | Matched frontend and backend normalization for local and international formats, spaces and Arabic/Persian digits, with clearer duplicate-account feedback. |
| Handling concurrent logins with SQLite | Investigated database lock errors and shared-network rate limits. Added SQLite settings, bounded counter retries and per-identity/IP throttling. Local load tests removed the observed server errors, but the largest burst remained too slow for the frontend timeout; production capacity still needs testing. |
| Letting visitors try the app safely | Built isolated sample APIs for client/worker demos and a static preview mode, keeping demo actions separate from real accounts and bookings. |
| Designing fees without claiming working live payments | Implemented consent, payment states and contact/start gates, plus simulated demo payments. Real merchant integration, settlement and refunds remain unfinished external setup. |

This work taught me that a working screen is only one part of a marketplace: preserving user input, handling slow requests, enforcing booking permissions and making each person's next action clear also matter. The audit notes record the problems found, changes made and limits of the local checks; they are not a claim of production readiness.

## Features

- Arabic, French and English interfaces, including right-to-left Arabic layouts.
- Worker search by service and city, public profiles and service-area maps.
- Client and worker dashboards with booking messages, visit proposals and reviews.
- Moving requests with pickup, drop-off, transport and carrying-help details.
- Light and dark themes, responsive layouts and reduced-motion support.
- Isolated developer demos for trying both sides of a booking.

## Stack and layout

The frontend uses React 19, Vite 8, React Router, i18next and GSAP. The API uses Laravel 12 with SQLite by default.

```text
khedma/
  src/          React application
  public/       Static assets
  backend/      Laravel API, migrations and tests
  tests/        Frontend logic tests
  scripts/      Audit, backup and release utilities
  deployment/   Hosting configuration examples
khedma backend/ Existing owner's local backend
```

The sibling `khedma backend` directory is the owner's existing backend workspace and may contain a private local database. Fresh clones can use `khedma/backend` with the instructions below. Keep each backend's environment and database separate.

## Local setup

Install Node.js 22.12+ (or a newer supported release), npm, PHP 8.2+, Composer and PHP's SQLite extensions.

```bash
git clone https://github.com/Likeyoudont/Khedma.git
cd Khedma/khedma
npm ci
npm run dev
```

In another terminal, from the cloned repository root:

```bash
cd khedma/backend
composer install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate
php artisan db:seed --class=ServiceCategorySeeder
php artisan serve --host=127.0.0.1 --port=8000
```

Open the URL printed by Vite, usually `http://localhost:5173`. Vite forwards `/api` requests to Laravel on port 8000. The category seeder adds service categories; it does not create worker accounts.

If you already use the sibling `khedma backend` locally, start Laravel there instead and keep its existing `.env` and database.

## Try the demos

During local development, visit `/developer` and choose the worker or client demo. `/developer/worker/practice` opens a practice request. Demo actions use sample data and do not change real accounts or bookings. Most demo data resets on refresh; the practice booking persists in the current tab's session storage.

To run the frontend as a static preview without Laravel:

```bash
npm run dev:preview
```

For a static preview build, run `VITE_STATIC_PREVIEW=true npm run build`. Static hosting alone does not provide real authentication, bookings or messaging. Normal production builds disable the developer demos unless `VITE_ENABLE_DEMO=true` is explicitly set.

## Validation

Run from `khedma`:

```bash
npm run lint
npm run build
node --test --experimental-test-isolation=none tests/*.test.js
```

Run backend checks from `khedma/backend`:

```bash
php artisan test
php artisan khedma:launch-check --local
```

Browser audit scripts live in `scripts/audits`; generated screenshots and reports are ignored by Git.

## Deployment and integrations

A live marketplace needs the Laravel backend, persistent storage and the frontend served with the appropriate API routing. See [launch readiness](LAUNCH-READINESS.md) and the templates in `deployment/` for hosting, queues and backups.

Google/Apple sign-in, recovery email and booking email require provider configuration. Live connection-fee charging is disabled by default and requires a verified merchant adapter. When enabled, the fee flow charges each participant 10% of the agreed price, separately from payment to the worker. See [payment setup](PAYMENTS.md).

Keep `.env`, credentials, databases, uploads, dependencies, logs and backups out of Git. Example environment files are included for configuration.

## Further documentation

- [Database setup](DATABASE-SETUP.md)
- [Application walkthrough](APP-WALKTHROUGH.md)
- [Launch readiness](LAUNCH-READINESS.md)
- [Payments](PAYMENTS.md)
- [Browser audits](scripts/audits/README.md)
