<?php

namespace App\Support\Tenancy;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Support\Facades\Auth;

class TenantScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        /** @var TenantContext $context */
        $context = app(TenantContext::class);

        if ($context->isBypassed()) {
            return;
        }

        $tenantId = $context->id();

        $allowsNullTenant = method_exists($model, 'allowsNullTenant') && $model->allowsNullTenant();
        $table = $model->getTable();

        if (! empty($tenantId)) {
            if ($allowsNullTenant) {
                $builder->where(function (Builder $query) use ($table, $tenantId) {
                    $query->where($table . '.tenant_id', $tenantId)
                          ->orWhereNull($table . '.tenant_id');
                });
            } else {
                $builder->where($table . '.tenant_id', $tenantId);
            }
            return;
        }

        // When no tenant context is present:
        // Platform admins bypass tenant scope by default unless impersonating
        $user = Auth::user();
        if ($user && method_exists($user, 'isPlatform') && $user->isPlatform()) {
            return;
        }

        // If authenticated as staff but tenant_id is somehow missing, deny access
        if ($user && isset($user->kind) && $user->kind === 'staff') {
            $builder->whereRaw('1 = 0');
            return;
        }

        // In strict mode, if no tenant is set, deny access
        if ($context->isStrict()) {
            if ($allowsNullTenant) {
                $builder->whereNull($table . '.tenant_id');
            } else {
                $builder->whereRaw('1 = 0');
            }
        }
    }
}
