<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(\App\Support\Tenancy\TenantContext::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        \Illuminate\Support\Facades\RateLimiter::for('api', function (\Illuminate\Http\Request $request) {
            return \Illuminate\Cache\RateLimiting\Limit::perMinute(180)->by($request->user()?->id ?: (string) $request->ip());
        });

        \Illuminate\Support\Facades\RateLimiter::for('login', function (\Illuminate\Http\Request $request) {
            return \Illuminate\Cache\RateLimiting\Limit::perMinute(15)->by((string) $request->ip());
        });

        \Illuminate\Support\Facades\Event::listen(
            \App\Modules\Printing\Events\SaleCompleted::class,
            \App\Modules\Printing\Listeners\PrintSaleReceiptListener::class
        );

        \App\Modules\Catalog\Models\Product::observe(\App\Modules\Catalog\Observers\ProductObserver::class);

        \Illuminate\Support\Facades\DB::listen(function (\Illuminate\Database\Events\QueryExecuted $query) {
            static $isChecking = false;
            if ($isChecking) {
                return;
            }

            $isChecking = true;
            try {
                /** @var \App\Support\Tenancy\TenantContext $tenantContext */
                $tenantContext = app(\App\Support\Tenancy\TenantContext::class);
                $tenantId = $tenantContext->id();
                if (! $tenantId || $tenantContext->isBypassed()) {
                    return;
                }

            $sql = strtolower($query->sql);
            if (str_starts_with($sql, 'set ') || str_starts_with($sql, 'select 1') || str_starts_with($sql, 'show ') || str_contains($sql, 'sessions')) {
                return;
            }

            foreach (\App\Support\Tenancy\RlsHelper::TENANT_TABLES as $table) {
                if (str_contains($sql, $table) && ! str_contains($sql, 'tenant_id')) {
                    \Illuminate\Support\Facades\Log::warning(
                        "[SECURITY AUDIT] Raw query on tenant-scoped table '{$table}' executed without explicit tenant_id filter. Recommend using Eloquent models with BelongsToTenant.",
                        ['sql' => $query->sql, 'tenant_id' => $tenantId]
                    );
                    break;
                }
            }
        } finally {
            $isChecking = false;
        }
    });
    }
}
