# Public launch check — 6 October 2026

Decision: the application can be prepared on a domain/VPS for a staging pilot. It is **not yet cleared for a public paid launch**. Hosting, live email and merchant services have not been configured or exercised in this workspace.

## Real registrations and data

The public app obtains workers, accounts, messages, jobs and reviews from Laravel. Production does not substitute fake workers when the database is empty. The default database seeder installs only the 18 service categories, is repeatable and creates no people or jobs.

Deploy into a new database on the server. Do not copy a developer/demo/test database into production. The existing local accounts have not been deleted. Test records used in the latest browser pilot live only in `/tmp/khedma-production-pilot-20261006.sqlite`; that file is not included in the release.

`npm run build` now disables developer routes and sample-workspace links by default. Worker recruitment links open real worker signup. The local development server keeps developer practice; GitLab Pages remains an explicitly labelled static preview with real registration disabled. For an explicitly requested demonstration build only, use `VITE_ENABLE_DEMO=true` or `VITE_STATIC_PREVIEW=true`.

The name has not been chosen. Khedma is the current working name; domain placeholders stay unfilled.

## Server installation

Use hosting that runs PHP 8.2+, Composer, PHP-FPM/Nginx, a database and a supervised Laravel queue. A static-only host does not run registration/jobs. The release contains the compiled frontend, backend source and deployment templates.

1. Extract the release to `/srv/khedma`. Point the web root at `/srv/khedma/frontend`; expose only Laravel's `public` entry point through the Nginx API locations.
2. Install backend dependencies with `composer install --no-dev --optimize-autoloader`.
3. Copy `deployment/production.env.example` to the backend `.env`, replace the domain, mail and database placeholders, and generate an application key with `php artisan key:generate`. Preserve that key on future updates. Keep secrets outside Git and frontend variables.
4. For the first SQLite installation, create the new file specified by `DB_DATABASE`, give the PHP/queue user access to the file and containing directory, and keep it outside the frontend document root. On later updates, keep the existing production database and take a backup first.
5. Run `php artisan migrate --force` and `php artisan db:seed --class=ServiceCategorySeeder --force`. Never use `migrate:fresh` on the live database.
6. Configure the domain/DNS and obtain the HTTPS certificate using DNS validation or a temporary HTTP challenge configuration before installing the full TLS template. Fill `deployment/nginx.conf.example` with the actual domain, paths, certificate and PHP socket, run `nginx -t`, then reload Nginx.
7. Configure the mail provider's actual transport settings. The sample uses SMTPS/465; use the provider's required settings instead if it uses another port/scheme. Install the queue service from `deployment/khedma-queue.service.example` and verify it remains running.
8. Cache configuration/routes/views, restart the queue, then run the launch command below.

```sh
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan queue:restart
php artisan khedma:launch-check --require-fees
```

A passing command checks configuration, key validity, migrations and catalogue. It does not prove live email delivery, TLS operation, merchant settlement or refund delivery.

## Paid-launch blockers

- **Card/Cash Plus checkout:** fees remain disabled. There is a tested adapter contract and fee-gating logic, but no completed provider-specific integration or merchant account. Configure and test both independent payments, verified receipts, refunds and settlement before enabling fees. `--require-fees` fails when fees are disabled; enabled fees also require the adapter configuration. See PAYMENTS.md.
- **Recovery and email alerts:** configure a real sender/transport and prove delivery using accounts you control. Phone-only forgotten-password recovery is not implemented. Agree a recovery/support process or provide an SMS recovery integration before relying on phone-only accounts for a broad launch.
- **Hosting verification:** check HTTPS, session cookies, private API access, queue supervision and the real domain's `/api/health` on the chosen server. Local HTTP tests do not establish server readiness.
- **Operations:** provide real support contact details and publish the service/privacy/fee/cancellation/refund terms that match the actual business. Existing problem notes are messages between participants; they do not constitute staffed customer support.
- **Backups:** configure recurring backups outside the server and test restoring them. A local disposable-database restore is useful evidence but does not replace testing the production backup process.

## Final release review on the actual server

Use two separate real browser sessions on a physical phone and laptop. Register a client and worker; try phone/email login, search, messages, offer/date, fee acceptance, both real checkout methods, worker start, client completion and review. Test cancellation, an expired proposal, email reset, denied access from a third account and a refund. Verify that no test/demo person or job appears in public search.

Only announce the paid marketplace after those server/provider checks pass. Buying the domain/server and preparing staging can happen first.

## Completed local verification

- 41 frontend tests and 78 Laravel tests (681 assertions), lint and live/static-preview builds pass.
- Current production npm/Composer security audits report zero advisories; no abandoned production Composer packages were reported.
- The public production build passed 68 browser assertions against a new disposable Laravel database: empty search without invented workers, blocked demo routes, worker recruitment opening the correct signup role, real phone-only worker/email-only client registration, canonical phone sign-in, correct trade matching, request/messages/price/date, client acceptance, worker start, completion and persisted review. This pilot had fees disabled and therefore does not verify real payment.
- The production homepage passed all three languages, both themes and 320/390/1024/1440 px without horizontal overflow or demo destinations. No uncaught application errors occurred in that pilot. The earlier broader 586 layout cases are recorded in EXPERIENCE-AUDIT.md.
- A backup of the disposable database was restored: integrity and foreign-key checks passed, with two test accounts, one worker, one completed job, one review and the 18 categories preserved. No test data was copied into the release.
- Local catalogue/data checks pass. The production/paid check correctly fails for the current HTTP/development environment, disabled fees and absent live mail setup. HTTPS/provider/server tests and physical-device testing remain required.

Evidence: `/tmp/khedma-public-launch-pilot-results.json`, `/tmp/khedma-public-backup-restore-results.json`, `/tmp/khedma-production-npm-audit.json`, `/tmp/khedma-production-composer-audit.json`.

The public release builder checks the compiled HTML build-mode marker and refuses a static-preview/developer build. Rebuild with `VITE_STATIC_PREVIEW=false VITE_ENABLE_DEMO=false npm run build` if that check fails. Six additional browser checks passed for the phone/desktop recruitment links and the preserved isolated static-preview workspaces; evidence: `/tmp/khedma-public-build-mode-results.json`.
