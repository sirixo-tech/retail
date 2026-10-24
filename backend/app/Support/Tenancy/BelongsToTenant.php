<?php

namespace App\Support\Tenancy;

use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait BelongsToTenant
{
    public static function bootBelongsToTenant(): void
    {
        static::addGlobalScope(new TenantScope());

        static::creating(function ($model): void {
            if (empty($model->tenant_id)) {
                $tenantId = app(TenantContext::class)->id();
                if (! empty($tenantId)) {
                    $model->tenant_id = $tenantId;
                }
            }
        });
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function allowsNullTenant(): bool
    {
        return property_exists($this, 'allowsNullTenant') && $this->allowsNullTenant === true;
    }

    public function scopeWithoutTenancy(Builder $query): Builder
    {
        return $query->withoutGlobalScope(TenantScope::class);
    }
}
