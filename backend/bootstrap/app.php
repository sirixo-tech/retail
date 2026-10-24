<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        then: function () {
            \Illuminate\Support\Facades\Route::middleware('web')
                ->prefix('api/v1')
                ->group(base_path('routes/api.php'));
        },
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->validateCsrfTokens(except: [
            'api/*',
            'api/v1/*',
            'api/v1/auth/*',
            'api/v1/public/*',
            'api/v1/platform/*',
        ]);
        $middleware->alias([
            'kind' => \App\Http\Middleware\EnsureKind::class,
            'password.changed' => \App\Http\Middleware\EnsurePasswordChanged::class,
            'tenant.enforce' => \App\Http\Middleware\EnforceTenantContext::class,
        ]);
        $middleware->append(\App\Http\Middleware\CheckPlatformMaintenance::class);
        $middleware->append(\App\Http\Middleware\PerformanceMonitoring::class);
        $middleware->appendToGroup('web', \App\Http\Middleware\EnforceTenantContext::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->report(function (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('[SelfX Error Tracker] ' . $e->getMessage(), [
                'class' => get_class($e),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'url' => request()?->fullUrl(),
                'method' => request()?->method(),
                'ip' => request()?->ip(),
                'user_id' => request()?->user()?->id,
            ]);
        });

        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        $exceptions->render(function (\Illuminate\Validation\ValidationException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return \App\Support\ApiResponse::error(
                    'validation.failed',
                    'Check the highlighted fields.',
                    422,
                    $e->errors(),
                );
            }
        });
    })->create();
