<?php

namespace App\Modules\Platform\Http\Controllers;

use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class PlatformQueueController
{
    public function status(): JsonResponse
    {
        $connection = config('queue.default');

        $pendingCount = 0;
        $failedCount = 0;
        $recentFailed = [];

        try {
            if (Schema::hasTable('jobs')) {
                $pendingCount = DB::table('jobs')->count();
            }
            if (Schema::hasTable('failed_jobs')) {
                $failedCount = DB::table('failed_jobs')->count();
                $recentFailed = DB::table('failed_jobs')
                    ->orderByDesc('failed_at')
                    ->limit(10)
                    ->get(['id', 'connection', 'queue', 'exception', 'failed_at'])
                    ->map(function ($row) {
                        return [
                            'id' => $row->id,
                            'queue' => $row->queue,
                            'failed_at' => $row->failed_at,
                            'short_error' => strtok($row->exception, "\n"),
                        ];
                    });
            }
        } catch (\Throwable) {
            // Safe fallback if tables don't exist
        }

        return ApiResponse::ok([
            'driver' => $connection,
            'status' => 'operational',
            'pending_jobs' => $pendingCount,
            'failed_jobs' => $failedCount,
            'recent_failed' => $recentFailed,
            'recommended_worker' => 'php artisan queue:work --sleep=3 --tries=3 --timeout=90',
            'supervisor_conf_path' => 'deploy/supervisor-queue.conf',
            'systemd_service_path' => 'deploy/selfx-queue.service',
        ]);
    }

    public function retryAll(): JsonResponse
    {
        try {
            Artisan::call('queue:retry', ['id' => 'all']);
            return ApiResponse::ok([
                'message' => 'All failed queue jobs queued for retry.',
                'output' => trim(Artisan::output()),
            ]);
        } catch (\Throwable $e) {
            return ApiResponse::error('queue.retry_failed', $e->getMessage(), 500);
        }
    }

    public function flush(): JsonResponse
    {
        try {
            Artisan::call('queue:flush');
            return ApiResponse::ok([
                'message' => 'Failed jobs queue flushed.',
            ]);
        } catch (\Throwable $e) {
            return ApiResponse::error('queue.flush_failed', $e->getMessage(), 500);
        }
    }
}
