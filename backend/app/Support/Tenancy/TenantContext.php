<?php

namespace App\Support\Tenancy;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Session;

class TenantContext
{
    private ?string $explicitTenantId = null;

    private bool $bypassed = false;

    private bool $strict = false;

    private bool $isResolving = false;

    private ?string $cachedUserId = null;

    private ?string $cachedTenantId = null;

    public function id(): ?string
    {
        if ($this->bypassed) {
            return null;
        }

        if ($this->explicitTenantId !== null) {
            return $this->explicitTenantId;
        }

        $fromSession = Session::get('tenant_id');
        if (! empty($fromSession)) {
            return (string) $fromSession;
        }

        if ($this->isResolving) {
            return null;
        }

        $user = Auth::user();
        if ($user) {
            if (isset($user->tenant_id) && ! empty($user->tenant_id)) {
                return (string) $user->tenant_id;
            }

            if ($this->cachedUserId === $user->id) {
                return $this->cachedTenantId;
            }

            if (isset($user->kind) && $user->kind === 'staff') {
                $this->isResolving = true;
                try {
                    $tenantId = DB::table('staff_profiles')
                        ->where('user_id', $user->id)
                        ->where('status', 'active')
                        ->value('tenant_id');

                    $this->cachedUserId = $user->id;
                    $this->cachedTenantId = $tenantId ? (string) $tenantId : null;

                    return $this->cachedTenantId;
                } finally {
                    $this->isResolving = false;
                }
            }
        }

        return null;
    }

    public function getTenantId(): ?string
    {
        return $this->id();
    }

    public function setTenantId(?string $id): void
    {
        $this->explicitTenantId = $id;

        if (DB::getDriverName() === 'pgsql') {
            if ($id !== null) {
                DB::statement("SET LOCAL app.current_tenant_id = ?", [$id]);
                DB::statement("SET LOCAL app.bypass_rls = 'off'");
            } else {
                DB::statement("SET LOCAL app.current_tenant_id = ''");
            }
        }
    }

    public function bypass(bool $bypassed = true): void
    {
        $this->bypassed = $bypassed;

        if (DB::getDriverName() === 'pgsql') {
            if ($bypassed) {
                DB::statement("SET LOCAL app.bypass_rls = 'on'");
            } else {
                DB::statement("SET LOCAL app.bypass_rls = 'off'");
            }
        }
    }

    public function isBypassed(): bool
    {
        return $this->bypassed;
    }

    public function setStrict(bool $strict = true): void
    {
        $this->strict = $strict;
    }

    public function isStrict(): bool
    {
        return $this->strict;
    }

    /**
     * Run a callback under a temporary tenant context.
     * Restores the previous context once finished.
     */
    public function actingAsTenant(string $tenantId, callable $callback): mixed
    {
        $previousTenantId = $this->explicitTenantId;
        $previousBypassed = $this->bypassed;

        $this->bypassed = false;
        $this->setTenantId($tenantId);

        try {
            return $callback();
        } finally {
            $this->bypassed = $previousBypassed;
            $this->setTenantId($previousTenantId);
        }
    }

    /**
     * Run a callback without any tenant scoping applied.
     */
    public function withoutTenantScope(callable $callback): mixed
    {
        $previousBypassed = $this->bypassed;
        $this->bypass(true);

        try {
            return $callback();
        } finally {
            $this->bypass($previousBypassed);
        }
    }

    /**
     * Iterate safely through all active tenants.
     */
    public function eachTenant(callable $callback): void
    {
        $tenants = DB::table('tenants')
            ->whereNull('deleted_at')
            ->where('status', 'active')
            ->get();

        foreach ($tenants as $tenant) {
            $this->actingAsTenant($tenant->id, fn () => $callback($tenant));
        }
    }

    /**
     * Static alias for actingAsTenant.
     */
    public static function acting(string $tenantId, callable $callback): mixed
    {
        return app(self::class)->actingAsTenant($tenantId, $callback);
    }

    /**
     * Static helper to get the current tenant ID.
     */
    public static function currentId(): ?string
    {
        return app(self::class)->id();
    }
}
