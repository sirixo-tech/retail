<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Cookie\CookieValuePrefix;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class HydrateSessionFromHeader
{
    public function handle(Request $request, Closure $next): Response
    {
        $sessionCookie = (string) config('session.cookie');
        $sessionId = null;

        if ($request->hasHeader('X-Session-Id')) {
            $sessionId = (string) $request->header('X-Session-Id');
        } elseif ($request->bearerToken()) {
            $sessionId = (string) $request->bearerToken();
        }

        if ($sessionId !== null && preg_match('/^[a-zA-Z0-9]{40}$/', $sessionId)) {
            try {
                $encrypter = app('encrypter');
                $prefix = CookieValuePrefix::create($sessionCookie, $encrypter->getKey());
                $encrypted = $encrypter->encrypt($prefix . $sessionId, false);
                $request->cookies->set($sessionCookie, $encrypted);
            } catch (\Throwable) {
                $request->cookies->set($sessionCookie, $sessionId);
            }
        }

        return $next($request);
    }
}
