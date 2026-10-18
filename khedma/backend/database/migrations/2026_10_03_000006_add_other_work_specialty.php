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
            $table->string('other_work')->nullable();
        });
        DB::table('service_categories')->updateOrInsert(['key' => 'other'], ['icon' => '🛠️', 'created_at' => now(), 'updated_at' => now()]);
    }

    public function down(): void
    {
        Schema::table('worker_profiles', function (Blueprint $table) {
            $table->dropColumn('other_work');
        });
        // Keep the category so existing booking references remain valid.
    }
};
