<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', ['ba7it', 'mihaniy'])->default('ba7it');
            $table->string('phone')->nullable()->unique();
            $table->string('city')->nullable();
        });
        Schema::create('service_categories', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->string('icon')->nullable();
            $table->timestamps();
        });
        Schema::create('worker_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->text('description')->nullable();
            $table->unsignedSmallInteger('experience_years')->default(0);
            $table->unsignedSmallInteger('service_radius_km')->default(10);
            $table->boolean('available')->default(false)->index();
            $table->string('photo_path')->nullable();
            $table->timestamps();
        });
        Schema::create('service_category_worker_profile', function (Blueprint $table) {
            $table->foreignId('service_category_id')->constrained()->cascadeOnDelete();
            $table->foreignId('worker_profile_id')->constrained()->cascadeOnDelete();
            $table->primary(['service_category_id', 'worker_profile_id']);
        });
        Schema::create('bookings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('worker_profile_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('service_category_id')->constrained()->restrictOnDelete();
            $table->text('description')->nullable();
            $table->string('location');
            $table->enum('status', ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'])->default('pending')->index();
            $table->decimal('price', 10, 2)->nullable();
            $table->char('currency', 3)->default('MAD');
            $table->timestamp('scheduled_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->index(['client_id', 'created_at']);
        });
        Schema::create('reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->unique()->constrained()->cascadeOnDelete();
            $table->enum('rating', ['1', '2', '3', '4', '5']);
            $table->text('comment')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reviews');
        Schema::dropIfExists('bookings');
        Schema::dropIfExists('service_category_worker_profile');
        Schema::dropIfExists('worker_profiles');
        Schema::dropIfExists('service_categories');
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['role', 'phone', 'city']);
        });
    }
};
