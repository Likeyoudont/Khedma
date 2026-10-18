# Khedma API

Laravel 12 backend for Khedma's accounts, worker directory, bookings, messages, reviews and optional connection fees.

See the [backend setup guide](KHEDMA_SETUP.md) for local setup and verification. The main project README contains the complete frontend/backend startup instructions. PHP 8.2+, Composer and PHP SQLite support are required.

Copy `.env.example` to `.env` on first setup, generate an application key, create the SQLite database and run migrations before starting the server. Never overwrite an existing environment or database during an update.

```bash
php artisan serve --host=127.0.0.1 --port=8000
php artisan test
php artisan khedma:launch-check --local
```

The frontend development server proxies `/api` to port 8000. Email, social login and live payment integrations require separate provider configuration.
