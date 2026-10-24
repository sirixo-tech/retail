<?php

namespace App\Modules\Inventory\Http\Controllers;

use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class StockAlertController
{
    public function index(Request $request): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $query = DB::table('stock_alerts')->where('tenant_id', $tenantId);

        if ($request->has('store_id')) {
            $query->where('store_id', $request->query('store_id'));
        }

        if ($request->has('acknowledged')) {
            $ack = filter_var($request->query('acknowledged'), FILTER_VALIDATE_BOOLEAN);
            if ($ack) {
                $query->whereNotNull('acknowledged_at');
            } else {
                $query->whereNull('acknowledged_at');
            }
        }

        $perPage = min((int) $request->query('per_page', 20), 100);
        $alerts = $query->orderByDesc('created_at')->paginate($perPage);

        $alerts->getCollection()->transform(function ($item) {
            if (is_string($item->items)) {
                $item->items = json_decode($item->items, true);
            }
            return $item;
        });

        return ApiResponse::ok($alerts);
    }

    public function acknowledge(Request $request, string $alert): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $record = DB::table('stock_alerts')
            ->where('tenant_id', $tenantId)
            ->where('id', $alert)
            ->first();

        if (! $record) {
            return ApiResponse::error('stock_alert.not_found', 'Alert not found.', 404);
        }

        $userId = optional($request->user())->id;

        DB::table('stock_alerts')
            ->where('id', $alert)
            ->update([
                'acknowledged_at' => now(),
                'acknowledged_by' => $userId,
            ]);

        $updated = DB::table('stock_alerts')->where('id', $alert)->first();
        if (is_string($updated->items)) {
            $updated->items = json_decode($updated->items, true);
        }

        return ApiResponse::ok($updated);
    }

    public function generatePo(Request $request, string $alert): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $record = DB::table('stock_alerts')
            ->where('tenant_id', $tenantId)
            ->where('id', $alert)
            ->first();

        if (! $record) {
            return ApiResponse::error('stock_alert.not_found', 'Alert not found.', 404);
        }

        $items = is_string($record->items) ? json_decode($record->items, true) : (array) $record->items;

        $poLines = [];
        foreach ($items as $item) {
            $storeItemId = $item['store_item_id'] ?? $item['id'] ?? null;
            $reorderQty = max(1, (int) ($item['reorder_quantity'] ?? 10));

            $poLines[] = [
                'store_item_id' => $storeItemId,
                'sku' => $item['sku'] ?? null,
                'name' => $item['name'] ?? null,
                'suggested_qty' => $reorderQty,
                'current_qty' => $item['current_qty'] ?? 0,
                'reorder_point' => $item['reorder_point'] ?? 0,
            ];
        }

        // Auto acknowledge alert when PO is generated
        DB::table('stock_alerts')
            ->where('id', $alert)
            ->update([
                'acknowledged_at' => now(),
                'acknowledged_by' => optional($request->user())->id,
            ]);

        return ApiResponse::ok([
            'po_number_draft' => 'DRAFT-PO-' . strtoupper(Str::random(6)),
            'store_id' => $record->store_id,
            'lines' => $poLines,
            'message' => 'Purchase order draft created from low stock alert.',
        ]);
    }
}
