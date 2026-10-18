# Khedma backend

Laravel backend for the React frontend. The owner runs this directory beside `khedma`; a GitLab checkout includes the same source in `backend`.

## Run locally

Install PHP/Composer dependencies, copy `.env.example` to `.env`, configure a local SQLite database, and generate an application key on the first install. Keep `.env` private.

```bash
composer install
php artisan migrate
php artisan db:seed --class=ServiceCategorySeeder
php artisan serve --host=127.0.0.1 --port=8000
```

Run `npm run dev` in the frontend directory. Vite proxies `/api` to port 8000; session authentication and CSRF use the same browser origin. Check `/up` and run `php artisan khedma:launch-check --local` for local configuration/data checks.

## Updating existing installations

Back up the database, deploy matching frontend/backend versions, and run `php artisan migrate --force`. The migration `2026_10_04_000001_add_booking_request_details` adds moving details and cancellation reasons. It preserves existing bookings.

Bookings can be canceled before work starts, with a reason. The assigned worker starts confirmed work; the client explicitly confirms completion afterwards. Private problem notes can be recorded by either participant, including after closure, and notify the other person. These notes do not route to a staffed support service or handle refunds.

The API stores moving pickup/drop-off, belongings, access, vehicle and carrying-help choices. Legacy moving bookings without those details remain readable. Booking/message/problem-note retry tokens prevent duplicate writes.

## Verify

`php artisan test` uses the in-memory SQLite configuration in `phpunit.xml`; it does not use the local account database. For production hosting, TLS, mail, queues and backup procedures, follow the frontend repository README and launch readiness guide.

Email recovery and Google/Apple login require configured providers. SMS recovery is not implemented. GitLab Pages currently builds a static preview; a live service needs the Laravel backend hosted with the frontend.
