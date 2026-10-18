<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('worker_profiles', function (Blueprint $table) {
            $table->json('transport_vehicles')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
        });
        foreach (['aluminium' => '🪟', 'glass' => '🪟', 'butcher' => '🥩'] as $key => $icon) {
            DB::table('service_categories')->updateOrInsert(['key' => $key], ['icon' => $icon, 'created_at' => now(), 'updated_at' => now()]);
        }
        // Preserve old booking references; split existing workers into both specialties.
        $legacy = DB::table('service_categories')->where('key', 'aluminium_glass')->value('id');
        if ($legacy) {
            $ids = DB::table('service_categories')->whereIn('key', ['aluminium', 'glass'])->pluck('id');
            foreach (DB::table('service_category_worker_profile')->where('service_category_id', $legacy)->pluck('worker_profile_id') as $worker) {
                foreach ($ids as $id) DB::table('service_category_worker_profile')->insertOrIgnore(['service_category_id' => $id, 'worker_profile_id' => $worker]);
            }
            DB::table('service_category_worker_profile')->where('service_category_id', $legacy)->delete();
        }
    }

    public function down(): void
    {
        Schema::table('worker_profiles', function (Blueprint $table) {
            $table->dropColumn(['transport_vehicles', 'latitude', 'longitude']);
        });
    }
};
