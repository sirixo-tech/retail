<?php

namespace App\Modules\Tenancy\Http\Controllers;

use App\Modules\Tenancy\Models\Store;
use App\Modules\Tenancy\Models\Tenant;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class StoreController
{
    public function index(Request $request): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        if (! $tenantId) {
            return ApiResponse::error('auth.unauthorized', 'Tenant context required.', 401);
        }

        $tenant = Tenant::query()->with('subscription.plan')->find($tenantId);
        $stores = Store::query()
            ->where('tenant_id', $tenantId)
            ->orderByDesc('is_default')
            ->orderBy('name')
            ->get();

        $rows = $stores->map(function (Store $store) use ($tenantId) {
            $ordersCount = DB::table('sales')->where('store_id', $store->id)->count();
            $countersCount = DB::table('counters')->where('store_id', $store->id)->count();
            $staffCount = DB::table('staff_profiles')->where('tenant_id', $tenantId)->count();

            return [
                'id' => $store->id,
                'tenant_id' => $store->tenant_id,
                'name' => $store->name,
                'code' => $store->code,
                'public_slug' => $store->public_slug,
                'gstin' => $store->gstin,
                'address_line' => $store->address_line,
                'city' => $store->city,
                'state_code' => $store->state_code,
                'pincode' => $store->pincode,
                'timezone' => $store->timezone ?? 'Asia/Kolkata',
                'gst_pricing_mode' => $store->gst_pricing_mode ?? 'inclusive',
                'round_to_rupee' => (bool) $store->round_to_rupee,
                'status' => $store->status ?? 'active',
                'is_default' => (bool) $store->is_default,
                'orders_count' => $ordersCount,
                'terminals_count' => $countersCount,
                'staff_count' => $staffCount,
                'contact_phone' => $store->settings['contact_phone'] ?? null,
                'contact_email' => $store->settings['contact_email'] ?? null,
                'storefront_url' => (function () use ($store) {
                    $host = request()->header('x-forwarded-host') ?: request()->getHost();
                    if ($host === '127.0.0.1' || $host === 'localhost' || empty($host) || str_starts_with($host, '127.0.0.1') || str_starts_with($host, 'localhost')) {
                        $host = 'retail.sirixo.com';
                    }
                    $scheme = (request()->secure() || request()->header('x-forwarded-proto') === 'https' || !str_contains($host, ':')) ? 'https://' : 'http://';
                    return "{$scheme}{$host}/store?store=" . ($store->public_slug ?: $store->code);
                })(),
                'created_at' => $store->created_at?->toIso8601String(),
            ];
        });

        $activeStoreId = session('active_store_id');
        $defaultStore = $stores->firstWhere('is_default', true) ?? $stores->first();

        return ApiResponse::ok([
            'stores' => $rows,
            'stats' => [
                'total_locations' => $stores->count(),
                'plan_limit' => $tenant?->kind === 'organization' ? 20 : 1,
                'with_orders' => $rows->filter(fn ($s) => $s['orders_count'] > 0)->count(),
                'default_location' => $defaultStore?->name ?? 'Default Branch',
                'active_location_id' => $activeStoreId ?: ($defaultStore?->id),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        if (! $tenantId) {
            return ApiResponse::error('auth.unauthorized', 'Tenant context required.', 401);
        }

        $tenant = Tenant::query()->find($tenantId);
        $count = Store::query()->where('tenant_id', $tenantId)->count();

        if ($tenant->kind !== 'organization' && $count >= 1) {
            return ApiResponse::error(
                'plan.limit_reached',
                'Single store plan allows 1 branch. Upgrade to an Organization plan to add multiple locations.',
                422
            );
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'code' => ['nullable', 'string', 'max:20'],
            'public_slug' => ['nullable', 'string', 'max:60'],
            'gstin' => ['nullable', 'string', 'max:15'],
            'address_line' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:80'],
            'state_code' => ['nullable', 'string', 'max:20'],
            'pincode' => ['nullable', 'string', 'max:12'],
            'timezone' => ['nullable', 'string', 'max:60'],
            'contact_phone' => ['nullable', 'string', 'max:20'],
            'contact_email' => ['nullable', 'email', 'max:160'],
            'gst_pricing_mode' => ['nullable', Rule::in(['inclusive', 'exclusive'])],
            'is_default' => ['nullable', 'boolean'],
        ]);

        $code = strtoupper(trim($data['code'] ?? ''));
        if ($code === '') {
            $code = strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $data['name']), 0, 6)) ?: 'LOC';
            $suffix = 1;
            while (Store::query()->where('tenant_id', $tenantId)->where('code', $code)->exists()) {
                $code = substr($code, 0, 4) . $suffix;
                $suffix++;
            }
        }

        $slug = strtolower(trim($data['public_slug'] ?? ''));
        if ($slug === '') {
            $slug = Str::slug($data['name']);
            $suffix = 1;
            while (Store::query()->where('public_slug', $slug)->exists()) {
                $slug = Str::slug($data['name']) . '-' . $suffix;
                $suffix++;
            }
        }

        $isDefault = (bool) ($data['is_default'] ?? false);
        if ($isDefault || $count === 0) {
            Store::query()->where('tenant_id', $tenantId)->update(['is_default' => false]);
            $isDefault = true;
        }

        $store = Store::query()->create([
            'tenant_id' => $tenantId,
            'name' => $data['name'],
            'code' => $code,
            'public_slug' => $slug,
            'gstin' => $data['gstin'] ?? $tenant->gstin,
            'address_line' => $data['address_line'] ?? null,
            'city' => $data['city'] ?? 'Bangalore',
            'state_code' => $data['state_code'] ?? 'KA',
            'pincode' => $data['pincode'] ?? null,
            'timezone' => $data['timezone'] ?? 'Asia/Kolkata',
            'gst_pricing_mode' => $data['gst_pricing_mode'] ?? 'inclusive',
            'round_to_rupee' => true,
            'status' => 'active',
            'is_default' => $isDefault,
            'settings' => [
                'contact_phone' => $data['contact_phone'] ?? null,
                'contact_email' => $data['contact_email'] ?? null,
            ],
        ]);

        // Provision initial counter and invoice series for this branch
        $counterId = (string) Str::uuid7();
        DB::table('counters')->insert([
            'id' => $counterId,
            'store_id' => $store->id,
            'tenant_id' => $tenantId,
            'name' => 'Main Register',
            'code' => 'T1',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('invoice_series')->insert([
            'id' => (string) Str::uuid7(),
            'tenant_id' => $tenantId,
            'store_id' => $store->id,
            'counter_id' => $counterId,
            'fiscal_year' => '2026-27',
            'prefix' => $code . '-',
            'next_number' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return ApiResponse::ok($store, 201);
    }

    public function show(Request $request, Store $store): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        if ($store->tenant_id !== $tenantId) {
            return ApiResponse::error('auth.forbidden', 'Store does not belong to this tenant.', 403);
        }

        $counters = DB::table('counters')->where('store_id', $store->id)->get();

        return ApiResponse::ok([
            'store' => $store,
            'counters' => $counters,
        ]);
    }

    public function update(Request $request, Store $store): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        if ($store->tenant_id !== $tenantId) {
            return ApiResponse::error('auth.forbidden', 'Store does not belong to this tenant.', 403);
        }

        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'code' => ['sometimes', 'nullable', 'string', 'max:20'],
            'public_slug' => ['sometimes', 'nullable', 'string', 'max:60'],
            'gstin' => ['sometimes', 'nullable', 'string', 'max:15'],
            'address_line' => ['sometimes', 'nullable', 'string', 'max:255'],
            'city' => ['sometimes', 'nullable', 'string', 'max:80'],
            'state_code' => ['sometimes', 'nullable', 'string', 'max:20'],
            'pincode' => ['sometimes', 'nullable', 'string', 'max:12'],
            'timezone' => ['sometimes', 'nullable', 'string', 'max:60'],
            'contact_phone' => ['sometimes', 'nullable', 'string', 'max:20'],
            'contact_email' => ['sometimes', 'nullable', 'email', 'max:160'],
            'gst_pricing_mode' => ['sometimes', 'nullable', Rule::in(['inclusive', 'exclusive'])],
            'is_default' => ['sometimes', 'nullable', 'boolean'],
            'status' => ['sometimes', 'nullable', Rule::in(['active', 'inactive'])],
        ]);

        if (! empty($data['is_default'])) {
            Store::query()->where('tenant_id', $tenantId)->where('id', '!=', $store->id)->update(['is_default' => false]);
            $store->is_default = true;
        }

        if (isset($data['name'])) $store->name = $data['name'];
        if (isset($data['code'])) $store->code = strtoupper($data['code']);
        if (isset($data['public_slug'])) $store->public_slug = strtolower($data['public_slug']);
        if (isset($data['gstin'])) $store->gstin = $data['gstin'];
        if (isset($data['address_line'])) $store->address_line = $data['address_line'];
        if (isset($data['city'])) $store->city = $data['city'];
        if (isset($data['state_code'])) $store->state_code = $data['state_code'];
        if (isset($data['pincode'])) $store->pincode = $data['pincode'];
        if (isset($data['timezone'])) $store->timezone = $data['timezone'];
        if (isset($data['gst_pricing_mode'])) $store->gst_pricing_mode = $data['gst_pricing_mode'];
        if (isset($data['status'])) $store->status = $data['status'];

        $settings = $store->settings ?? [];
        if (isset($data['contact_phone'])) $settings['contact_phone'] = $data['contact_phone'];
        if (isset($data['contact_email'])) $settings['contact_email'] = $data['contact_email'];
        $store->settings = $settings;

        $store->save();

        return ApiResponse::ok($store);
    }

    public function destroy(Request $request, Store $store): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        if ($store->tenant_id !== $tenantId) {
            return ApiResponse::error('auth.forbidden', 'Store does not belong to this tenant.', 403);
        }

        $total = Store::query()->where('tenant_id', $tenantId)->count();
        if ($total <= 1) {
            return ApiResponse::error('validation.failed', 'Cannot delete the only branch of a store.', 422);
        }

        if ($store->is_default) {
            // Assign another store as default
            $next = Store::query()->where('tenant_id', $tenantId)->where('id', '!=', $store->id)->first();
            if ($next) {
                $next->update(['is_default' => true]);
            }
        }

        $store->delete();

        return ApiResponse::ok(['deleted' => true]);
    }

    public function switch(Request $request, Store $store): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        if ($store->tenant_id !== $tenantId) {
            return ApiResponse::error('auth.forbidden', 'Store does not belong to this tenant.', 403);
        }

        session(['active_store_id' => $store->id]);

        return ApiResponse::ok([
            'switched' => true,
            'active_store' => [
                'id' => $store->id,
                'name' => $store->name,
                'code' => $store->code,
                'public_slug' => $store->public_slug,
            ],
        ]);
    }
}
