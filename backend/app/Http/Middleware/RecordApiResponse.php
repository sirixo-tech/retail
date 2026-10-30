<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class RecordApiResponse
{
    public function handle(Request $request, Closure $next): Response
    {
        $started = microtime(true);
        $response = $next($request);

        if (! $request->is('api/*')) {
            return $response;
        }

        try {
            $excerpt = $this->excerpt($response);
            DB::table('api_request_logs')->insert([
                'id' => (string) Str::uuid7(),
                'method' => substr($request->method(), 0, 12),
                'path' => substr('/'.$request->path(), 0, 255),
                'status' => $response->getStatusCode(),
                'duration_ms' => (int) round((microtime(true) - $started) * 1000),
                'ip' => $request->ip(),
                'actor_id' => $request->user()?->id,
                'response_excerpt' => $excerpt,
                'created_at' => now(),
            ]);
            $extra = DB::table('api_request_logs')->count() - 400;
            if ($extra > 0) {
                $ids = DB::table('api_request_logs')->orderBy('created_at')->limit($extra)->pluck('id');
                DB::table('api_request_logs')->whereIn('id', $ids)->delete();
            }
        } catch (\Throwable) {
            // A log write must not change the API response.
        }

        return $response;
    }

    private function excerpt(Response $response): string
    {
        $body = $response->getContent();
        if (! is_string($body) || $body === '') {
            return '';
        }
        $decoded = json_decode($body, true);
        if (is_array($decoded)) {
            $body = json_encode($this->redact($decoded)) ?: '';
        }

        return mb_substr($body, 0, 1500);
    }

    private function redact(mixed $value, ?string $key = null): mixed
    {
        $name = strtolower((string) $key);
        $secretNames = ['password', 'current_password', 'secret', 'token', 'api_key', 'auth_token', 'otp', 'ticket', 'authorization', 'id_token', 'access_token', 'auth_key'];
        if (in_array($name, $secretNames, true)) {
            return '[redacted]';
        }
        if ($name === 'code' && is_string($value) && preg_match('/^\d{4,8}$/', $value) === 1) {
            return '[redacted]';
        }
        if (! is_array($value)) {
            return $value;
        }
        $clean = [];
        foreach ($value as $childKey => $child) {
            $clean[$childKey] = $this->redact($child, is_string($childKey) ? $childKey : null);
        }

        return $clean;
    }
}
