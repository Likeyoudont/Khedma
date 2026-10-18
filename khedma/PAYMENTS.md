# Khedma connection fees

The agreed rule is **10% of the job price from the client and 10% from the worker**. The job price stays separate: the client can pay the worker in cash. For a 200 DH job, the client pays Khedma 20 DH and the worker 200 DH; the worker separately pays Khedma 20 DH and keeps 180 DH. Khedma collects 40 DH gross, before provider charges, refunds and other expenses.

Cash Plus is the only offered checkout method for now. Bank/card payments are deferred. The backend rejects new card checkout requests, including direct API calls; signed receipts for existing card records remain supported.

## Implemented flow

1. Each worker profile discloses the fees when enabled. The worker sees the fee and net earnings while entering the proposal, and must consent before submitting.
2. The client sees their fee and total cost, and must consent before confirming. Both consent timestamps and the rate are recorded.
3. Confirmation creates two separate obligations, each with its own immutable reference, payer and amount in centimes. Prices have at most two decimal places; fees round to the nearest centime, half up.
4. Each participant can initiate only their own payment. The API keeps both phone numbers locked until both fees are verified. Exact moving pickup/dropoff/access information is withheld from the worker until then; the client retains their own information. Work cannot start before both fees are verified.
5. Cancellation voids unpaid obligations and marks paid ones `refund_pending`. Late payment after cancellation or expiry also requires a refund. `refunded` requires a verified merchant receipt. **No automatic money refund is implemented**: the operator/adapter must issue it through the merchant provider first.

Free or very small jobs with a rounded fee of zero unlock without a checkout. Existing real bookings retain their original fee-free terms. Turning the flag off affects new bookings only; it does not remove obligations on existing fee bookings.

Public profile text and unpaid booking descriptions, problem notes, messages, activity and account exports filter common phone/email/link formats. New contact messages are rejected while locked. This is best-effort filtering: it cannot prevent spelled-out or obfuscated contact information, exact addresses embedded in prose, repeat arrangements outside the app, or a worker’s identity being found elsewhere. Moderation and enforceable product terms remain necessary.

## Try without paying

Open `/developer/worker/practice`. Negotiate, enter a price and visit time, accept the worker fee, and simulate client acceptance. Simulate your own Cash Plus payment and the client’s fee payment, or switch to `/developer/client` to pay from the other role. The Start button unlocks only after both simulations. Complete the job and simulate the client’s completion/review.

Use Reset demo to get a fresh request. Only fake practice data persists in the current tab. No card numbers, provider credentials, real transactions or backend writes are involved. The seven older sample bookings illustrate the original lifecycle; new practice requests and new client demo requests include fees.

## Live payments are not activated

`CONNECTION_FEES_ENABLED=false` by default, including in the owner’s running backend. No real account has been charged. The local database migration is applied; a verified SQLite backup was taken first.

A personal bank card cannot serve as a website merchant integration. Cash Plus requires its professional payment setup/contract; card checkout also needs a suitable merchant provider. Official starting points: [Cash Plus Payment](https://www.cashplus.ma/services-professionnels/cash-plus-payment) and [CMI ecommerce payment](https://www.cmi.co.ma/fr/solutions-paiement-ecommerce).

**This repository contains a Khedma payment-adapter contract, not a completed native Cash Plus or CMI integration.** The provider account, actual provider API documentation/credentials, provider-specific adapter, verified checkout and refund delivery remain external setup. Do not enable real fee bookings before these work: otherwise users can agree but cannot pay or start.

Backend configuration only, never in `VITE_*` variables:

```dotenv
CONNECTION_FEES_ENABLED=false
PAYMENT_ADAPTER_URL=https://YOUR-PRIVATE-ADAPTER/checkout
PAYMENT_ADAPTER_TOKEN=YOUR-SERVER-ONLY-TOKEN
PAYMENT_WEBHOOK_SECRET=YOUR-SEPARATE-SERVER-ONLY-SECRET
```

The token and receipt secret must each contain at least 32 characters. Use separately generated random values. Keep them in the server’s secret configuration, never Git or chat. Set `APP_URL` and `FRONTEND_URL` to the real HTTPS origin.

## Contract for the future merchant adapter

Khedma POSTs to `PAYMENT_ADAPTER_URL` using `Authorization: Bearer PAYMENT_ADAPTER_TOKEN`:

```json
{
  "reference": "a-unique-uuid-for-this-payer",
  "amount_cents": 2000,
  "currency": "MAD",
  "method": "card",
  "return_url": "https://YOUR-DOMAIN/job/123",
  "receipt_url": "https://YOUR-DOMAIN/api/billing/receipt"
}
```

`method` is currently `cashplus` for new checkouts. Receipt handling also accepts `card` for existing records. The adapter authenticates requests, validates Khedma’s configured return/receipt origins, persists the obligation and implements the provider’s documented protocol. **Repeated requests for the same reference must return the same checkout without collecting a second payment.** A successful response contains `{"checkout_url":"https://PROVIDER-CHECKOUT/..."}`. Checkout URLs must use HTTPS. Card details belong on the provider’s checkout, never in Khedma’s forms. The payment method remains fixed after the first attempt; retries resume that attempt.

After independently verifying the provider’s transaction, the adapter sends this JSON to `/api/billing/receipt`:

```json
{
  "reference": "the-original-payer-uuid",
  "method": "card",
  "transaction_id": "provider-unique-transaction-id",
  "event": "paid",
  "amount_cents": 2000,
  "currency": "MAD"
}
```

`event` is `paid` or `refunded`. `amount_cents` is a JSON integer and must match the original obligation exactly. Use the provider’s unique payment/refund transaction IDs; a transaction cannot pay another obligation. For each delivery, add:

- `X-Khedma-Timestamp`: current Unix time in seconds, within five minutes of Khedma’s server clock.
- `X-Khedma-Signature`: lowercase hexadecimal HMAC-SHA256 of `timestamp + "." + exactRawJsonBody`, signed with `PAYMENT_WEBHOOK_SECRET`.

Both sides need synchronized clocks. The adapter must authenticate and verify the actual provider notification before signing this internal receipt. A signed receipt retry is idempotent; it needs a fresh delivery timestamp after five minutes. Browser redirects, user-supplied amounts, `simulate`, and user-supplied `paid` flags cannot verify real payments. The receipt route is exempt from browser CSRF because it requires this server signature.

The adapter must reconcile paid/refund-pending obligations against the provider, surface failed deliveries and operate refunds. Khedma’s payment/receipt tables record those states; an operator billing dashboard and automatic provider reconciliation are not implemented in this change.

## Deployment and activation

Back up the database, deploy both React and Laravel, then run `php artisan migrate --force` and refresh configuration/route caches. The owner’s backend lives in the sibling `khedma backend` directory; `backend` is the tracked deployment source snapshot.

On a staging merchant account, verify both methods with two independent users, denied third-party access, amount matching, duplicate receipt delivery, expired/cancelled checkout, provider refund delivery and receipt retries. Verify real settlement to the business’s merchant account. Fake HTTP responses in automated tests do not prove the provider integration.

Enable `CONNECTION_FEES_ENABLED=true` only after checkout and refunds pass. Run `php artisan config:cache` and `php artisan khedma:launch-check`. The command checks configuration presence and applied migrations; it cannot verify the provider connection or settlement. Agree the customer-facing fee and refund terms before launch.

## Verified locally

- 29 frontend tests and 72 Laravel tests (627 assertions) pass; build and lint pass.
- Browser simulation covers proposal, consent, client confirmation, each payer’s separate method, contact unlocking, start, completion and review, with no backend payment requests.
- The client fee screen passes 24 layout combinations: three languages, both themes and 320/390/1024/1440 px. No horizontal page overflow or missing fee translations was found.
- No merchant checkout, real card charge, Cash Plus payment, settlement or real refund has been exercised.

## Cash Plus only — 9 October 2026

Cash Plus is the only displayed payment action in live and demo views. The backend checkout allowlist and demo API reject new card attempts. Card receipt verification remains available for records created before this change. Local checks confirm real fees are disabled and merchant checkout is unconfigured; demo payment buttons simulate payments only. Bank/card checkout is deferred.

Cash Plus describes merchant onboarding as a contract, API integration, development testing and then production activation. Its public page does not specify the merchant settlement account requirements. Confirm how payouts reach you with Cash Plus; no personal payout account or unverified payment-reference form has been added.

Validation for this change: 41 frontend tests, the 86-test backend suite, both production builds and lint passed. The final payment-specific rerun passed 15 tests (205 assertions), including Cash Plus-only validation and expiry protection. The phone browser journey passed nine checks, including exactly one Cash Plus checkout button and separate client/worker simulated payments, with no runtime errors. Evidence: `audit-results/cashplus-phone-flow.json`.
