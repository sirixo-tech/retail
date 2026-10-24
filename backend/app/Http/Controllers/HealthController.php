<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class HealthController
{
    public function check(): JsonResponse
    {
        $checks = [];
        $overallHealthy = true;

        // 1. Database Check
        try {
            DB::connection()->getPdo();
            $checks['database'] = [
                'status' => 'ok',
                'message' => 'Connected to ' . DB::connection()->getDriverName(),
            ];
        } catch (\Throwable $e) {
            $overallHealthy = false;
            $checks['database'] = [
                'status' => 'error',
                'message' => $e->getMessage(),
            ];
        }

        // 2. Cache / Redis Check
        try {
            Cache::put('health_ping', 'pong', 10);
            $cached = Cache::get('health_ping');
            if ($cached === 'pong') {
                $checks['cache'] = [
                    'status' => 'ok',
                    'message' => 'Cache read/write operational',
                ];
            } else {
                $checks['cache'] = [
                    'status' => 'warning',
                    'message' => 'Cache returned unexpected value',
                ];
            }
        } catch (\Throwable $e) {
            $checks['cache'] = [
                'status' => 'warning',
                'message' => $e->getMessage(),
            ];
        }

        // 3. Storage / Disk Space Check
        try {
            $freeBytes = disk_free_space(base_path());
            $totalBytes = disk_total_space(base_path());
            $usagePercent = $totalBytes > 0 ? round((($totalBytes - $freeBytes) / $totalBytes) * 100, 1) : 0;

            $checks['storage'] = [
                'status' => $usagePercent > 90 ? 'warning' : 'ok',
                'message' => "Disk usage: {$usagePercent}% (free: " . round($freeBytes / 1024 / 1024 / 1024, 2) . ' GB)',
            ];
        } catch (\Throwable $e) {
            $checks['storage'] = [
                'status' => 'ok',
                'message' => 'Storage check bypassed',
            ];
        }

        // 4. Queue / Failed Jobs Check
        try {
            if (Schema::hasTable('failed_jobs')) {
                $failedJobsCount = DB::table('failed_jobs')->count();
                $checks['queue'] = [
                    'status' => $failedJobsCount > 10 ? 'warning' : 'ok',
                    'message' => "{$failedJobsCount} failed jobs",
                ];
            } else {
                $checks['queue'] = [
                    'status' => 'ok',
                    'message' => 'Queue operational',
                ];
            }
        } catch (\Throwable $e) {
            $checks['queue'] = [
                'status' => 'ok',
                'message' => 'Queue check not available',
            ];
        }

        $statusCode = $overallHealthy ? 200 : 503;

        return response()->json([
            'status' => $overallHealthy ? 'healthy' : 'unhealthy',
            'timestamp' => now()->toIso8601String(),
            'checks' => $checks,
        ], $statusCode);
    }
}
