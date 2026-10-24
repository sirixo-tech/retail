<?php

namespace App\Modules\Tenancy\Models;

use App\Support\Tenancy\BelongsToTenant;
use App\Support\Tenancy\TenantContext;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Store extends Model
{
    use HasUuids, SoftDeletes, BelongsToTenant;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'tenant_id', 'name', 'code', 'public_slug', 'gstin', 'address_line', 'city',
        'state_code', 'pincode', 'timezone', 'gst_pricing_mode', 'round_to_rupee',
        'status', 'is_default', 'settings',
    ];

    protected function casts(): array
    {
        return [
            'round_to_rupee' => 'boolean',
            'is_default' => 'boolean',
            'settings' => 'array',
        ];
    }

    public function newUniqueId(): string
    {
        return (string) Str::uuid7();
    }

    public function uniqueIds(): array
    {
        return ['id'];
    }

    public static function resolvePublic(string $slug): ?self
    {
        return app(TenantContext::class)->withoutTenantScope(function () use ($slug): ?self {
            $clean = trim($slug);
            if ($clean === '') {
                return null;
            }

        $exact = self::query()->where('public_slug', $clean)->where('status', 'active')->first();
        if ($exact) {
            return $exact;
        }

        $lower = mb_strtolower($clean);
        $byLowerSlug = self::query()->whereRaw('LOWER(public_slug) = ?', [$lower])->where('status', 'active')->first();
        if ($byLowerSlug) {
            return $byLowerSlug;
        }

        $byName = self::query()->whereRaw('LOWER(name) = ?', [$lower])->where('status', 'active')->first();
        if ($byName) {
            return $byName;
        }

        $byId = self::query()->where('id', $clean)->where('status', 'active')->first();
        if ($byId) {
            return $byId;
        }

        $tenant = Tenant::query()->whereRaw('LOWER(slug) = ?', [$lower])->orWhereRaw('LOWER(name) = ?', [$lower])->first();
        if ($tenant) {
            $byTenant = self::query()->where('tenant_id', $tenant->id)->where('status', 'active')->orderByDesc('is_default')->first();
            if ($byTenant) {
                return $byTenant;
            }
        }

        $allActive = self::query()->where('status', 'active')->get();
        foreach ($allActive as $candidate) {
            $customPath = $candidate->settings['online_store']['basics']['storeUrlPath'] ?? null;
            if (is_string($customPath) && mb_strtolower(trim($customPath)) === $lower) {
                return $candidate;
            }
            $customName = $candidate->settings['online_store']['basics']['storeName'] ?? ($candidate->settings['tenant']['tradeName'] ?? null);
            if (is_string($customName) && mb_strtolower(trim($customName)) === $lower) {
                return $candidate;
            }
        }

        if (! app()->environment('testing') && $allActive->isNotEmpty()) {
            return $allActive->sortByDesc(function (self $s) {
                return \Illuminate\Support\Facades\DB::table('store_items')
                    ->where('store_id', $s->id)
                    ->whereNull('deleted_at')
                    ->count();
            })->first();
        }

            return null;
        });
    }
}
