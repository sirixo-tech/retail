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
    public const PREPAID = ['razorpay', 'phonepe', 'paytm', 'stripe'];

    public function index(Request $request): JsonResponse
    {
        $storeId = $this->defaultStoreId($request);
        if (! $storeId) {
            return ApiResponse::error('resource.not_found', 'Store not found.', 404);
        }

        foreach (self::PREPAID as $provider) {
            $this->reconcileGateway($storeId, $provider);
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
            'config' => ['nullable', 'array'],
        ]);
        $storeId = $this->defaultStoreId($request);
        if (! $storeId) {
            return ApiResponse::error('resource.not_found', 'Store not found.', 404);
        }
        $existing = $this->providerRow($storeId, $provider);
        $mode = $data['mode'] ?? ($existing?->mode ?? (app()->environment('testing') ? 'test' : 'live'));
        if (in_array($provider, self::PREPAID, true) && $data['status'] === 'active' && ! $this->hasCredentials($storeId, $provider)) {
            return ApiResponse::error('validation.failed', 'Save the merchant id and secret before turning this gateway on.', 422);
        }

        if ($existing) {
            DB::table('payment_gateways')->where('id', $existing->id)->update([
                'status' => $data['status'],
                'mode' => $mode,
                'updated_at' => now(),
            ]);
            $this->dropDuplicateGatewayRows($storeId, $provider, (string) $existing->id);
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

        if (isset($data['config']) && is_array($data['config'])) {
            $storeModel = Store::query()->find($storeId);
            if ($storeModel) {
                $settings = $storeModel->settings ?? [];
                $gwConfigs = is_array($settings['gateway_configs'] ?? null) ? $settings['gateway_configs'] : [];
                $gwConfigs[$provider] = array_merge($gwConfigs[$provider] ?? [], $data['config']);
                $settings['gateway_configs'] = $gwConfigs;
                if ($provider === 'upi_qr') {
                    $vpa = trim((string) ($data['config']['upi_vpa'] ?? ''));
                    $payee = trim((string) ($data['config']['payee_name'] ?? ''));
                    if (! isset($settings['online_store']['payments']['upiQr'])) {
                        $settings['online_store']['payments']['upiQr'] = [
                            'enabled' => $data['status'] === 'active',
                            'displayName' => 'Instant UPI QR Payment',
                            'vpa' => $vpa,
                            'merchantName' => $payee,
                        ];
                    } else {
                        $settings['online_store']['payments']['upiQr']['vpa'] = $vpa;
                        if ($payee !== '') {
                            $settings['online_store']['payments']['upiQr']['merchantName'] = $payee;
                        }
                        $settings['online_store']['payments']['upiQr']['enabled'] = ($data['status'] === 'active');
                    }
                } elseif ($provider === 'pay_at_store') {
                    if (isset($settings['online_store']['payments']['payAtStore'])) {
                        $settings['online_store']['payments']['payAtStore']['enabled'] = ($data['status'] === 'active');
                    }
                } elseif ($provider === 'cod') {
                    if (isset($settings['online_store']['payments']['cod'])) {
                        $settings['online_store']['payments']['cod']['enabled'] = ($data['status'] === 'active');
                    }
                }
                $storeModel->settings = $settings;
                $storeModel->save();
            }
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
            'key_secret' => ['nullable', 'string', 'max:200'],
            'mode' => ['nullable', 'in:test,live'],
            'config' => ['nullable', 'array'],
        ]);
        $storeId = $this->defaultStoreId($request);
        if (! $storeId) {
            return ApiResponse::error('resource.not_found', 'Store not found.', 404);
        }
        $existing = $this->providerRow($storeId, $provider);
        $previous = $this->decryptCredentials($existing);
        $secret = trim((string) ($data['key_secret'] ?? ''));
        if ($secret === '') {
            $secret = (string) ($previous['key_secret'] ?? '');
        }
        if (strlen($secret) < 8) {
            return ApiResponse::error('validation.failed', 'Enter the secret key. It must be at least 8 characters.', 422);
        }
        if (app()->environment('testing') && ($data['mode'] ?? null) === 'live') {
            return ApiResponse::error('validation.failed', 'Live keys are not accepted yet. Save test keys.', 422);
        }
        $mode = $data['mode'] ?? ($existing?->mode ?? (app()->environment('testing') ? 'test' : 'live'));
        $ciphertext = Crypt::encryptString(json_encode([
            'key_id' => $data['key_id'],
            'key_secret' => $secret,
            'config' => $data['config'] ?? [],
        ]));
        if ($existing) {
            DB::table('payment_gateways')->where('id', $existing->id)->update([
                'credentials_ciphertext' => $ciphertext,
                'mode' => $mode,
                'updated_at' => now(),
            ]);
            $this->dropDuplicateGatewayRows($storeId, $provider, (string) $existing->id);
        } else {
            DB::table('payment_gateways')->insert([
                'id' => (string) Str::uuid7(),
                'tenant_id' => $request->session()->get('tenant_id'),
                'store_id' => $storeId,
                'provider' => $provider,
                'mode' => $mode,
                'credentials_ciphertext' => $ciphertext,
                'status' => 'disabled',
                'is_default' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
        $storeModel = Store::query()->find($storeId);
        if ($storeModel) {
            $settings = $storeModel->settings ?? [];
            $gwConfigs = is_array($settings['gateway_configs'] ?? null) ? $settings['gateway_configs'] : [];
            $gwConfigs[$provider] = array_merge($gwConfigs[$provider] ?? [], is_array($data['config'] ?? null) ? $data['config'] : [], [
                'key_id' => $data['key_id'],
                'key_id_hint' => substr($data['key_id'], 0, 8).'••••',
            ]);
            unset($gwConfigs[$provider]['key_secret'], $gwConfigs[$provider]['salt_key'], $gwConfigs[$provider]['saltKey']);
            $settings['gateway_configs'] = $gwConfigs;
            $storeModel->settings = $settings;
            $storeModel->save();
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
            $matches = $saved->filter(fn ($item) => $item->provider === $provider);
            $row = $matches->sortByDesc(function ($item) {
                $cred = $item->credentials_ciphertext ? '1' : '0';
                $active = $item->status === 'active' ? '1' : '0';

                return $active.$cred.(string) $item->updated_at;
            })->first();
            $decoded = $this->decryptCredentials($row);
            $config = $gwConfigs[$provider] ?? [];
            unset($config['key_secret'], $config['salt_key'], $config['saltKey']);
            if (! empty($decoded['key_id'])) {
                $config['key_id'] = $decoded['key_id'];
            }
            $rows[] = [
                'provider' => $provider,
                'status' => $row !== null ? $row->status : 'disabled',
                'mode' => $row !== null ? $row->mode : 'live',
                'has_credentials' => $row !== null && $row->credentials_ciphertext !== null,
                'key_id' => $decoded['key_id'] ?? ($config['key_id'] ?? null),
                'config' => $config,
            ];
        }

        return $rows;
    }

    private function defaultStoreId(Request $request): ?string
    {
        $tenantId = $request->session()->get('tenant_id');
        $sessionStore = $request->session()->get('store_id') ?: $request->session()->get('active_store_id');
        if (is_string($sessionStore) && $sessionStore !== '') {
            $owns = DB::table('stores')->where('id', $sessionStore)->where('tenant_id', $tenantId)->exists();
            if ($owns) {
                return $sessionStore;
            }
        }

        return DB::table('stores')->where('tenant_id', $tenantId)->where('is_default', true)->orderBy('created_at')->value('id')
            ?? DB::table('stores')->where('tenant_id', $tenantId)->orderBy('created_at')->value('id');
    }

    private function providerRow(string $storeId, string $provider): ?object
    {
        return DB::table('payment_gateways')
            ->where('store_id', $storeId)
            ->where('provider', $provider)
            ->orderByRaw('CASE WHEN credentials_ciphertext IS NULL THEN 1 ELSE 0 END')
            ->orderByDesc('updated_at')
            ->first();
    }

    private function hasCredentials(string $storeId, string $provider): bool
    {
        return DB::table('payment_gateways')
            ->where('store_id', $storeId)
            ->where('provider', $provider)
            ->whereNotNull('credentials_ciphertext')
            ->exists();
    }

    private function reconcileGateway(string $storeId, string $provider): void
    {
        $rows = DB::table('payment_gateways')->where('store_id', $storeId)->where('provider', $provider)->get();
        if ($rows->count() < 2) {
            return;
        }
        $keep = $rows->sortBy(fn ($row) => $row->credentials_ciphertext ? 0 : 1)->first();
        if (! $keep) {
            return;
        }
        $wasActive = $rows->contains(fn ($row) => $row->status === 'active');
        if ($wasActive && $keep->credentials_ciphertext && $keep->status !== 'active') {
            DB::table('payment_gateways')->where('id', $keep->id)->update([
                'status' => 'active',
                'updated_at' => now(),
            ]);
        }
        $this->dropDuplicateGatewayRows($storeId, $provider, (string) $keep->id);
    }

    private function dropDuplicateGatewayRows(string $storeId, string $provider, string $keepId): void
    {
        DB::table('payment_gateways')
            ->where('store_id', $storeId)
            ->where('provider', $provider)
            ->where('id', '!=', $keepId)
            ->delete();
    }

    /**
     * @return array{key_id?: string, key_secret?: string}
     */
    private function decryptCredentials(?object $row): array
    {
        if (! $row || ! $row->credentials_ciphertext) {
            return [];
        }
        try {
            $decoded = json_decode(Crypt::decryptString($row->credentials_ciphertext), true);
        } catch (\Throwable) {
            return [];
        }

        return is_array($decoded) ? $decoded : [];
    }
}
