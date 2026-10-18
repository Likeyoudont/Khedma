<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\BookingFeePayment;
use App\Support\ConnectionFees;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\Rule;

class BookingPaymentController extends Controller
{
    public function checkout(Request $request, int $id)
    {
        $data = $request->validate(['method' => ['required', Rule::in(config('billing.checkout_methods', ['cashplus']))]]);
        $booking = Booking::where(function ($query) use ($request) {
            $query->where('client_id', $request->user()->id)->orWhereHas('workerProfile', fn ($q) => $q->where('user_id', $request->user()->id));
        })->findOrFail($id);
        abort_unless(ConnectionFees::ready(), 503, 'Payment checkout is not configured.');
        $payment = DB::transaction(function () use ($booking, $request, $data) {
            $booking = Booking::whereKey($booking->id)->lockForUpdate()->firstOrFail();
            abort_unless($booking->fee_rate_bps && $booking->status === 'confirmed' && $booking->scheduled_at->isFuture(), 409);
            $payment = BookingFeePayment::where('booking_id', $booking->id)->where('user_id', $request->user()->id)->lockForUpdate()->firstOrFail();
            abort_unless($payment->status === 'pending', 409);
            // An attempt's reference/method stays immutable across checkout retries.
            abort_if($payment->method && $payment->method !== $data['method'], 409);
            $payment->update(['method' => $data['method']]);
            return $payment;
        });
        if (! $payment->checkout_url) {
            try {
                $response = Http::withToken(config('billing.adapter_token'))->timeout(10)->post(config('billing.adapter_url'), [
                    'reference' => $payment->reference, 'amount_cents' => $payment->amount_cents, 'currency' => 'MAD',
                    'method' => $payment->method, 'return_url' => rtrim(config('services.frontend_url'), '/').'/job/'.$id,
                    'receipt_url' => rtrim(config('app.url'), '/').'/api/billing/receipt',
                ]);
                $url = $response->json('checkout_url');
                abort_unless($response->successful() && is_string($url) && filter_var($url, FILTER_VALIDATE_URL) && parse_url($url, PHP_URL_SCHEME) === 'https', 503, 'Payment checkout is not configured.');
                BookingFeePayment::whereKey($payment->id)->where('status', 'pending')->update(['checkout_url' => $url]);
            } catch (\Throwable) {
                abort(503, 'Payment checkout is not configured.');
            }
        }
        return app(BookingController::class)->show($request, $id);
    }

    // Trusted merchant adapter only. A browser redirect never marks a fee paid.
    public function receipt(Request $request)
    {
        $secret = config('billing.webhook_secret') ?? '';
        $timestamp = $request->header('X-Khedma-Timestamp', '');
        $signature = $request->header('X-Khedma-Signature', '');
        abort_unless(strlen($secret) >= 32 && ctype_digit($timestamp) && abs(time() - (int) $timestamp) <= 300
            && hash_equals(hash_hmac('sha256', $timestamp.'.'.$request->getContent(), $secret), $signature), 403);
        $data = $request->validate([
            'reference' => ['required', 'uuid'], 'method' => ['required', Rule::in(['card', 'cashplus'])],
            'transaction_id' => ['required', 'string', 'max:160'], 'event' => ['required', Rule::in(['paid', 'refunded'])],
            'amount_cents' => ['required', 'integer', 'min:1'], 'currency' => ['required', Rule::in(['MAD'])],
        ]);
        return DB::transaction(function () use ($data) {
            $payment = BookingFeePayment::where('reference', $data['reference'])->firstOrFail();
            // Match the action controller's booking -> payment lock order.
            $booking = Booking::whereKey($payment->booking_id)->lockForUpdate()->firstOrFail();
            $payment = BookingFeePayment::whereKey($payment->id)->lockForUpdate()->firstOrFail();
            abort_unless($payment->method === $data['method'] && $payment->amount_cents === $data['amount_cents'] && $payment->currency === $data['currency'], 422);
            $previous = DB::table('fee_payment_receipts')->where('method', $data['method'])->where('transaction_id', $data['transaction_id'])->where('event', $data['event'])->first();
            if ($previous) {
                abort_unless($previous->booking_fee_payment_id === $payment->id && $previous->amount_cents === $payment->amount_cents, 409);
                return response()->json(['ok' => true]);
            }
            if ($data['event'] === 'paid') {
                abort_unless(in_array($payment->status, ['pending', 'void']), 409);
                $payment->update(['status' => $booking->status === 'confirmed' && $booking->scheduled_at->isFuture() ? 'paid' : 'refund_pending', 'paid_at' => now(), 'checkout_url' => null]);
            } else {
                abort_unless($payment->status === 'refund_pending' && $payment->paid_at, 409);
                $payment->update(['status' => 'refunded', 'refunded_at' => now()]);
            }
            DB::table('fee_payment_receipts')->insert([
                'booking_fee_payment_id' => $payment->id, 'method' => $data['method'], 'transaction_id' => $data['transaction_id'],
                'event' => $data['event'], 'amount_cents' => $data['amount_cents'], 'created_at' => now(), 'updated_at' => now(),
            ]);
            return response()->json(['ok' => true]);
        });
    }
}
