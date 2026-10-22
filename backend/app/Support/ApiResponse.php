<?php

namespace App\Support;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class ApiResponse
{
    /**
     * @param  array<string, mixed>|null  $data
     */
    public static function ok(mixed $data = null, int $status = 200): JsonResponse
    {
        return response()->json([
            'data' => $data,
            'meta' => ['request_id' => (string) Str::uuid7()],
            'error' => null,
        ], $status);
    }

    /**
     * @param  array<string, mixed>  $details
     */
    public static function error(string $code, string $message, int $status, array $details = []): JsonResponse
    {
        return response()->json([
            'data' => null,
            'error' => [
                'code' => $code,
                'message' => $message,
                'details' => $details,
                'request_id' => (string) Str::uuid7(),
            ],
        ], $status);
    }
}
