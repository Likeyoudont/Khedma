# Khedma database and backups

The working SQLite database is `backend/database/database.sqlite` on the internal disk. The external WORK volume stores backups only.

## Tables

- `users`: existing accounts, plus role (`ba7it` client or `mihaniy` worker), phone and city. Role changes must be validated by the future account API; role is not mass assignable.
- `service_categories`: 18 categories matching the frontend service keys.
- `worker_profiles`: one profile per worker, experience, radius, availability and photo path.
- `service_category_worker_profile`: workers' specialties.
- `bookings`: client, optional assigned worker, category, location, price in MAD, status and dates.
- `reviews`: one rating (1–5) and optional comment per booking. The future API must enforce that only the booking client can review a completed booking.

Laravel's existing `jobs` table is for background tasks, not customer bookings. Existing accounts default to client. No demo workers or bookings have been added.

## Initialize another local checkout

From `backend`, with the local `.env` configured for SQLite:

```sh
php artisan migrate
php artisan db:seed --class=ServiceCategorySeeder
php artisan test
```

## Back up

Connect WORK, then run from the project root:

```sh
python3 scripts/backup_khedma.py
```

Backups go into `/run/media/issam-abdelhak/WORK/Khedma-backups/<UTC timestamp>/` and include a consistent SQLite snapshot, project source and uploaded files. Dependencies, build output, logs, `.env` files other than `.env.example`, and key files are excluded. Custom secrets embedded in source are not detected. This is a manual backup; no automatic schedule is installed.

An `INCOMPLETE` marker means the backup did not finish. Successful snapshots pass SQLite integrity checking. Source and upload files are archived sequentially; avoid modifying uploads while backing up.

## Restore

Stop the backend and queue workers. Preserve the current database before replacing it with a chosen backup's `database.sqlite`. Inspect/extract `project-and-uploads.tar.gz` into a separate directory first, then copy needed source/uploads. Restore your local `.env` separately; it is excluded from backups. Restart Laravel and verify the application. Restoring replaces current data, so do it only when needed.

## Current scope

Registration, login, current-account lookup and logout are connected to Laravel sessions. Accounts can use email or phone; Moroccan phone numbers normalize to +212. Worker registration stores the profile and specialties in one transaction. Passwords require at least eight characters and are hashed. Account roles come from the server; protected dashboard/job pages require sign-in.

Run Laravel and Vite in separate terminals:

```sh
cd "backend"
php artisan serve --host=127.0.0.1 --port=8000
```

```sh
npm run dev
```

Open the Vite URL. Its `/api` proxy forwards browser requests to Laravel, including session cookies. Production hosting must likewise serve `/api` through Laravel on the frontend's origin, with HTTPS and secure session cookies. Auth mutations use Laravel web middleware with CSRF protection and registration/login rate limits.

Worker search, homepage listings and public profiles now load registered workers from `/api/workers` and `/api/workers/{id}`. Public responses exclude account email, phone and password. Ratings and reviews come from completed bookings; unrated workers show no invented rating. Distance is omitted until coordinates are available. No demo workers are inserted.

Booking requests, job pages, dashboards and workers’ request search now use session-authenticated `/api/bookings` endpoints. Requests are visible only to their client and assigned worker. Workers propose a price in MAD and a future visit time; clients confirm the proposal. Either party can cancel an active booking, and workers can decline a pending request. Only the client can mark an accepted job complete and submit one review. Public worker ratings reflect these completed-job reviews.

The dashboard and job page refresh every 15 seconds while visible and also provide a refresh button. Booking conversations poll every 10 seconds. In-app activity is saved in `booking_activities`; Queued email notifications for booking events are implemented but disabled until real mail delivery is configured. SMS/push notifications and live location tracking are not implemented. Search for workers shows only requests assigned to that account, not a public announcement board. Existing browser-only prototype requests are not imported. Online payments remain unconnected.

For a local walkthrough, register an available worker with a specialty and a client in separate browser sessions. Request that worker, propose a price/time as the worker, refresh and confirm as the client, then complete and review the job. No new database migration is needed for this flow.

## Google and Apple sign-in

Google/Apple buttons appear above the phone/email password forms. A provider remains disabled until its server credentials are configured. New social users complete their name, city and role; workers also complete specialties and availability. Existing password accounts are not automatically linked by email. Use the original password for those accounts. The worker dashboard preview is `/worker-preview`; it uses clearly labeled samples without changing any account or real booking.

Install backend dependencies with `composer install`, then run `php artisan migrate` to create `social_accounts` on another checkout. The local database has already been migrated. Tokens are verified with `firebase/php-jwt`; identity tokens, access tokens and client secrets are never sent to the frontend. OAuth state expires after ten minutes and is bound to an encrypted browser cookie. The only CSRF exception is Apple's callback, which verifies that binding and state before exchanging the authorization code.

Set these values in the backend `.env`, then run `php artisan config:clear`:

```dotenv
FRONTEND_URL=http://localhost:5173
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:5173/api/auth/social/google/callback
APPLE_CLIENT_ID=
APPLE_CLIENT_SECRET=
APPLE_REDIRECT_URI=https://YOUR-DOMAIN/api/auth/social/apple/callback
```

For Google, create a Web application OAuth client and register the exact redirect URI, configure the consent screen and add test users if the app is still in testing. See [Google OpenID Connect setup](https://developers.google.com/identity/openid-connect/openid-connect).

For Apple, configure a Sign in with Apple Services ID, associate it with an enabled App ID, and register your HTTPS domain and return URL. `APPLE_CLIENT_ID` is the Services ID; `APPLE_CLIENT_SECRET` is a signed Apple client-secret JWT generated using your Team ID, Key ID and private key. Rotate that JWT before expiry. Apple requires an HTTPS domain, so this flow is not available on plain localhost. See [Apple environment setup](https://developer.apple.com/documentation/signinwithapple/configuring-your-environment-for-sign-in-with-apple) and [token validation](https://developer.apple.com/documentation/SigninwithAppleRESTAPI/Generate-and-validate-tokens).

Use your frontend HTTPS origin for `FRONTEND_URL` and both callback URLs in production, proxy `/api` to Laravel, and set secure session cookies. Do not paste provider secrets into chat or put them in Vite variables. Provider login itself still needs a live test after credentials are configured.

## Search suggestions

Service input recognizes English, French and Arabic labels and common aliases, and shows suggestions for unambiguous typos. Submitting uses the recognized service. City matching handles common Moroccan aliases, accents and conservative typo correction. When there are no matching workers, search shows other services represented in that city and workers offering the requested service in other cities, with travel advice. These alternatives come from the public worker directory; no invented workers or cities are added. Registered city coverage and worker travel radius still require users to provide accurate profile information.

Search regression checks: `node tests/search.test.js` from the project root. Backend checks: `php artisan test` from `backend`.


## Account and worker profile editing

Signed-in users can open `/account` from the navigation or dashboard to change their name, city and phone. Moroccan phone formats use the same normalization as registration/login, and normalized phone numbers must be unique. Password accounts must provide their current password to change a phone number; phone-only accounts cannot remove their only login identifier. Social accounts can add a contact phone without a password. Email and account role cannot be changed through this endpoint.

Workers can edit their description, experience, specialties, travel radius and availability. These updates immediately appear in public worker listings and profiles. Turning availability off blocks new requests without cancelling existing bookings. Only the signed-in account is updated, with account/profile/specialty updates saved in one transaction.

The password-change form requires the current password and matching new-password confirmation. Social users continue to manage their provider password with Google/Apple. This is a password-change flow for signed-in users; email forgotten-password recovery is implemented and remains disabled until a real mail transport is configured and tested. Phone/SMS recovery is still pending. Google/Apple developer credentials are still required to activate provider sign-in.

## Settings organization and data controls

`/account` now groups personal details, worker services, sign-in/security, preferences, privacy and help. Navigation links jump to each section. Password accounts see show/hide password fields; provider accounts see links to the provider's security settings. Profile edits have explicit save feedback and a warning before browser refresh/close when unsaved. Language, reduced motion and larger text apply immediately and are saved only in the browser. Internal navigation does not trigger an unsaved-edit confirmation.

`GET /api/auth/settings` identifies sign-in methods for the signed-in account without exposing provider subjects. `GET /api/auth/export` downloads account/profile information and bookings involving that account, with no passwords, tokens or unrelated account records. Both require the Laravel session; export is rate limited and sent with a no-store cache directive. See `SETTINGS-RESEARCH.md` for reference sources and remaining account-control work.

## Walkthrough, logout and password recovery

`/guide` explains the complete client and worker flows, account settings and current limitations in all three languages. `/worker-preview` remains a clearly labeled example. My account includes Logout as well as the existing navigation logout. See `APP-WALKTHROUGH.md` for an owner-facing explanation and launch checklist.

Email/password recovery uses Laravel's broker and existing `password_reset_tokens` table. Tokens expire after 60 minutes and are consumed on successful reset; requests and resets are rate limited. Unknown/social accounts receive the same reset-request response. Social-account passwords are not reset through Khedma. A reset rotates the remember token and removes that user's database sessions when using the database session driver. Other session drivers require their own revocation strategy before production.

Configure a real mail transport, the sender and `FRONTEND_URL`, test delivery with an address you control, then set `PASSWORD_RECOVERY_ENABLED=true` and run `php artisan config:clear`. Recovery is disabled for log/array/failover transports so the UI does not pretend logged messages are delivered emails. SMTP host/port/credentials must come from your mail provider; keep secrets in the backend `.env`. Do not expose reset links in logs or forward them. The frontend uses a no-referrer policy. Phone-only account recovery is still pending, and no recovery email has been sent as part of automated tests.

## Booking communication

Run `php artisan migrate` to create `booking_activities`. Only the booking client and assigned worker can access the conversation. Messages are limited to 2,000 characters, sending is rate limited, and a client-generated UUID prevents duplicate messages on retry. Completed/cancelled bookings retain readable history but reject new messages. Reading a conversation acknowledges received messages; dashboard activity can be marked read separately. Activity records are committed with booking changes. Polling works while the site is open and visible; it does not replace email/SMS/push delivery.

## Latest UI and backend completion pass

See [LAUNCH-READINESS.md](LAUNCH-READINESS.md) for the current implementation and server setup. The visible menu includes White/Black appearance. The fixed map animates the service circle while preserving its viewport, and radius values support fractional kilometres. Booking creation accepts a retry token; workers can mark confirmed work as started. Expired proposals cannot be confirmed. Other database sessions are revoked when a password is changed. Queued booking email delivery is controlled by `BOOKING_EMAIL_ENABLED` and is disabled locally. The launch checker reports deployment gaps without displaying secrets.
