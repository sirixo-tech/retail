<?php

namespace App\Modules\Ai\Http\Controllers;

use App\Modules\Plans\Support\Entitlement;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportAnswerController
{
    public function __construct(private Entitlement $entitlements)
    {
    }

    public function ask(Request $request): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        if (! $this->entitlements->allows($tenantId, 'module.ai_reports') && $this->entitlements->value($tenantId, 'limit.ai_credits_per_month') <= 0) {
            return ApiResponse::error('entitlement.module_disabled', 'AI reports are not on this plan.', 403);
        }
        $data = $request->validate([
            'question' => ['required', 'string', 'max:240'],
        ]);
        if (preg_match('/\b(select|insert|update|delete|drop|alter)\b/i', $data['question'])) {
            return ApiResponse::error('ai.refused', 'That question cannot be answered.', 422);
        }
        $enabled = DB::table('platform_settings')->value('ai_enabled');
        if ($enabled !== null && ! (int) $enabled) {
            return ApiResponse::error('ai.disabled', 'AI reports are switched off.', 403);
        }
        $total = (int) DB::table('sales')
            ->where('tenant_id', $tenantId)
            ->where('status', '!=', 'voided')
            ->where('created_at', '>=', now()->startOfDay())
            ->sum('total_paise');
        $rupees = number_format($total / 100, 2, '.', '');

        return ApiResponse::ok([
            'answer' => "Sales so far today are INR {$rupees}.",
            'citation' => 'Completed bills dated today',
        ]);
    }

    public function save(Request $request): JsonResponse
    {
        $data = $request->validate([
            'question' => ['required', 'string', 'max:240'],
            'answer' => ['required', 'string', 'max:240'],
            'citation' => ['required', 'string', 'max:160'],
        ]);
        $id = (string) \Illuminate\Support\Str::uuid7();
        DB::table('saved_reports')->insert([
            'id' => $id,
            'tenant_id' => $request->session()->get('tenant_id'),
            'question' => $data['question'],
            'answer' => $data['answer'],
            'citation' => $data['citation'],
            'created_at' => now(),
        ]);

        return ApiResponse::ok(['id' => $id], 201);
    }

    public function saved(Request $request): JsonResponse
    {
        $rows = DB::table('saved_reports')
            ->where('tenant_id', $request->session()->get('tenant_id'))
            ->orderByDesc('created_at')
            ->limit(20)
            ->get(['id', 'question', 'answer', 'citation']);

        return ApiResponse::ok($rows);
    }

    public function kill(Request $request): JsonResponse
    {
        $data = $request->validate(['enabled' => ['required', 'boolean']]);
        $row = DB::table('platform_settings')->first();
        if ($row) {
            DB::table('platform_settings')->where('id', $row->id)->update([
                'ai_enabled' => $data['enabled'],
                'updated_at' => now(),
            ]);
        } else {
            DB::table('platform_settings')->insert([
                'id' => (string) \Illuminate\Support\Str::uuid7(),
                'ai_enabled' => $data['enabled'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return ApiResponse::ok(['enabled' => (bool) $data['enabled']]);
    }

    public function storePage(Request $request): JsonResponse
    {
        $data = $request->validate([
            'slug' => ['required', 'string', 'max:80', 'regex:/^[a-z0-9-]+$/'],
            'title' => ['required', 'string', 'max:120'],
            'body' => ['required', 'string', 'max:4000'],
        ]);
        if (DB::table('cms_pages')->where('slug', $data['slug'])->exists()) {
            return ApiResponse::error('conflict.duplicate', 'That page address is already used.', 422);
        }
        $id = (string) \Illuminate\Support\Str::uuid7();
        DB::table('cms_pages')->insert([
            'id' => $id,
            'tenant_id' => null,
            'slug' => $data['slug'],
            'title' => $data['title'],
            'body' => $data['body'],
            'status' => 'published',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return ApiResponse::ok(['id' => $id, 'slug' => $data['slug']], 201);
    }
}
