<?php

namespace App\Modules\Pos\Http\Controllers;

use App\Modules\Tenancy\Models\Store;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TerminalController
{
    public function index(Request $request, string $storeId): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $store = Store::query()->where('id', $storeId)->where('tenant_id', $tenantId)->first();
        if (! $store) {
            return ApiResponse::error('resource.not_found', 'Store not found.', 404);
        }

        $terminals = DB::table('counters')
            ->where('store_id', $store->id)
            ->where('tenant_id', $tenantId)
            ->orderBy('code')
            ->get();

        $rows = $terminals->map(function ($row) use ($store) {
            $isPaired = ! empty($row->paired_at);
            return [
                'id' => $row->id,
                'name' => $row->name,
                'code' => $row->code,
                'status' => $row->status,
                'is_paired' => $isPaired,
                'paired_at' => $row->paired_at,
                'device_name' => $row->device_name ?: ($isPaired ? 'Paired POS Tablet' : null),
                'pairing_code' => $row->pairing_code,
                'pairing_expires_at' => $row->pairing_expires_at,
                'customer_display_url' => (function () use ($row, $store) {
                    $host = request()->header('x-forwarded-host') ?: request()->getHost();
                    if ($host === '127.0.0.1' || $host === 'localhost' || empty($host) || str_starts_with($host, '127.0.0.1') || str_starts_with($host, 'localhost')) {
                        $host = 'retail.sirixo.com';
                    }
                    $scheme = (request()->secure() || request()->header('x-forwarded-proto') === 'https' || !str_contains($host, ':')) ? 'https://' : 'http://';
                    return "{$scheme}{$host}/customer-display?terminal=" . urlencode($row->code) . "&store=" . urlencode($store->public_slug ?: $store->code);
                })(),
                'created_at' => $row->created_at,
            ];
        });

        return ApiResponse::ok([
            'terminals' => $rows,
            'stats' => [
                'total' => $rows->count(),
                'paired' => $rows->filter(fn ($t) => $t['is_paired'])->count(),
                'unpaired' => $rows->filter(fn ($t) => ! $t['is_paired'])->count(),
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

        $data = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'code' => ['nullable', 'string', 'max:20'],
        ]);

        $code = strtoupper(trim($data['code'] ?? ''));
        if ($code === '') {
            $existing = DB::table('counters')->where('store_id', $store->id)->count();
            $code = 'T' . ($existing + 1);
            while (DB::table('counters')->where('store_id', $store->id)->where('code', $code)->exists()) {
                $existing++;
                $code = 'T' . ($existing + 1);
            }
        }

        $id = (string) Str::uuid7();
        DB::table('counters')->insert([
            'id' => $id,
            'store_id' => $store->id,
            'tenant_id' => $tenantId,
            'name' => $data['name'],
            'code' => $code,
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
            'prefix' => $store->code . '-' . $code . '-',
            'next_number' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return ApiResponse::ok(['id' => $id, 'name' => $data['name'], 'code' => $code], 201);
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
        ]);

        $updates = ['updated_at' => now()];
        if (isset($data['name'])) $updates['name'] = $data['name'];
        if (isset($data['code'])) $updates['code'] = strtoupper($data['code']);
        if (isset($data['status'])) $updates['status'] = $data['status'];

        DB::table('counters')->where('id', $counterId)->update($updates);

        return ApiResponse::ok(['id' => $counterId, 'updated' => true]);
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

        // If admin submits a 6-digit code shown on the physical POS tablet:
        if ($pairingCode !== '') {
            $cleaned = preg_replace('/[^0-9]/', '', $pairingCode);
            DB::table('counters')->where('id', $counterId)->update([
                'pairing_code' => $cleaned,
                'paired_at' => now(),
                'device_name' => $deviceName ?: 'POS Tablet (' . $counter->code . ')',
                'device_fingerprint' => 'dev_' . bin2hex(random_bytes(8)),
                'pairing_expires_at' => null,
                'updated_at' => now(),
            ]);

            return ApiResponse::ok([
                'paired' => true,
                'counter_id' => $counterId,
                'device_name' => $deviceName ?: 'POS Tablet (' . $counter->code . ')',
                'paired_at' => now()->toIso8601String(),
            ]);
        }

        // Generate a new 6-digit pairing code that the POS tablet can enter
        $generatedCode = sprintf('%06d', random_int(100000, 999999));
        DB::table('counters')->where('id', $counterId)->update([
            'pairing_code' => $generatedCode,
            'pairing_expires_at' => now()->addMinutes(10),
            'updated_at' => now(),
        ]);

        return ApiResponse::ok([
            'pairing_code' => substr($generatedCode, 0, 3) . '-' . substr($generatedCode, 3, 3),
            'raw_code' => $generatedCode,
            'expires_at' => now()->addMinutes(10)->toIso8601String(),
            'message' => 'Enter this 6-digit code on the POS screen within 10 minutes.',
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

    /* Public endpoints for physical POS companion terminals / tablets */

    public function publicGeneratePairCode(Request $request): JsonResponse
    {
        $code = sprintf('%06d', random_int(100000, 999999));
        $token = 'pair_' . Str::random(32);

        // Save in cache/session for fast lookup
        cache()->put("pos_pair_{$code}", [
            'token' => $token,
            'created_at' => now(),
        ], now()->addMinutes(15));

        return ApiResponse::ok([
            'pairing_code' => substr($code, 0, 3) . '-' . substr($code, 3, 3),
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
                'counters.name as counter_name',
                'counters.code as counter_code',
                'stores.id as store_id',
                'stores.name as store_name',
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
            'counter' => $counter,
        ]);
    }
}
