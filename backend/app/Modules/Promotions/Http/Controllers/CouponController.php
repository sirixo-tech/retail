<?php

namespace App\Modules\Promotions\Http\Controllers;

use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CouponController
{
    public function index(Request $request): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');

        $rows = DB::table('coupons')
            ->where('tenant_id', $tenantId)
            ->orderBy('code')
            ->get(['id', 'code', 'kind', 'value', 'status', 'max_redemptions', 'redeemed_count', 'expires_at', 'created_at']);

        if ($request->query('with_summary')) {
            $totalCoupons = $rows->count();
            $activeCoupons = $rows->where('status', 'active')->count();
            $totalRedemptions = (int) $rows->sum('redeemed_count');
            $totalDiscountGranted = (int) DB::table('orders')
                ->where('tenant_id', $tenantId)
                ->sum('discount_paise');

            return ApiResponse::ok([
                'items' => $rows,
                'summary' => [
                    'total_coupons' => $totalCoupons,
                    'active_coupons' => $activeCoupons,
                    'total_redemptions' => $totalRedemptions,
                    'total_discount_granted_paise' => $totalDiscountGranted,
                ],
            ]);
        }

        return ApiResponse::ok($rows);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:32'],
            'kind' => ['required', 'in:percent,fixed'],
            'value' => ['required', 'integer', 'min:1'],
            'max_redemptions' => ['nullable', 'integer', 'min:1'],
            'expires_at' => ['nullable', 'date'],
        ]);

        if ($data['kind'] === 'percent' && $data['value'] > 100) {
            return ApiResponse::error('validation.failed', 'A percent coupon cannot be more than 100%.', 422);
        }

        $code = strtoupper(trim($data['code']));
        $tenantId = (string) $request->session()->get('tenant_id');

        if (DB::table('coupons')->where('tenant_id', $tenantId)->where('code', $code)->exists()) {
            return ApiResponse::error('validation.failed', 'That coupon code already exists.', 422);
        }

        $id = (string) Str::uuid7();
        DB::table('coupons')->insert([
            'id' => $id,
            'tenant_id' => $tenantId,
            'code' => $code,
            'kind' => $data['kind'],
            'value' => $data['value'],
            'status' => 'active',
            'max_redemptions' => $data['max_redemptions'] ?? null,
            'redeemed_count' => 0,
            'expires_at' => $data['expires_at'] ?? null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return ApiResponse::ok(['id' => $id, 'code' => $code], 201);
    }

    public function toggle(Request $request, string $id): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $coupon = DB::table('coupons')
            ->where('tenant_id', $tenantId)
            ->where('id', $id)
            ->first();

        if (! $coupon) {
            return ApiResponse::error('not_found', 'Coupon not found.', 404);
        }

        $nextStatus = $coupon->status === 'active' ? 'paused' : 'active';
        DB::table('coupons')
            ->where('tenant_id', $tenantId)
            ->where('id', $id)
            ->update([
                'status' => $nextStatus,
                'updated_at' => now(),
            ]);

        return ApiResponse::ok(['id' => $id, 'status' => $nextStatus]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $deleted = DB::table('coupons')
            ->where('tenant_id', $tenantId)
            ->where('id', $id)
            ->delete();

        if (! $deleted) {
            return ApiResponse::error('not_found', 'Coupon not found.', 404);
        }

        return ApiResponse::ok(['deleted' => true]);
    }
}
