<?php

namespace App\Http\Middleware;

use App\Support\ApiResponse;
use App\Support\Tenancy\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class EnforceTenantContext
{
    public function __construct(private TenantContext $tenantContext)
    {
    }

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // If unauthenticated, allow public/auth routes to handle it
        if (! $user) {
            return $next($request);
        }

        $hasSession = $request->hasSession();

        if (method_exists($user, 'isPlatform') && $user->isPlatform()) {
            // Platform administrator: check if actively impersonating a tenant
            $impersonatedTenantId = $hasSession ? $request->session()->get('tenant_id') : null;
            if (! empty($impersonatedTenantId)) {
                $this->tenantContext->setTenantId((string) $impersonatedTenantId);
            } else {
                $this->tenantContext->bypass();
            }

            return $next($request);
        }

        if (isset($user->kind) && $user->kind === 'staff') {
            $sessionTenantId = $hasSession ? $request->session()->get('tenant_id') : null;

            // Find all active staff profiles for this user
            $activeTenantIds = DB::table('staff_profiles')
                ->where('user_id', $user->id)
                ->where('status', 'active')
                ->pluck('tenant_id')
                ->map(fn ($id) => (string) $id)
                ->all();

            if (empty($activeTenantIds)) {
                return ApiResponse::error(
                    'auth.forbidden_tenant',
                    'No active staff profile found for this account.',
                    403
                );
            }

            if (! empty($sessionTenantId)) {
                $sessionTenantId = (string) $sessionTenantId;
                if (! in_array($sessionTenantId, $activeTenantIds, true)) {
                    Log::warning('[SECURITY ALERT] Cross-tenant manipulation detected: User ' . $user->id . ' attempted access with session tenant ' . $sessionTenantId);

                    return ApiResponse::error(
                        'auth.tenant_mismatch',
                        'Tenant context mismatch. Access forbidden.',
                        403
                    );
                }

                $effectiveTenantId = $sessionTenantId;
            } else {
                // If session tenant_id is not yet set, initialize from primary staff profile
                $effectiveTenantId = $activeTenantIds[0];
                if ($hasSession) {
                    $request->session()->put('tenant_id', $effectiveTenantId);
                }
            }

            $this->tenantContext->setTenantId($effectiveTenantId);
        }

        return $next($request);
    }
}
