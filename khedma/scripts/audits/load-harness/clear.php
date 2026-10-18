<?php
$app=require __DIR__.'/bootstrap.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
Illuminate\Support\Facades\Artisan::call('cache:clear');
