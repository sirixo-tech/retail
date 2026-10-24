<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class PerformanceMonitoring
{
    public function handle(Request $request, Closure $next): Response
    {
        $startTime = microtime(true);
        $startMemory = memory_get_usage();

        $response = $next($request);

        $durationMs = round((microtime(true) - $startTime) * 1000, 2);
        $memoryPeakMb = round((memory_get_peak_usage() - $startMemory) / 1024 / 1024, 2);

        $response->headers->set('X-Response-Time', "{$durationMs}ms");
        $response->headers->set('X-Memory-Usage', "{$memoryPeakMb}MB");

        if ($durationMs > 1000) {
            Log::warning('Slow request detected', [
                'method' => $request->method(),
                'url' => $request->fullUrl(),
                'duration_ms' => $durationMs,
                'memory_mb' => $memoryPeakMb,
                'tenant_id' => $request->session()->get('tenant_id'),
                'user_id' => optional($request->user())->id,
            ]);
        }

        return $response;
    }
}
