<?php

namespace Database\Seeders;

use App\Models\ServiceCategory;
use Illuminate\Database\Seeder;

class ServiceCategorySeeder extends Seeder
{
    public function run(): void
    {
        foreach (['plumbing' => '🔧', 'electricity' => '💡', 'painting' => '🎨', 'doors' => '🚪', 'walls' => '🧱', 'cleaning' => '🧹', 'moving' => '📦', 'garden' => '🌿', 'metalwork' => '🔩', 'air_conditioning' => '❄️', 'appliances' => '🧺', 'aluminium' => '🪟', 'glass' => '🪟', 'butcher' => '🥩', 'other' => '🛠️', 'carpentry' => '🪚', 'locksmith' => '🔑', 'tiling' => '▦'] as $key => $icon) {
            ServiceCategory::updateOrCreate(['key' => $key], ['icon' => $icon]);
        }
    }
}
