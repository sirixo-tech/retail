<?php

namespace App\Modules\Pos\Http\Controllers;

use App\Modules\Plans\Support\Entitlement;
use App\Modules\Tenancy\Models\Store;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class TerminalController
{
    public static function defaultKioskSettings(?Store $store = null): array
    {
        return [
            'enabled' => true,
            'welcome_title' => $store ? 'Welcome to '.$store->name : 'Self-Ordering Kiosk',
            'welcome_subtitle' => 'Tap anywhere to browse items, pay instantly, and collect at the counter.',
            'banner_url' => 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1400&q=80',
            'screensaver_urls' => [
                'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80',
                'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=900&q=80',
                'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=900&q=80',
            ],
            'accent_color' => '#ea580c',
            'layout_columns' => '3',
            'show_product_images' => true,
            'show_stock_badges' => true,
            'show_sku_barcode' => true,
            'enable_barcode_scanner' => true,
            'enable_upsell_recommendations' => true,
            'order_types' => [
                'in_store' => true,
                'takeaway' => true,
                'express_pickup' => true,
                'delivery' => false,
            ],
            'default_order_type' => 'express_pickup',
            'require_customer_phone' => false,
            'require_customer_name' => false,
            'allow_guest_checkout' => true,
            'payment_modes' => [
                'upi_qr' => true,
                'card_tap' => true,
                'pay_at_counter' => false,
            ],
            'default_language' => 'en',
            'supported_languages' => ['en', 'hi', 'te'],
            'allow_language_switcher' => true,
            'tax_display_mode' => 'inclusive',
            'carry_bag_fee_paise' => 0,
            'idle_timeout_seconds' => 90,
            'sound_effects' => true,
            'require_pin_for_settings' => true,
            'printing' => [
                'auto_print_kiosk_slip' => true,
                'print_validation_qr' => true,
                'qr_size' => 'L',
                'print_queue_token_banner' => true,
                'print_itemized_lines' => true,
                'kiosk_slip_copies' => 1,
                'kiosk_slip_instruction' => 'Scan this QR slip at the counter to validate & collect your items.',
                'auto_print_counter_handover_receipt' => true,
                'counter_receipt_copies' => 1,
                'print_serving_checklist' => true,
                'single_use_qr_redemption' => true,
                'require_paid_status_on_scan' => true,
                'open_drawer_on_unpaid_scan' => true,
                'counter_stamp_text' => 'QR VERIFIED AT COUNTER — READY TO SERVE',
            ],
        ];
    }

    public function index(Request $request, string $storeId): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $store = Store::query()->where('id', $storeId)->where('tenant_id', $tenantId)->first();
        if (! $store) {
            return ApiResponse::error('resource.not_found', 'Store not found.', 404);
        }

        $kindFilter = $request->query('kind');
        $query = DB::table('counters')
            ->where('store_id', $store->id)
            ->where('tenant_id', $tenantId)
            ->orderBy('code');

        if (is_string($kindFilter) && in_array($kindFilter, ['pos', 'kiosk'], true)) {
            $query->where('kind', $kindFilter);
        }

        $terminals = $query->get();

        $rows = $terminals->map(fn ($row) => $this->presentTerminal($row, $store));

        $kioskSettings = array_replace_recursive(
            self::defaultKioskSettings($store),
            is_array($store->settings['kiosk'] ?? null) ? $store->settings['kiosk'] : [],
        );

        $counterLimit = app(Entitlement::class)->value($tenantId, 'limit.counters');

        return ApiResponse::ok([
            'terminals' => $rows->values(),
            'pos_terminals' => $rows->where('kind', 'pos')->values(),
            'kiosks' => $rows->where('kind', 'kiosk')->values(),
            'kiosk_settings' => $kioskSettings,
            'stats' => [
                'total' => $rows->count(),
                'paired' => $rows->filter(fn ($t) => $t['is_paired'])->count(),
                'unpaired' => $rows->filter(fn ($t) => ! $t['is_paired'])->count(),
                'with_pin' => $rows->filter(fn ($t) => $t['has_pin'])->count(),
                'plan_limit' => $counterLimit > 0 ? $counterLimit : ($counterLimit === -1 ? 'unlimited' : 1),
                'store_id' => $tenantId,
                'branch_id' => $store->id,
                'branch_name' => $store->name,
                'branch_code' => $store->code,
            ],
        ]);
    }

    public function store(Request $request, string $storeId): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $store = Store::query()->where('id', $storeId)->where('tenant_id', $tenantId)->first();
        if (! $store) {
            return ApiResponse::error('resource.not_found', 'Store not found.', 404);
        }

        $counterLimit = app(Entitlement::class)->value($tenantId, 'limit.counters');
        if ($counterLimit === 0) {
            $counterLimit = 2;
        }
        $currentCounters = DB::table('counters')->where('tenant_id', $tenantId)->count();
        if ($counterLimit > 0 && $currentCounters >= $counterLimit) {
            return ApiResponse::error(
                'plan.limit_reached',
                "Your plan limit of {$counterLimit} counter/kiosk terminal(s) has been reached. Please upgrade your subscription plan to add more terminals.",
                422,
                [
                    'feature' => 'limit.counters',
                    'limit' => $counterLimit,
                    'current' => $currentCounters,
                ]
            );
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'code' => ['nullable', 'string', 'max:20'],
            'kind' => ['nullable', 'string', 'in:pos,kiosk'],
            'pin' => ['nullable', 'digits_between:4,6'],
        ]);

        $kind = $data['kind'] ?? 'pos';
        $prefix = $kind === 'kiosk' ? 'K' : 'T';
        $code = strtoupper(trim($data['code'] ?? ''));
        if ($code === '') {
            $existing = DB::table('counters')->where('store_id', $store->id)->where('kind', $kind)->count();
            $code = $prefix.($existing + 1);
            while (DB::table('counters')->where('store_id', $store->id)->where('code', $code)->exists()) {
                $existing++;
                $code = $prefix.($existing + 1);
            }
        }

        $id = (string) Str::uuid7();
        DB::table('counters')->insert([
            'id' => $id,
            'store_id' => $store->id,
            'tenant_id' => $tenantId,
            'name' => $data['name'],
            'code' => $code,
            'kind' => $kind,
            'pin_hash' => ! empty($data['pin']) ? Hash::make((string) $data['pin']) : null,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('invoice_series')->insert([
            'id' => (string) Str::uuid7(),
            'tenant_id' => $tenantId,
            'store_id' => $store->id,
            'counter_id' => $id,
            'fiscal_year' => '2026-27',
            'prefix' => $store->code.'-'.$code.'-',
            'next_number' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return ApiResponse::ok([
            'id' => $id,
            'store_id' => $tenantId,
            'branch_id' => $store->id,
            'name' => $data['name'],
            'code' => $code,
            'kind' => $kind,
            'has_pin' => ! empty($data['pin']),
        ], 201);
    }

    public function update(Request $request, string $storeId, string $counterId): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $counter = DB::table('counters')->where('id', $counterId)->where('store_id', $storeId)->where('tenant_id', $tenantId)->first();
        if (! $counter) {
            return ApiResponse::error('resource.not_found', 'Terminal not found.', 404);
        }

        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:80'],
            'code' => ['sometimes', 'nullable', 'string', 'max:20'],
            'status' => ['sometimes', 'nullable', 'string', 'in:active,inactive'],
            'kind' => ['sometimes', 'nullable', 'string', 'in:pos,kiosk'],
            'pin' => ['sometimes', 'nullable', 'digits_between:4,6'],
        ]);

        $updates = ['updated_at' => now()];
        if (isset($data['name'])) {
            $updates['name'] = $data['name'];
        }
        if (isset($data['code']) && trim((string) $data['code']) !== '') {
            $updates['code'] = strtoupper(trim((string) $data['code']));
        }
        if (isset($data['status'])) {
            $updates['status'] = $data['status'];
        }
        if (isset($data['kind'])) {
            $updates['kind'] = $data['kind'];
        }
        if (! empty($data['pin'])) {
            $updates['pin_hash'] = Hash::make((string) $data['pin']);
        }

        DB::table('counters')->where('id', $counterId)->update($updates);

        return ApiResponse::ok(['id' => $counterId, 'updated' => true]);
    }

    public function setPin(Request $request, string $storeId, string $counterId): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $counter = DB::table('counters')->where('id', $counterId)->where('store_id', $storeId)->where('tenant_id', $tenantId)->first();
        if (! $counter) {
            return ApiResponse::error('resource.not_found', 'Terminal not found.', 404);
        }

        $data = $request->validate([
            'pin' => ['nullable', 'digits_between:4,6'],
            'clear' => ['nullable', 'boolean'],
        ]);

        if (! empty($data['clear'])) {
            DB::table('counters')->where('id', $counterId)->update([
                'pin_hash' => null,
                'updated_at' => now(),
            ]);

            return ApiResponse::ok([
                'id' => $counterId,
                'has_pin' => false,
                'message' => 'Terminal PIN removed.',
            ]);
        }

        if (empty($data['pin'])) {
            return ApiResponse::error('validation.failed', 'Enter a 4 to 6 digit PIN.', 422);
        }

        DB::table('counters')->where('id', $counterId)->update([
            'pin_hash' => Hash::make((string) $data['pin']),
            'updated_at' => now(),
        ]);

        return ApiResponse::ok([
            'id' => $counterId,
            'has_pin' => true,
            'message' => 'Terminal PIN saved.',
        ]);
    }

    public function verifyPin(Request $request, string $storeId, string $counterId): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $counter = DB::table('counters')->where('id', $counterId)->where('store_id', $storeId)->where('tenant_id', $tenantId)->first();
        if (! $counter) {
            return ApiResponse::error('resource.not_found', 'Terminal not found.', 404);
        }

        $data = $request->validate([
            'pin' => ['required', 'digits_between:4,6'],
        ]);

        if (empty($counter->pin_hash)) {
            return ApiResponse::ok([
                'verified' => true,
                'terminal_id' => $counter->id,
                'kind' => $counter->kind ?? 'pos',
            ]);
        }

        if (! Hash::check((string) $data['pin'], (string) $counter->pin_hash)) {
            return ApiResponse::error('auth.invalid_pin', 'That terminal PIN is not valid.', 401);
        }

        $request->session()->put('active_terminal_id', $counter->id);

        return ApiResponse::ok([
            'verified' => true,
            'terminal_id' => $counter->id,
            'name' => $counter->name,
            'code' => $counter->code,
            'kind' => $counter->kind ?? 'pos',
        ]);
    }

    public function kioskSettings(Request $request, string $storeId): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $store = Store::query()->where('id', $storeId)->where('tenant_id', $tenantId)->first();
        if (! $store) {
            return ApiResponse::error('resource.not_found', 'Store not found.', 404);
        }

        $kioskSettings = array_replace_recursive(
            self::defaultKioskSettings($store),
            is_array($store->settings['kiosk'] ?? null) ? $store->settings['kiosk'] : [],
        );

        return ApiResponse::ok([
            'store_id' => $tenantId,
            'branch_id' => $store->id,
            'branch_name' => $store->name,
            'kiosk_settings' => $kioskSettings,
        ]);
    }

    public function updateKioskSettings(Request $request, string $storeId): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $store = Store::query()->where('id', $storeId)->where('tenant_id', $tenantId)->first();
        if (! $store) {
            return ApiResponse::error('resource.not_found', 'Store not found.', 404);
        }

        $incoming = $request->input('kiosk_settings') ?? $request->all();
        if (! is_array($incoming)) {
            $incoming = [];
        }

        $settings = is_array($store->settings) ? $store->settings : [];
        $mergedKiosk = array_replace_recursive(
            self::defaultKioskSettings($store),
            is_array($settings['kiosk'] ?? null) ? $settings['kiosk'] : [],
            $incoming,
        );
        if (isset($incoming['supported_languages']) && is_array($incoming['supported_languages'])) {
            $mergedKiosk['supported_languages'] = array_values($incoming['supported_languages']);
        }
        if (isset($incoming['screensaver_urls']) && is_array($incoming['screensaver_urls'])) {
            $mergedKiosk['screensaver_urls'] = array_values($incoming['screensaver_urls']);
        }

        $settings['kiosk'] = $mergedKiosk;
        $store->settings = $settings;
        $store->save();

        return ApiResponse::ok([
            'saved' => true,
            'store_id' => $tenantId,
            'branch_id' => $store->id,
            'kiosk_settings' => $mergedKiosk,
        ]);
    }

    public function destroy(Request $request, string $storeId, string $counterId): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $deleted = DB::table('counters')
            ->where('id', $counterId)
            ->where('store_id', $storeId)
            ->where('tenant_id', $tenantId)
            ->delete();

        if (! $deleted) {
            return ApiResponse::error('resource.not_found', 'Terminal not found.', 404);
        }

        return ApiResponse::ok(['deleted' => true]);
    }

    public function pair(Request $request, string $storeId, string $counterId): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $counter = DB::table('counters')->where('id', $counterId)->where('store_id', $storeId)->where('tenant_id', $tenantId)->first();
        if (! $counter) {
            return ApiResponse::error('resource.not_found', 'Terminal not found.', 404);
        }

        $data = $request->validate([
            'code' => ['nullable', 'string', 'max:10'],
            'device_name' => ['nullable', 'string', 'max:120'],
        ]);

        $pairingCode = trim($data['code'] ?? '');
        $deviceName = trim($data['device_name'] ?? '');
        $defaultLabel = ($counter->kind ?? 'pos') === 'kiosk'
            ? 'Self-Ordering Kiosk ('.$counter->code.')'
            : 'POS Tablet ('.$counter->code.')';

        if ($pairingCode !== '') {
            $cleaned = preg_replace('/[^0-9]/', '', $pairingCode);
            DB::table('counters')->where('id', $counterId)->update([
                'pairing_code' => $cleaned,
                'paired_at' => now(),
                'device_name' => $deviceName ?: $defaultLabel,
                'device_fingerprint' => 'dev_'.bin2hex(random_bytes(8)),
                'pairing_expires_at' => null,
                'updated_at' => now(),
            ]);

            return ApiResponse::ok([
                'paired' => true,
                'counter_id' => $counterId,
                'terminal_id' => $counterId,
                'kind' => $counter->kind ?? 'pos',
                'device_name' => $deviceName ?: $defaultLabel,
                'paired_at' => now()->toIso8601String(),
            ]);
        }

        $generatedCode = sprintf('%06d', random_int(100000, 999999));
        DB::table('counters')->where('id', $counterId)->update([
            'pairing_code' => $generatedCode,
            'pairing_expires_at' => now()->addMinutes(10),
            'updated_at' => now(),
        ]);

        return ApiResponse::ok([
            'pairing_code' => substr($generatedCode, 0, 3).'-'.substr($generatedCode, 3, 3),
            'raw_code' => $generatedCode,
            'expires_at' => now()->addMinutes(10)->toIso8601String(),
            'message' => 'Enter this 6-digit code on the terminal screen within 10 minutes.',
        ]);
    }

    public function unpair(Request $request, string $storeId, string $counterId): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        DB::table('counters')
            ->where('id', $counterId)
            ->where('store_id', $storeId)
            ->where('tenant_id', $tenantId)
            ->update([
                'paired_at' => null,
                'device_name' => null,
                'device_fingerprint' => null,
                'pairing_code' => null,
                'pairing_expires_at' => null,
                'updated_at' => now(),
            ]);

        return ApiResponse::ok(['unpaired' => true]);
    }

    public function publicGeneratePairCode(Request $request): JsonResponse
    {
        $code = sprintf('%06d', random_int(100000, 999999));
        $token = 'pair_'.Str::random(32);

        cache()->put("pos_pair_{$code}", [
            'token' => $token,
            'created_at' => now(),
        ], now()->addMinutes(15));

        return ApiResponse::ok([
            'pairing_code' => substr($code, 0, 3).'-'.substr($code, 3, 3),
            'raw_code' => $code,
            'token' => $token,
            'expires_in_seconds' => 900,
        ]);
    }

    public function publicCheckPairStatus(Request $request): JsonResponse
    {
        $code = preg_replace('/[^0-9]/', '', (string) $request->query('code'));
        if (! $code) {
            return ApiResponse::error('validation.failed', 'Pairing code required.', 422);
        }

        $counter = DB::table('counters')
            ->join('stores', 'stores.id', '=', 'counters.store_id')
            ->join('tenants', 'tenants.id', '=', 'counters.tenant_id')
            ->where('counters.pairing_code', $code)
            ->whereNotNull('counters.paired_at')
            ->select([
                'counters.id as counter_id',
                'counters.id as terminal_id',
                'counters.name as counter_name',
                'counters.code as counter_code',
                'counters.kind as kind',
                'counters.pin_hash as pin_hash',
                'stores.id as store_id',
                'stores.id as branch_id',
                'stores.name as store_name',
                'stores.name as branch_name',
                'tenants.id as tenant_id',
                'tenants.name as tenant_name',
                'tenants.slug as tenant_slug',
            ])
            ->first();

        if (! $counter) {
            return ApiResponse::ok(['paired' => false]);
        }

        return ApiResponse::ok([
            'paired' => true,
            'counter' => [
                'counter_id' => $counter->counter_id,
                'terminal_id' => $counter->terminal_id,
                'counter_name' => $counter->counter_name,
                'counter_code' => $counter->counter_code,
                'kind' => $counter->kind ?? 'pos',
                'has_pin' => ! empty($counter->pin_hash),
                'store_id' => $counter->store_id,
                'branch_id' => $counter->branch_id,
                'store_name' => $counter->store_name,
                'branch_name' => $counter->branch_name,
                'tenant_id' => $counter->tenant_id,
                'tenant_name' => $counter->tenant_name,
                'tenant_slug' => $counter->tenant_slug,
            ],
        ]);
    }

    private function presentTerminal(object $row, Store $store): array
    {
        $isPaired = ! empty($row->paired_at);
        $kind = $row->kind ?? 'pos';
        $host = request()->header('x-forwarded-host') ?: request()->getHost();
        if ($host === '127.0.0.1' || $host === 'localhost' || empty($host) || str_starts_with($host, '127.0.0.1') || str_starts_with($host, 'localhost')) {
            $host = 'retail.sirixo.com';
        }
        $scheme = (request()->secure() || request()->header('x-forwarded-proto') === 'https' || ! str_contains($host, ':')) ? 'https://' : 'http://';
        $slugOrCode = urlencode($store->public_slug ?: $store->code);

        return [
            'id' => $row->id,
            'terminal_id' => $row->id,
            'store_id' => $row->tenant_id,
            'branch_id' => $store->id,
            'name' => $row->name,
            'code' => $row->code,
            'kind' => $kind,
            'status' => $row->status,
            'has_pin' => ! empty($row->pin_hash),
            'is_paired' => $isPaired,
            'paired_at' => $row->paired_at,
            'device_name' => $row->device_name ?: ($isPaired ? ($kind === 'kiosk' ? 'Paired Kiosk Display' : 'Paired POS Tablet') : null),
            'pairing_code' => $row->pairing_code,
            'pairing_expires_at' => $row->pairing_expires_at,
            'customer_display_url' => "{$scheme}{$host}/customer-display?terminal=".urlencode($row->code).'&store='.$slugOrCode,
            'kiosk_url' => "{$scheme}{$host}/store?store={$slugOrCode}&kiosk=".urlencode($row->code).'&branch_id='.urlencode($store->id),
            'created_at' => $row->created_at,
        ];
    }
}
