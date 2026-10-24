<?php

namespace App\Modules\Tenancy\Models;

use App\Modules\Plans\Models\Subscription;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Tenant extends Model
{
    use HasUuids, SoftDeletes;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'kind', 'name', 'legal_name', 'slug', 'email', 'phone_e164', 'gstin', 'pan',
        'status', 'timezone', 'currency', 'db_target', 'provision_status', 'idempotency_key',
        'organization_id', 'custom_domain', 'settings',
    ];

    protected $casts = [
        'settings' => 'array',
    ];

    public function newUniqueId(): string
    {
        return (string) Str::uuid7();
    }

    public function uniqueIds(): array
    {
        return ['id'];
    }

    public function organization(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(self::class, 'organization_id');
    }

    public function memberTenants(): HasMany
    {
        return $this->hasMany(self::class, 'organization_id');
    }

    public function staffProfiles(): HasMany
    {
        return $this->hasMany(\App\Modules\Identity\Models\StaffProfile::class, 'tenant_id');
    }

    public function stores(): HasMany
    {
        return $this->hasMany(Store::class);
    }

    public function subscription(): HasOne
    {
        return $this->hasOne(Subscription::class);
    }

    public function provisionSteps(): HasMany
    {
        return $this->hasMany(ProvisionStep::class);
    }

    /**
     * Run a callback under this tenant's context.
     */
    public static function acting(string $tenantId, callable $callback): mixed
    {
        return app(\App\Support\Tenancy\TenantContext::class)->actingAsTenant($tenantId, $callback);
    }

    /**
     * Iterate safely through all active tenants.
     */
    public static function eachTenant(callable $callback): void
    {
        app(\App\Support\Tenancy\TenantContext::class)->eachTenant($callback);
    }
}
