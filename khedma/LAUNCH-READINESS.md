# Khedma launch readiness

The application is ready for local UI review and a client–worker pilot. A domain can be chosen now, but public launch still requires HTTPS hosting, real email delivery and a tested backup restore. Nothing has been published by this change.

## Implemented

- Client and worker signup, phone/email sign-in, account editing, password changes and email reset flow.
- Eighteen services, separate aluminium and glass trades, butcher, Autres/Other work with a required custom trade name, and public transport vehicle choices.
- A fixed map with an animated translucent radius, 0.5 km buttons, typed fractional kilometres and location selection.
- White/black appearance in the visible navigation, with a browser-saved choice and mobile layout.
- Direct worker requests, price and future-time proposals, client confirmation, worker start, client completion, cancellation and one review per completed job.
- Private booking conversations and dashboard activity; retry-safe messages and booking requests.
- Booking event email notifications prepared for queued delivery. Message text and contact details stay in the authenticated app. Messages continue to use in-app activity, without a separate email for every message.
- API authentication/access checks, CSRF protection, throttling, no-store private responses, password changes that revoke other database sessions, and a database-aware health endpoint.
- `php artisan khedma:launch-check` reports configuration gaps without showing secrets. `--local` checks application data without requiring production configuration.

## Prepare hosting

Use a server supporting PHP 8.2+, Composer, PHP-FPM and Nginx. Build the React frontend with `npm ci` and `npm run build`. Copy the contents of `dist` to the frontend document root, and install the Laravel backend separately with `composer install --no-dev --optimize-autoloader`. Only Laravel's `public` directory should be reachable by the web server.

Examples are in `deployment/nginx.conf.example` and `deployment/khedma-queue.service.example`. They are templates, not installed services. Replace paths, domain, certificate paths and PHP socket with those of the actual server. The Nginx example routes `/api` and `/up` to Laravel while serving React routes from `index.html`; both use one HTTPS origin.

Configure the backend `.env` on the server; never put secrets into frontend variables:

```dotenv
APP_NAME=Khedma
APP_ENV=production
APP_DEBUG=false
APP_URL=https://YOUR-DOMAIN
FRONTEND_URL=https://YOUR-DOMAIN
SESSION_DRIVER=database
SESSION_SECURE_COOKIE=true
SESSION_HTTP_ONLY=true
SESSION_SAME_SITE=lax
QUEUE_CONNECTION=database
MAIL_MAILER=smtp
MAIL_HOST=YOUR-MAIL-HOST
MAIL_PORT=587
MAIL_USERNAME=YOUR-MAIL-USERNAME
MAIL_PASSWORD=YOUR-MAIL-PASSWORD
MAIL_FROM_ADDRESS=hello@YOUR-DOMAIN
MAIL_FROM_NAME=Khedma
PASSWORD_RECOVERY_ENABLED=true
BOOKING_EMAIL_ENABLED=true
```

Use the mail provider's required TLS settings. Generate a new application key for the first install with `php artisan key:generate`; preserve it across updates. For SQLite, use an absolute database path in `DB_DATABASE`, keep it outside the frontend document root, and make the database directory writable by the PHP/queue user. MySQL or PostgreSQL can be configured instead when hosting requires them. Give that user write access to Laravel `storage` and `bootstrap/cache`.

Before every release, take a backup, then apply:

```sh
php artisan migrate --force
php artisan db:seed --class=ServiceCategorySeeder --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan queue:restart
php artisan khedma:launch-check
```

Install and supervise the queue worker; do not rely on a terminal staying open. Check failed jobs with `php artisan queue:failed`. Retry after fixing delivery configuration. Email flags remain disabled locally. Test reset delivery and both sides' booking alerts with addresses you control before enabling them for real users.

## Pilot before opening registration publicly

Use separate browser sessions for a client and worker. Test signup, both appearance modes, phone/email login, profile edits, worker availability, services and vehicles. Send a request, retry it, propose a price and future visit, confirm, start, exchange messages, complete and review. Confirm unrelated accounts cannot open the job. Test cancellation and an expired proposal. Check Arabic on a real phone.

Check the health endpoint, queue restart after deployment, email delivery, password reset and backup restore on a disposable copy of the database. Validate the Nginx template with `nginx -t` after substituting actual hosting values.

## Remaining external setup and product limits

- A domain, hosting and TLS certificate have not been purchased/configured.
- A mail provider, sender address and actual delivery must be configured and verified. Phone-only accounts receive in-app activity but have no email reset or email alert delivery. SMS recovery/alerts require an SMS provider; they are not implemented.
- Google and Apple are optional and stay disabled until provider credentials and production callbacks are configured.
- The job price is paid directly to the worker. Separate 10% client and worker Khedma fees, consent and contact/start gates are implemented, with demo payments. Real charging remains disabled until a merchant account, provider-specific adapter and tested refunds are ready; see [PAYMENTS.md](PAYMENTS.md). Public announcement boards and live tracking are outside the current application.
- Agree support/contact information and service, pricing, cancellation and privacy wording before launch. Set up recurring backups appropriate to the hosting provider. The existing backup script is manual and uses the owner's local external drive.

A passing launch command confirms settings and database state, not real email delivery, queue uptime, legal wording or a successful pilot.

## Validation completed in this workspace

- Frontend production build and lint pass; routes load on demand and the previous large JavaScript chunk warning is resolved.
- Search regression checks pass, including separated aluminium/glass and butcher matching.
- All 72 backend tests pass (627 assertions), covering booking retry tokens, work start, expired proposals, private responses, session revocation, gated email notifications and launch checks.
- Browser checks confirm an intermediate animated circle radius, proportional growth from 2 to 2.5 km, unchanged map tiles, saved appearance and no phone overflow.
- Arabic RTL and signed-in worker navigation, settings, dashboard, search, guide and home were checked at 390, 1024 and 1280 pixels.
- Database migrations are applied locally; the local launch check passes. Production checks correctly fail for the local environment's HTTP/debug/mail settings.
- Laravel routes can be cached successfully. Hosting templates have not been installed or validated against a real server. No live mail, SMS or provider login was exercised.

## Prepared release and your next steps

`release/khedma-release.tar.gz` contains the built frontend, Laravel source, dependency lock file, deployment templates and this guide. It excludes `.env`, application keys, live databases, logs, uploads and installed dependencies. `SHA256SUMS` verifies its contents. The package is saved in the project’s `release` directory and can be copied to your chosen server.

To generate a new package after making changes, build the frontend, then run from the project root:

```sh
python3 scripts/prepare_release.py --output release
```

1. Choose the domain name and hosting. The host must support PHP 8.2+, Composer, PHP-FPM, an HTTPS web server, a database and a supervised queue worker. A host serving only static files cannot run this backend.
2. Obtain the server access and mail-provider settings. Keep passwords/API secrets on the server, not in chat or Vite variables. Decide whether to activate optional Google/Apple login.
3. Extract the package, install backend dependencies, configure `.env`, create the application key, point DNS to the server, configure TLS and apply the migrations/seeder. Use the templates and commands above.
4. Start the queue worker, test actual recovery/booking email delivery, run the production launch check, test backup restore on that server and complete a client–worker pilot using two browser sessions.
5. Publish once the pilot passes and the support/contact and service/cancellation/privacy wording is agreed. No domain or hosting purchase has been made and no public deployment has been performed.

Workers choosing Autres must enter their trade name. Clients see that name on the worker card and profile; custom trade names also match in client search. Removing the Other specialty clears its old trade name.

A local prelaunch database snapshot is saved at `backups/prelaunch/database.sqlite`. A restore into a temporary copy passed SQLite integrity checks. This local snapshot does not replace recurring off-server backups or a restore test on the eventual hosting server. The release package excludes all backup files.

## Connection fee update — 5 October 2026

[PAYMENTS.md](PAYMENTS.md) documents the 10% fee from each participant, the secure receipt contract and the merchant prerequisites. Twenty-nine frontend tests and 72 backend tests pass. Client payment layouts were checked at 320, 390, 1024 and 1440 px in all three languages and both themes. The demo completes the full job with separate fake Cash Plus/card payments. Both phone numbers and exact moving addresses stay locked until both fees are verified. Cancellation marks paid fees for refund processing; actual provider refunds are not automated.

The local database is migrated after a verified SQLite backup, saved in `backups/database-before-connection-fees-20261005.sqlite`. Existing bookings keep their fee-free terms. Live connection fees remain disabled. No live merchant integration or real payment was tested.

## Phone and desktop experience update — 5 October 2026

The homepage has a five-chapter client/worker scroll walkthrough with a labelled fee example. Phone signup uses a phone/email choice, optional map and clear localized validation. Job actions are above the conversation; Refresh keeps unfinished proposals. Larger controls, menu dismissal and cross-page anchors improve phone navigation.

The full client/worker job cycle and moving/cancellation/decline/profile/error paths passed against a separate disposable database. There were 570 page/layout combinations and 16 accessibility-preference layouts, plus desktop chapter and fake-payment checks. Frontend: 29 tests. Laravel: 72 tests, 627 assertions. Lint and both production builds passed. Physical devices, Safari, VPS behaviour and real merchant payments remain outside this browser audit. See `khedma/EXPERIENCE-AUDIT.md` in the owner workspace, or `EXPERIENCE-AUDIT.md` in the GitLab checkout.

The rate remains 10% each. The 5% launch recommendation and registry-checked domain ideas are documented in `DOMAIN-NAMES.md`. No domain was purchased or live checkout activated.

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
