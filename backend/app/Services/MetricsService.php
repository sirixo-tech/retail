<?php

namespace App\Services;

use Closure;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class MetricsService
{
    /**
     * Record a numerical metric with tags.
     */
    public function track(string $metric, float $value, array $tags = []): void
    {
        $payload = [
            'metric' => $metric,
            'value' => $value,
            'tags' => $tags,
            'timestamp' => now()->toIso8601String(),
        ];

        // Store latest aggregated stats in cache/redis for quick observability
        $key = 'metrics:' . str_replace('.', ':', $metric);
        try {
            Cache::increment("{$key}:count");
            Cache::put("{$key}:last", $payload, 86400);
        } catch (\Throwable $e) {
            // Silently fallback if cache store error
        }

        Log::info("Metric [{$metric}]: {$value}", $payload);
    }

    /**
     * Measure operation duration and record metric.
     */
    public function timing(string $operation, Closure $callback)
    {
        $start = microtime(true);

        try {
            return $callback();
        } finally {
            $durationMs = round((microtime(true) - $start) * 1000, 2);
            $this->track("timing.{$operation}", $durationMs);
        }
    }
}
