<?php

namespace App\Modules\Platform\Http\Controllers;

use App\Modules\Plans\Support\Entitlement;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ApiKeyController
{
    public function __construct(private Entitlement $entitlements)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        if (! $this->entitlements->allows($tenantId, 'module.api_keys')) {
            return ApiResponse::error('entitlement.module_disabled', 'API keys are not on this plan.', 403);
        }
        $rows = DB::table('api_keys')
            ->where('tenant_id', $tenantId)
            ->orderByDesc('created_at')
            ->get(['id', 'name', 'prefix', 'revoked_at', 'created_at']);

        return ApiResponse::ok($rows);
    }

    public function store(Request $request): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        if (! $this->entitlements->allows($tenantId, 'module.api_keys')) {
            return ApiResponse::error('entitlement.module_disabled', 'API keys are not on this plan.', 403);
        }
        $data = $request->validate(['name' => ['required', 'string', 'max:80']]);

        return ApiResponse::ok($this->issue($tenantId, $data['name']), 201);
    }

    public function rotate(Request $request, string $key): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        if (! $this->entitlements->allows($tenantId, 'module.api_keys')) {
            return ApiResponse::error('entitlement.module_disabled', 'API keys are not on this plan.', 403);
        }
        $row = DB::table('api_keys')->where('id', $key)->where('tenant_id', $tenantId)->whereNull('revoked_at')->first();
        if (! $row) {
            return ApiResponse::error('resource.not_found', 'API key not found.', 404);
        }
        DB::table('api_keys')->where('id', $row->id)->update(['revoked_at' => now(), 'updated_at' => now()]);

        return ApiResponse::ok($this->issue($tenantId, $row->name), 201);
    }

    public function items(Request $request): JsonResponse
    {
        $header = (string) $request->header('Authorization', '');
        $token = str_starts_with($header, 'Bearer ') ? trim(substr($header, 7)) : '';
        $row = $token === '' ? null : DB::table('api_keys')->where('key_hash', hash('sha256', $token))->whereNull('revoked_at')->first();
        if (! $row) {
            return ApiResponse::error('auth.invalid_key', 'That API key is not valid.', 401);
        }
        $items = DB::table('store_items')
            ->where('tenant_id', $row->tenant_id)
            ->whereNull('deleted_at')
            ->orderBy('sku')
            ->limit(100)
            ->get(['id', 'sku', 'name_override']);

        return ApiResponse::ok($items);
    }

    /**
     * @return array{id: string, name: string, prefix: string, token: string}
     */
    private function issue(string $tenantId, string $name): array
    {
        $token = 'sx_'.Str::random(40);
        $id = (string) Str::uuid7();
        DB::table('api_keys')->insert([
            'id' => $id,
            'tenant_id' => $tenantId,
            'name' => $name,
            'prefix' => substr($token, 0, 8),
            'key_hash' => hash('sha256', $token),
            'revoked_at' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return ['id' => $id, 'name' => $name, 'prefix' => substr($token, 0, 8), 'token' => $token];
    }
}
