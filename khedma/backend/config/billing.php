<?php

return [
    // Enable for new bookings after merchant checkout and refunds have been tested.
    'enabled' => env('CONNECTION_FEES_ENABLED', false),
    'rate_bps' => 1000,
    // Cash Plus only for now; bank/card checkout is deferred.
    'checkout_methods' => ['cashplus'],
    // A private adapter implements the merchant's own card/Cash Plus protocol.
    'adapter_url' => env('PAYMENT_ADAPTER_URL'),
    'adapter_token' => env('PAYMENT_ADAPTER_TOKEN'),
    'webhook_secret' => env('PAYMENT_WEBHOOK_SECRET'),
];
