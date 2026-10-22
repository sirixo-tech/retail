<?php

namespace App\Modules\Audit\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

class HealthController
{
    public function live(): JsonResponse
    {
        return $this->envelope(['status' => 'ok']);
    }

    public function ready(): JsonResponse
    {
        $checks = [
            'database' => $this->database(),
            'redis' => $this->redis(),
            'typesense' => $this->typesense(),
            'storage' => $this->storage(),
            'queue' => $this->queue(),
        ];

        $failed = [];
        foreach (config('health.required', []) as $name) {
            if (! ($checks[$name]['ok'] ?? false)) {
                $failed[] = $name;
            }
        }

        $ok = $failed === [];

        return $this->envelope([
            'status' => $ok ? 'ok' : 'degraded',
            'checks' => $checks,
        ], $ok ? 200 : 503);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function envelope(array $data, int $status = 200): JsonResponse
    {
        return response()->json([
            'data' => $data,
            'meta' => ['request_id' => (string) Str::uuid7()],
            'error' => null,
        ], $status);
    }

    /**
     * @return array{ok: bool, driver?: string}
     */
    private function database(): array
    {
        try {
            DB::select('select 1');

            return ['ok' => true, 'driver' => (string) config('database.default')];
        } catch (Throwable) {
            return ['ok' => false, 'driver' => (string) config('database.default')];
        }
    }

    /**
     * @return array{ok: bool}
     */
    private function redis(): array
    {
        try {
            $pong = Redis::connection()->ping();

            return ['ok' => $pong === true || $pong === 'PONG' || $pong === '+PONG'];
        } catch (Throwable) {
            return ['ok' => false];
        }
    }

    /**
     * @return array{ok: bool}
     */
    private function typesense(): array
    {
        try {
            $response = Http::timeout(2)->get(rtrim((string) config('health.typesense_url'), '/').'/health');

            return ['ok' => $response->ok()];
        } catch (Throwable) {
            return ['ok' => false];
        }
    }

    /**
     * @return array{ok: bool}
     */
    private function storage(): array
    {
        try {
            $path = 'health/'.Str::uuid7().'.txt';
            Storage::disk('local')->put($path, 'ok');
            Storage::disk('local')->delete($path);

            return ['ok' => true];
        } catch (Throwable) {
            return ['ok' => false];
        }
    }

    /**
     * @return array{ok: bool, driver: string}
     */
    private function queue(): array
    {
        $driver = (string) config('queue.default');

        if ($driver === 'sync') {
            return ['ok' => true, 'driver' => $driver];
        }

        if ($driver === 'database') {
            try {
                DB::table('jobs')->limit(1)->get();

                return ['ok' => true, 'driver' => $driver];
            } catch (Throwable) {
                return ['ok' => false, 'driver' => $driver];
            }
        }

        $redis = $this->redis();

        return ['ok' => $redis['ok'], 'driver' => $driver];
    }
}
