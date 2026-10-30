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
        $gateway = app(\App\Modules\Notifications\SmsGateway::class);
        $activeSms = $gateway->active();
        if (! $activeSms && ! app()->environment('local', 'testing')) {
            return ApiResponse::error(
                'sms.not_configured',
                'SMS OTP sign-in is unavailable until Super Admin integrates an active SMS gateway. Please continue with Guest Checkout.',
                422
            );
        }
        $firebase = $gateway->publicFirebase();
        if (! empty($firebase['active'])) {
            return ApiResponse::ok(['status' => 'firebase', 'firebase' => $firebase, 'sms_gateway_active' => true]);
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
        $sent = $gateway->record(
            $store->tenant_id,
            'customer.otp',
            'SMS is not configured. The code was not sent.',
            $phone,
            'Your SelfX code is '.$code.'. It expires in 10 minutes.',
        );
        $payload = [
            'status' => $sent,
            'sms_gateway_active' => $activeSms !== null,
        ];
        if (app()->environment('local', 'testing') || ! $activeSms) {
            $payload['code'] = $code;
            $payload['dev_otp'] = $code;
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
            'code' => ['nullable', 'string', 'size:6'],
            'otp' => ['nullable', 'string', 'size:6'],
        ]);
        $phone = preg_replace('/\D+/', '', $data['phone']) ?? '';
        $rawCode = (string) ($request->input('code') ?? $request->input('otp') ?? '');
        if (strlen($rawCode) !== 6) {
            return ApiResponse::error('validation.failed', 'Enter a 6-digit OTP code.', 422);
        }
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
        $expected = hash_hmac('sha256', $rawCode, (string) config('app.key'));
        if (! hash_equals($row->code_hash, $expected)) {
            DB::table('customer_otps')->where('id', $row->id)->update(['attempts' => (int) $row->attempts + 1]);

            return ApiResponse::error('auth.invalid_code', 'That code is not valid.', 422);
        }
        DB::table('customer_otps')->where('id', $row->id)->update(['verified_at' => now()]);

        $tenDigits = substr($phone, -10);
        $customer = DB::table('customers')
            ->where('tenant_id', $store->tenant_id)
            ->where(function ($q) use ($phone, $tenDigits) {
                $q->where('phone_e164', $phone)->orWhere('phone_e164', 'LIKE', "%{$tenDigits}");
            })
            ->whereNull('deleted_at')
            ->first();

        $lastOrder = DB::table('orders')
            ->where('store_id', $store->id)
            ->where(function ($q) use ($phone, $tenDigits) {
                $q->where('customer_phone', $phone)->orWhere('customer_phone', 'LIKE', "%{$tenDigits}");
            })
            ->orderByDesc('created_at')
            ->first();

        $lastAddress = null;
        $lastPincode = null;
        if ($lastOrder && $lastOrder->address_snapshot) {
            $snap = is_string($lastOrder->address_snapshot)
                ? json_decode($lastOrder->address_snapshot, true)
                : (array) $lastOrder->address_snapshot;
            $lastAddress = $snap['address'] ?? null;
            $lastPincode = $snap['pincode'] ?? null;
        }

        return ApiResponse::ok([
            'verified' => true,
            'phone' => $tenDigits,
            'customer_name' => $customer?->name ?? ($lastOrder?->customer_name ?? null),
            'loyalty_points' => $customer ? (int) $customer->loyalty_points : 0,
            'address' => $lastAddress,
            'pincode' => $lastPincode,
        ]);
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

    public function subscribe(Request $request, string $slug): JsonResponse
    {
        $store = Store::resolvePublic($slug);
        if (! $store) {
            return ApiResponse::error('resource.not_found', 'Store not found.', 404);
        }

        $data = $request->validate([
            'email' => ['nullable', 'email', 'max:180'],
            'phone' => ['nullable', 'string', 'max:24'],
            'source' => ['nullable', 'string', 'max:80'],
        ]);

        if (empty($data['email']) && empty($data['phone'])) {
            return ApiResponse::error('validation.failed', 'Provide an email or phone number to subscribe.', 422);
        }

        $settings = is_array($store->settings) ? $store->settings : [];
        $onlineStore = is_array($settings['online_store'] ?? null) ? $settings['online_store'] : [];
        $subscribers = is_array($onlineStore['subscribers'] ?? null) ? $onlineStore['subscribers'] : [];

        $newSubscriber = [
            'id' => 'sub-' . Str::lower(Str::random(8)),
            'email' => trim((string) ($data['email'] ?? '—')),
            'phone' => trim((string) ($data['phone'] ?? '—')),
            'source' => trim((string) ($data['source'] ?? 'Storefront Newsletter')),
            'subscribedAt' => now()->format('Y-m-d H:i'),
            'status' => 'active',
        ];

        array_unshift($subscribers, $newSubscriber);
        $onlineStore['subscribers'] = array_slice($subscribers, 0, 500);
        $settings['online_store'] = $onlineStore;
        $store->settings = $settings;
        $store->save();

        return ApiResponse::ok(['subscribed' => true, 'subscriber' => $newSubscriber]);
    }

    public function contactMessage(Request $request, string $slug): JsonResponse
    {
        $store = Store::resolvePublic($slug);
        if (! $store) {
            return ApiResponse::error('resource.not_found', 'Store not found.', 404);
        }

        $data = $request->validate([
            'customerName' => ['required', 'string', 'max:120'],
            'email' => ['nullable', 'string', 'max:180'],
            'phone' => ['nullable', 'string', 'max:24'],
            'subject' => ['nullable', 'string', 'max:180'],
            'message' => ['required', 'string', 'max:2000'],
        ]);

        $settings = is_array($store->settings) ? $store->settings : [];
        $onlineStore = is_array($settings['online_store'] ?? null) ? $settings['online_store'] : [];
        $messages = is_array($onlineStore['messages'] ?? null) ? $onlineStore['messages'] : [];

        $newMsg = [
            'id' => 'msg-' . Str::lower(Str::random(8)),
            'customerName' => trim($data['customerName']),
            'email' => trim((string) ($data['email'] ?? '—')),
            'phone' => trim((string) ($data['phone'] ?? '—')),
            'subject' => trim((string) ($data['subject'] ?? 'Storefront Inquiry')),
            'message' => trim($data['message']),
            'createdAt' => now()->format('Y-m-d H:i'),
            'status' => 'unread',
        ];

        array_unshift($messages, $newMsg);
        $onlineStore['messages'] = array_slice($messages, 0, 500);
        $settings['online_store'] = $onlineStore;
        $store->settings = $settings;
        $store->save();

        return ApiResponse::ok(['sent' => true, 'inquiry' => $newMsg]);
    }
}
