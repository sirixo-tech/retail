<?php

namespace App\Modules\Storefront\Http\Controllers;

use App\Modules\Tenancy\Models\Store;
use App\Modules\Tenancy\Models\Tenant;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PublicShopController
{
    public function index(): JsonResponse
    {
        $rows = Store::query()
            ->where('status', 'active')
            ->whereNotNull('public_slug')
            ->get()
            ->sortByDesc(function (Store $store) {
                return DB::table('store_items')
                    ->where('store_id', $store->id)
                    ->whereNull('deleted_at')
                    ->count();
            })
            ->values()
            ->map(function (Store $store) {
                $displayName = $store->settings['online_store']['basics']['storeName']
                    ?? ($store->settings['tenant']['tradeName'] ?? $store->name);

                return [
                    'id' => $store->id,
                    'name' => is_string($displayName) && trim($displayName) !== '' ? $displayName : $store->name,
                    'public_slug' => $store->public_slug,
                    'address_line' => $store->address_line ?: ($store->settings['tenant']['registeredAddress'] ?? null),
                    'city' => $store->city,
                    'pincode' => $store->pincode,
                ];
            });

        return ApiResponse::ok($rows);
    }

    public function stores(string $slug): JsonResponse
    {
        $tenant = Tenant::query()->where('slug', $slug)->first();
        if (! $tenant) {
            return ApiResponse::error('resource.not_found', 'Organisation not found.', 404);
        }
        $rows = Store::query()->where('tenant_id', $tenant->id)->where('status', 'active')->orderBy('name')->get(['name', 'public_slug']);

        return ApiResponse::ok($rows);
    }

    public function strings(string $locale): JsonResponse
    {
        $packs = [
            'en' => ['search' => 'Search', 'cart' => 'Cart', 'account' => 'Account', 'closed' => 'The shop is closed'],
            'te' => ['search' => 'వెతకండి', 'cart' => 'బండి', 'account' => 'ఖాతా', 'closed' => 'షాప్ మూసి ఉంది'],
            'hi' => ['search' => 'खोजें', 'cart' => 'कार्ट', 'account' => 'खाता', 'closed' => 'दुकान बंद है'],
        ];
        if (! isset($packs[$locale])) {
            return ApiResponse::error('validation.failed', 'Choose en, te, or hi.', 422);
        }

        return ApiResponse::ok($packs[$locale]);
    }

    public function sections(string $slug): JsonResponse
    {
        $store = Store::resolvePublic($slug);
        if (! $store) {
            return ApiResponse::error('resource.not_found', 'Store not found.', 404);
        }
        $rows = DB::table('storefront_sections')->where('store_id', $store->id)->orderBy('position')->get(['position', 'kind', 'title']);

        return ApiResponse::ok($rows);
    }

    public function page(string $slug): JsonResponse
    {
        $page = DB::table('cms_pages')->where('slug', $slug)->where('status', 'published')->whereNull('tenant_id')->first();
        if (! $page) {
            return ApiResponse::error('resource.not_found', 'Page not found.', 404);
        }

        return ApiResponse::ok(['slug' => $page->slug, 'title' => $page->title, 'body' => $page->body]);
    }

    public function requestOtp(Request $request, string $slug): JsonResponse
    {
        $store = Store::resolvePublic($slug);
        if (! $store) {
            return ApiResponse::error('resource.not_found', 'Store not found.', 404);
        }
        $data = $request->validate(['phone' => ['required', 'string', 'max:20']]);
        $phone = preg_replace('/\D+/', '', $data['phone']) ?? '';
        if (strlen($phone) < 10) {
            return ApiResponse::error('validation.failed', 'Enter a mobile number.', 422);
        }
        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        DB::table('customer_otps')->insert([
            'id' => (string) Str::uuid7(),
            'store_id' => $store->id,
            'phone' => $phone,
            'code_hash' => hash_hmac('sha256', $code, (string) config('app.key')),
            'attempts' => 0,
            'expires_at' => now()->addMinutes(10),
            'created_at' => now(),
        ]);
        DB::table('notification_logs')->insert([
            'id' => (string) Str::uuid7(),
            'tenant_id' => $store->tenant_id,
            'channel' => 'sms',
            'template' => 'customer.otp',
            'status' => 'not_configured',
            'detail' => 'SMS is not configured. The code was not sent.',
            'created_at' => now(),
        ]);
        $payload = ['status' => 'not_configured'];
        if (app()->environment('local', 'testing')) {
            $payload['code'] = $code;
        }

        return ApiResponse::ok($payload);
    }

    public function verifyOtp(Request $request, string $slug): JsonResponse
    {
        $store = Store::resolvePublic($slug);
        if (! $store) {
            return ApiResponse::error('resource.not_found', 'Store not found.', 404);
        }
        $data = $request->validate([
            'phone' => ['required', 'string', 'max:20'],
            'code' => ['required', 'string', 'size:6'],
        ]);
        $phone = preg_replace('/\D+/', '', $data['phone']) ?? '';
        $row = DB::table('customer_otps')
            ->where('store_id', $store->id)
            ->where('phone', $phone)
            ->whereNull('verified_at')
            ->orderByDesc('created_at')
            ->first();
        if (! $row || now()->greaterThan($row->expires_at)) {
            return ApiResponse::error('auth.invalid_code', 'That code is not valid.', 422);
        }
        if ((int) $row->attempts >= 5) {
            return ApiResponse::error('auth.locked', 'Too many attempts.', 423);
        }
        $expected = hash_hmac('sha256', $data['code'], (string) config('app.key'));
        if (! hash_equals($row->code_hash, $expected)) {
            DB::table('customer_otps')->where('id', $row->id)->update(['attempts' => (int) $row->attempts + 1]);

            return ApiResponse::error('auth.invalid_code', 'That code is not valid.', 422);
        }
        DB::table('customer_otps')->where('id', $row->id)->update(['verified_at' => now()]);

        return ApiResponse::ok(['verified' => true]);
    }

    public function organizationHub(string $slug): JsonResponse
    {
        $org = Tenant::query()
            ->where('slug', $slug)
            ->where('kind', 'organization')
            ->first();

        if (! $org) {
            return ApiResponse::error('resource.not_found', 'Organization not found.', 404);
        }

        $memberTenants = Tenant::query()
            ->where('organization_id', $org->id)
            ->where('status', 'active')
            ->get();

        $stores = Store::query()
            ->whereIn('tenant_id', $memberTenants->pluck('id'))
            ->where('status', 'active')
            ->get();

        return ApiResponse::ok([
            'organization' => [
                'id' => $org->id,
                'name' => $org->name,
                'legal_name' => $org->legal_name,
                'slug' => $org->slug,
                'description' => $org->settings['description'] ?? 'Campus & Enterprise Multi-Vendor Storefront Hub',
                'campus_name' => $org->settings['campus_name'] ?? 'Main Campus Complex',
                'banner_text' => $org->settings['banner_text'] ?? 'Explore member stores, order food & retail items across campus outlets.',
            ],
            'member_stores' => $memberTenants->map(function ($tenant) use ($stores) {
                $tenantStores = $stores->where('tenant_id', $tenant->id)->values();
                $firstStore = $tenantStores->first();

                return [
                    'id' => $tenant->id,
                    'name' => $tenant->name,
                    'slug' => $tenant->slug,
                    'public_slug' => $firstStore?->public_slug ?? $tenant->slug,
                    'outlets_count' => $tenantStores->count(),
                    'category' => $tenant->settings['category'] ?? 'General Merchant',
                    'location' => $firstStore?->city ?? ($firstStore?->address_line ?? ''),
                ];
            }),
            'metrics' => [
                'total_merchants' => $memberTenants->count(),
                'total_outlets' => $stores->count(),
                'available_catalog_items' => DB::table('store_items')
                    ->whereIn('store_id', $stores->pluck('id'))
                    ->where('online_visible', true)
                    ->whereNull('deleted_at')
                    ->count(),
            ],
        ]);
    }

    public function organizationItems(Request $request, string $slug): JsonResponse
    {
        $org = Tenant::query()->where('slug', $slug)->where('kind', 'organization')->first();
        if (! $org) {
            return ApiResponse::error('resource.not_found', 'Organization not found.', 404);
        }

        $storeFilter = $request->query('store');

        $query = DB::table('store_items')
            ->join('stores', 'store_items.store_id', '=', 'stores.id')
            ->join('tenants', 'stores.tenant_id', '=', 'tenants.id')
            ->where('tenants.organization_id', $org->id)
            ->where('store_items.online_visible', true)
            ->whereNull('store_items.deleted_at');

        if ($storeFilter) {
            $query->where('tenants.slug', $storeFilter);
        }

        $items = $query->select(
            'store_items.*',
            'stores.name as store_name',
            'stores.public_slug as store_public_slug',
            'tenants.name as merchant_name',
            'tenants.slug as merchant_slug'
        )->limit(100)->get();

        $rows = $items->map(function ($item) {
            $price = DB::table('store_item_prices')->where('store_item_id', $item->id)->orderByDesc('starts_at')->first();
            $rawDetails = ! empty($item->details) ? (is_string($item->details) ? json_decode($item->details, true) : (array) $item->details) : [];

            return [
                'id' => $item->id,
                'name' => $item->name_override ?: ($item->barcode ?: 'Catalog Item'),
                'sku' => $item->barcode,
                'price_paise' => $price?->selling_price_paise ?? 0,
                'mrp_paise' => $price?->mrp_paise ?? ($price?->selling_price_paise ?? 0),
                'store_id' => $item->store_id,
                'store_name' => $item->merchant_name,
                'store_slug' => $item->merchant_slug,
                'image_url' => $rawDetails['images'][0] ?? null,
                'in_stock' => true,
            ];
        });

        return ApiResponse::ok($rows);
    }
}
