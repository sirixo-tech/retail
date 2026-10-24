<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class HydrateSessionFromHeader
{
    public function handle(Request $request, Closure $next): Response
    {
        $sessionCookie = (string) config('session.cookie');

        if ($request->hasHeader('X-Session-Id')) {
            $sessionId = (string) $request->header('X-Session-Id');
            if ($sessionId !== '') {
                $request->cookies->set($sessionCookie, $sessionId);
            }
        } elseif ($request->bearerToken()) {
            $token = (string) $request->bearerToken();
            if ($token !== '') {
                $request->cookies->set($sessionCookie, $token);
            }
        }

        return $next($request);
    }
}
