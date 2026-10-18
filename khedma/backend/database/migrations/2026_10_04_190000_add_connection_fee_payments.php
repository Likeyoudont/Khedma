<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->unsignedSmallInteger('fee_rate_bps')->nullable();
            $table->timestamp('worker_fee_accepted_at')->nullable();
            $table->timestamp('client_fee_accepted_at')->nullable();
        });
        Schema::create('booking_fee_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->string('role', 10);
            $table->uuid('reference')->unique();
            $table->unsignedInteger('amount_cents');
            $table->string('currency', 3)->default('MAD');
            $table->string('status')->default('pending');
            $table->string('method')->nullable();
            $table->text('checkout_url')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('refunded_at')->nullable();
            $table->timestamps();
            $table->unique(['booking_id', 'user_id']);
        });
        Schema::create('fee_payment_receipts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_fee_payment_id')->constrained()->restrictOnDelete();
            $table->string('method');
            $table->string('transaction_id', 160);
            $table->string('event');
            $table->unsignedInteger('amount_cents');
            $table->timestamps();
            $table->unique(['method', 'transaction_id', 'event']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fee_payment_receipts');
        Schema::dropIfExists('booking_fee_payments');
        Schema::table('bookings', fn (Blueprint $table) => $table->dropColumn(['fee_rate_bps', 'worker_fee_accepted_at', 'client_fee_accepted_at']));
    }
};
