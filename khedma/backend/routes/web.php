<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\BookingCommunicationController;
use App\Http\Controllers\BookingController;
use App\Http\Controllers\BookingPaymentController;
use App\Http\Controllers\PasswordRecoveryController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\SocialAuthController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Web middleware supplies session cookies and CSRF protection for browser auth.
Route::prefix('api/auth')->group(function () {
    Route::get('/csrf', fn () => response()->json(['token' => csrf_token()]));
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:6,1');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');
    Route::middleware('auth')->group(function () {
        Route::get('/settings', [ProfileController::class, 'settings']);
        Route::get('/export', [ProfileController::class, 'export'])->middleware('throttle:6,1');
        Route::post('/profile', [ProfileController::class, 'update'])->middleware('throttle:20,1');
        Route::post('/password', [ProfileController::class, 'password'])->middleware('throttle:6,1');
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});

Route::prefix('api/bookings')->middleware('auth')->group(function () {
    Route::get('/', [BookingController::class, 'index']);
    Route::post('/', [BookingController::class, 'store'])->middleware('throttle:20,1');
    Route::get('/{id}', [BookingController::class, 'show'])->whereNumber('id');
    Route::post('/{id}/action', [BookingController::class, 'action'])->whereNumber('id')->middleware('throttle:30,1');
    Route::post('/{id}/review', [BookingController::class, 'review'])->whereNumber('id')->middleware('throttle:10,1');
    Route::post('/{id}/issue', [BookingController::class, 'issue'])->whereNumber('id')->middleware('throttle:6,1');
    Route::post('/{id}/payments', [BookingPaymentController::class, 'checkout'])->whereNumber('id')->middleware('throttle:booking-fee-checkout');
});

Route::post('/api/billing/receipt', [BookingPaymentController::class, 'receipt'])->middleware('throttle:booking-fee-receipt');

Route::prefix('api/auth/social')->group(function () {
    Route::get('/options', [SocialAuthController::class, 'options']);
    Route::get('/pending', [SocialAuthController::class, 'pending']);
    Route::post('/register', [SocialAuthController::class, 'register'])->middleware('throttle:6,1');
    Route::get('/{provider}/redirect', [SocialAuthController::class, 'redirect'])->whereIn('provider', ['google', 'apple'])->middleware('throttle:10,1');
    Route::get('/google/callback', [SocialAuthController::class, 'callback'])->defaults('provider', 'google');
    Route::post('/apple/callback', [SocialAuthController::class, 'callback'])->defaults('provider', 'apple');
});

Route::prefix('api/auth/recovery')->group(function () {
    Route::get('/options', [PasswordRecoveryController::class, 'options']);
    Route::post('/send', [PasswordRecoveryController::class, 'send'])->middleware('throttle:6,1');
    Route::post('/reset', [PasswordRecoveryController::class, 'reset'])->middleware('throttle:6,1');
});

Route::middleware('auth')->group(function () {
    Route::get('/api/bookings/{id}/messages', [BookingCommunicationController::class, 'messages'])->whereNumber('id');
    Route::post('/api/bookings/{id}/messages', [BookingCommunicationController::class, 'send'])->whereNumber('id')->middleware('throttle:30,1');
    Route::post('/api/bookings/{id}/messages/read', [BookingCommunicationController::class, 'readMessages'])->whereNumber('id');
    Route::get('/api/auth/activity', [BookingCommunicationController::class, 'activity']);
    Route::post('/api/auth/activity/{id}/read', [BookingCommunicationController::class, 'readActivity'])->whereNumber('id');
});
