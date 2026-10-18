<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('booking_activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sender_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('recipient_id')->constrained('users')->cascadeOnDelete();
            $table->string('kind', 20);
            $table->text('body')->nullable();
            $table->uuid('client_token')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
            $table->unique(['booking_id', 'sender_id', 'client_token']);
            $table->index(['recipient_id', 'read_at']);
            $table->index(['booking_id', 'kind', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('booking_activities');
    }
};
