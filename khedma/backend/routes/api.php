<?php

use App\Http\Controllers\WorkerController;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    try {
        \Illuminate\Support\Facades\DB::select('SELECT 1');
        return response()->json(['status' => 'ok', 'app' => 'Khedma Backend']);
    } catch (\Throwable) {
        return response()->json(['status' => 'unavailable'], 503);
    }
});

Route::get('/workers', [WorkerController::class, 'index']);
Route::get('/workers/{id}', [WorkerController::class, 'show'])->whereNumber('id');
