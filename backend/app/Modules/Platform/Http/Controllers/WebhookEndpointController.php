<?php

namespace App\Modules\Platform\Http\Controllers;

use App\Modules\Plans\Support\Entitlement;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class WebhookEndpointController
{
    public function __construct(private Entitlement $entitlements)
    {
    }

    public function store(Request $request): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        if (! $this->entitlements->allows($tenantId, 'module.webhooks')) {
            return ApiResponse::error('entitlement.module_disabled', 'Webhooks are not on this plan.', 403);
        }
        $data = $request->validate([
            'url' => ['required', 'url', 'max:300'],
        ]);
        if ($this->isPrivate($data['url'])) {
            return ApiResponse::error('validation.failed', 'That webhook address is not allowed.', 422);
        }
        $id = (string) Str::uuid7();
        DB::table('webhook_endpoints')->insert([
            'id' => $id,
            'tenant_id' => $tenantId,
            'url' => $data['url'],
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return ApiResponse::ok(['id' => $id, 'url' => $data['url']], 201);
    }

    private function isPrivate(string $url): bool
    {
        $host = parse_url($url, PHP_URL_HOST);
        if (! is_string($host) || $host === '') {
            return true;
        }
        $host = strtolower($host);
        if (in_array($host, ['localhost', 'metadata.google.internal'], true)) {
            return true;
        }
        $ip = filter_var($host, FILTER_VALIDATE_IP) ? $host : gethostbyname($host);
        if ($ip === $host && ! filter_var($host, FILTER_VALIDATE_IP)) {
            return true;
        }

        return filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false;
    }
}
