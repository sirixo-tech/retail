<?php

namespace App\Http\Middleware;

use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureKind
{
    public function handle(Request $request, Closure $next, string $kind): Response
    {
        if ($request->user()?->kind !== $kind) {
            if ($request->user()?->kind === 'platform' && $kind === 'staff') {
                return $next($request);
            }

            $currentKind = $request->user()?->kind ?? 'guest';
            return ApiResponse::error(
                'permission.denied',
                "Access restricted: This section requires [{$kind}] permissions, but you are signed in as [{$currentKind}]. Please log in with a platform Super Admin account.",
                403
            );
        }

        return $next($request);
    }
}
