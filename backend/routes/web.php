<?php

use App\Modules\Audit\Http\Controllers\HealthController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'data' => [
            'name' => 'SelfX Retail API',
            'live' => '/health/live',
            'ready' => '/health/ready',
        ],
        'meta' => ['request_id' => (string) Illuminate\Support\Str::uuid7()],
        'error' => null,
    ]);
});

Route::get('/login', function () {
    return response()->json(['error' => 'unauthenticated', 'message' => 'Please authenticate.'], 401);
})->name('login');

Route::get('/health/live', [HealthController::class, 'live']);
Route::get('/health/ready', [HealthController::class, 'ready']);
Route::get('/health', [\App\Http\Controllers\HealthController::class, 'check']);

