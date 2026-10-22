<?php

namespace App\Http\Middleware;

use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePasswordChanged
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if ($user && $user->must_change_password && ! $request->session()->get('impersonator_id')) {
            return ApiResponse::error(
                'auth.password_change_required',
                'Change your password before continuing.',
                403,
            );
        }

        return $next($request);
    }
}
