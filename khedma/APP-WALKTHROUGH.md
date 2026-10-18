# Explaining Khedma from A to Z

The public interactive guide is `/guide`, available in Arabic, French and English. Open `/worker-preview` to try a sample worker request without your old login.

## Explain it to a client

“Khedma helps you find a worker for a home service in your city. You check the profile, send the problem and location, and wait for a price and visit time. You confirm the proposal when you agree. After the work, you mark it complete and leave a review.”

1. Choose a service and city on the homepage or search page. The catalog includes 18 services, including metalwork, air conditioning and appliances.
2. If no worker matches, browse other local services or the same service in another city. Travel is subject to the worker's agreement and radius.
3. Open the public profile. Check real specialties, availability, experience, description and reviews. An unrated worker has no invented rating.
4. Register as a client using email or phone and a password. Google/Apple need provider configuration first.
5. Send a direct request describing the problem and location. No payment is collected by the website.
6. Open/refresh your dashboard and job page. The worker proposes a total price in MAD and future visit time. Confirm if you agree, or cancel.
7. A confirmed booking shows the worker's phone if one is provided. Agree the scope, labor, parts and travel before work. Open the booking conversation to discuss details before confirming. Messages refresh every 10 seconds while the page is visible. Closed bookings retain a read-only history. Dashboard activity shows new requests, messages, proposals, confirmations, cancellations, completions and reviews; it refreshes every 15 seconds. Email, SMS and push alerts are not configured.
8. After the work, mark it complete. You may submit one rating and optional comment; it contributes to that worker's public rating.

## Explain it to a worker

“Khedma shows clients your services and receives requests assigned to you. You propose a price and time. The client accepts, you carry out the work, and the client confirms completion and can review it.”

1. Register as a worker and fill in city, description, experience, specialties and travel radius.
2. Enable availability in My account. Clients can request the services you actually list.
3. Open/refresh the dashboard to read your requests. Search as a worker shows only your assigned pending requests.
4. Read the description and location, then propose a total price and future visit time or decline.
5. The request remains pending until the client confirms. Existing proposals cannot be silently replaced.
6. Carry out only the agreed work. An active booking can be cancelled by either party.
7. The client marks it complete and may review it. Completed/cancelled bookings remain in history.

## Account and support explanation

Use My account for name, city, contact number, worker settings, password changes, language, accessibility and data export. Save profile edits; preferences apply immediately in this browser. Logout is available in both navigation and My account. Unsaved profile edits are discarded if you choose logout; save first if needed.

Email/password recovery is implemented with expiring, single-use links, but stays unavailable until real mail delivery is enabled and tested. Phone-only recovery is not implemented. Google/Apple users recover their provider credentials with that provider. No demo or preview grants access to a real account.

## Launch status

Working locally: accounts, worker search, 18 categories, direct requests, price/time proposals, client confirmation, cancellation, completion, reviews, settings, data export, logout and the guide.

Still needed: real email delivery configuration/live tests, phone account recovery strategy, SMS/push alerts, Google/Apple credentials if required, production HTTPS/hosting, backup recovery verification, real worker onboarding, support and booking/payment/cancellation policies, and a real-device client–worker pilot. The website is not yet declared production ready.

## Latest UI and backend completion pass

See [LAUNCH-READINESS.md](LAUNCH-READINESS.md) for the current implementation and server setup. The visible menu includes White/Black appearance. The fixed map animates the service circle while preserving its viewport, and radius values support fractional kilometres. Booking creation accepts a retry token; workers can mark confirmed work as started. Expired proposals cannot be confirmed. Other database sessions are revoked when a password is changed. Queued booking email delivery is controlled by `BOOKING_EMAIL_ENABLED` and is disabled locally. The launch checker reports deployment gaps without displaying secrets.
