These audits run only against local servers. Browser checks emulate Chromium viewports; they do not establish physical iPhone/Safari behavior or enumerate every possible user action.

From the frontend folder, start `npm run dev` on port 5173. Install Playwright separately if it is not installed:

```sh
npm install --prefix /tmp/khedma-browser playwright
PLAYWRIGHT_MODULE=/tmp/khedma-browser/node_modules/playwright/index.mjs BROWSER_PATH=/usr/bin/brave-browser node scripts/audits/browser.mjs
PLAYWRIGHT_MODULE=/tmp/khedma-browser/node_modules/playwright/index.mjs BROWSER_PATH=/usr/bin/brave-browser node scripts/audits/phone-flows.mjs
```

The layout audit intercepts only `/api/` URLs, blocks external map images, and checks that page headings load. The phone flow uses the demo store and fake payments. Reports and screenshots go to `/tmp/khedma-browser` and `/tmp`.

The login load test creates an isolated database with 1000 fake accounts, real password verification, separate cookies and CSRF tokens. It never reads your `.env` or copies your database. Prepare it with:

```sh
python3 scripts/audits/prepare-load.py
```

The command prints a new temporary directory. In a separate terminal, replace `<directory>` with that path:

```sh
cd <directory>/app
PHP_CLI_SERVER_WORKERS=8 php -S 127.0.0.1:8099 <directory>/router.php
```

Then, from the frontend folder:

```sh
AUDIT_OUTPUT=/tmp/khedma-load-results node scripts/audits/login-load.mjs shared audit
php <directory>/clear.php
AUDIT_OUTPUT=/tmp/khedma-load-results node scripts/audits/login-load.mjs distinct audit
```

The synthetic IP header is handled only in the temporary harness. Never deploy its router or bind it to a public address. There is no equivalent header trust in the real app. Password cost is 10 for this test; production may use a higher cost. The test submits 1000 login promises together after preparing sessions. Accepted socket connections and processing are queued by the local PHP server. Report latency includes that queue, not session setup. It checks every successful response belongs to the requested account. This is a local burst test, not a production capacity certification.

Additional controls and short-laptop checks use the same Playwright environment:

```sh
PLAYWRIGHT_MODULE=/tmp/khedma-browser/node_modules/playwright/index.mjs node scripts/audits/auth-controls.mjs
PLAYWRIGHT_MODULE=/tmp/khedma-browser/node_modules/playwright/index.mjs node scripts/audits/short-laptop.mjs
```

For the built preview check, build with `VITE_STATIC_PREVIEW=true npm run build -- --outDir /tmp/khedma-preview-final`, serve it with `npm run preview -- --outDir /tmp/khedma-preview-final --host 127.0.0.1 --port 4173`, then run `scripts/audits/preview.mjs` with the same Playwright environment.

To repeat just the desktop/phone interaction assertions after a completed layout sweep, add `--interactions-only` to `browser.mjs`. Layout evidence is written separately to `layout-results.json`; interaction-only results report zero layout checks by design.

Desktop design and slower-story audit (eight viewport sizes, three languages, both themes):

```sh
PLAYWRIGHT_MODULE=/tmp/khedma-browser/node_modules/playwright/index.mjs AUDIT_BASE_URL=http://127.0.0.1:5173 node scripts/audits/desktop-design.mjs
```

This checks section widths, all ten role chapters on a short laptop, reading mode and reduced motion. Chapter assertions wait for the deliberately slower GSAP catch-up. Results go to `/tmp/khedma-browser/desktop-redesign-results.json`.
