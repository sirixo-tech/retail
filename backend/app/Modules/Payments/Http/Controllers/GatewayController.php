<?php

namespace App\Modules\Payments\Http\Controllers;

use App\Modules\Tenancy\Models\Store;
use App\Support\ApiResponse;
use App\Support\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class GatewayController
{
    /** @var list<string> */
    public const OFFLINE = ['cod', 'pay_at_store'];

    /** @var list<string> */
    public const PREPAID = ['razorpay', 'cashfree', 'phonepe', 'paytm', 'stripe'];

    public function index(Request $request): JsonResponse
    {
        $storeId = $this->defaultStoreId($request);
        if (! $storeId) {
            return ApiResponse::error('resource.not_found', 'Store not found.', 404);
        }

        return ApiResponse::ok($this->rows($storeId));
    }

    public function update(Request $request, string $provider): JsonResponse
    {
        if (! in_array($provider, [...self::OFFLINE, ...self::PREPAID], true)) {
            return ApiResponse::error('validation.failed', 'Unknown gateway.', 422);
        }
        $data = $request->validate([
            'status' => ['required', 'in:active,disabled'],
            'mode' => ['nullable', 'in:test,live'],
        ]);
        $storeId = $this->defaultStoreId($request);
        if (! $storeId) {
            return ApiResponse::error('resource.not_found', 'Store not found.', 404);
        }
        $mode = $data['mode'] ?? (in_array($provider, self::PREPAID, true) ? 'test' : 'live');
        if (in_array($provider, self::PREPAID, true) && $mode === 'live') {
            return ApiResponse::error('validation.failed', 'Live mode stays off. Save test keys and turn the gateway on in test mode.', 422);
        }
        if (in_array($provider, self::PREPAID, true) && $data['status'] === 'active') {
            $ready = DB::table('payment_gateways')
                ->where('store_id', $storeId)
                ->where('provider', $provider)
                ->where('mode', 'test')
                ->whereNotNull('credentials_ciphertext')
                ->exists();
            if (! $ready) {
                return ApiResponse::error('validation.failed', 'Save the key id and key secret before turning this gateway on.', 422);
            }
        }

        $existing = DB::table('payment_gateways')->where('store_id', $storeId)->where('provider', $provider)->where('mode', $mode)->first();
        if ($existing) {
            DB::table('payment_gateways')->where('id', $existing->id)->update(['status' => $data['status'], 'updated_at' => now()]);
        } else {
            DB::table('payment_gateways')->insert([
                'id' => (string) Str::uuid7(),
                'tenant_id' => $request->session()->get('tenant_id'),
                'store_id' => $storeId,
                'provider' => $provider,
                'mode' => $mode,
                'status' => $data['status'],
                'is_default' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return ApiResponse::ok($this->rows($storeId));
    }

    public function credentials(Request $request, string $provider): JsonResponse
    {
        if ($request->session()->get('impersonator_id')) {
            return ApiResponse::error('impersonation.denied', 'Payment keys are blocked while viewing a store.', 403);
        }
        if (! in_array($provider, self::PREPAID, true)) {
            return ApiResponse::error('validation.failed', 'That gateway does not take keys.', 422);
        }
        $data = $request->validate([
            'key_id' => ['required', 'string', 'max:120'],
            'key_secret' => ['required', 'string', 'min:8', 'max:200'],
            'mode' => ['nullable', 'in:test,live'],
            'config' => ['nullable', 'array'],
        ]);
        if (($data['mode'] ?? 'test') === 'live') {
            return ApiResponse::error('validation.failed', 'Live keys are not accepted yet. Save test keys.', 422);
        }
        $storeId = $this->defaultStoreId($request);
        if (! $storeId) {
            return ApiResponse::error('resource.not_found', 'Store not found.', 404);
        }
        $ciphertext = Crypt::encryptString(json_encode([
            'key_id' => $data['key_id'],
            'key_secret' => $data['key_secret'],
            'config' => $data['config'] ?? [],
        ]));
        $existing = DB::table('payment_gateways')->where('store_id', $storeId)->where('provider', $provider)->where('mode', 'test')->first();
        if ($existing) {
            DB::table('payment_gateways')->where('id', $existing->id)->update([
                'credentials_ciphertext' => $ciphertext,
                'updated_at' => now(),
            ]);
        } else {
            DB::table('payment_gateways')->insert([
                'id' => (string) Str::uuid7(),
                'tenant_id' => $request->session()->get('tenant_id'),
                'store_id' => $storeId,
                'provider' => $provider,
                'mode' => 'test',
                'credentials_ciphertext' => $ciphertext,
                'status' => 'disabled',
                'is_default' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
        if (! empty($data['config']) && is_array($data['config'])) {
            $storeModel = Store::query()->find($storeId);
            if ($storeModel) {
                $settings = $storeModel->settings ?? [];
                $gwConfigs = is_array($settings['gateway_configs'] ?? null) ? $settings['gateway_configs'] : [];
                $gwConfigs[$provider] = array_merge($gwConfigs[$provider] ?? [], $data['config'], ['key_id_hint' => substr($data['key_id'], 0, 8).'••••']);
                $settings['gateway_configs'] = $gwConfigs;
                $storeModel->settings = $settings;
                $storeModel->save();
            }
        }
        AuditLog::write((string) $request->session()->get('tenant_id'), $request->user()->id, 'gateway.credentials_saved', $storeId);

        return ApiResponse::ok($this->rows($storeId));
    }

    public function publicIndex(string $slug): JsonResponse
    {
        $store = Store::resolvePublic($slug);
        if (! $store) {
            return ApiResponse::error('resource.not_found', 'Store not found.', 404);
        }
        $providers = DB::table('payment_gateways')
            ->where('store_id', $store->id)
            ->where('status', 'active')
            ->pluck('provider');

        return ApiResponse::ok($providers);
    }

    /**
     * @return list<array{provider: string, status: string, mode: string, has_credentials: bool, config?: array<string, mixed>}>
     */
    private function rows(string $storeId): array
    {
        $saved = DB::table('payment_gateways')->where('store_id', $storeId)->get();
        $storeModel = Store::query()->find($storeId);
        $gwConfigs = is_array($storeModel?->settings['gateway_configs'] ?? null) ? $storeModel->settings['gateway_configs'] : [];
        $rows = [];
        foreach ([...self::OFFLINE, ...self::PREPAID] as $provider) {
            $wanted = in_array($provider, self::PREPAID, true) ? 'test' : 'live';
            $row = $saved->first(fn ($item) => $item->provider === $provider && $item->mode === $wanted);
            $rows[] = [
                'provider' => $provider,
                'status' => $row !== null ? $row->status : 'disabled',
                'mode' => $row !== null ? $row->mode : (in_array($provider, self::PREPAID, true) ? 'test' : 'live'),
                'has_credentials' => $row !== null && $row->credentials_ciphertext !== null,
                'config' => $gwConfigs[$provider] ?? [],
            ];
        }

        return $rows;
    }

    private function defaultStoreId(Request $request): ?string
    {
        return DB::table('stores')
            ->where('tenant_id', $request->session()->get('tenant_id'))
            ->where('is_default', true)
            ->value('id');
    }
}
