<?php

namespace App\Modules\Inventory\Http\Controllers;

use App\Modules\Inventory\Actions\ReceivePurchase;
use App\Modules\Tenancy\Models\Store;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class PurchaseController
{
    public function __construct(private ReceivePurchase $purchases)
    {
    }

    public function suppliers(Request $request): JsonResponse
    {
        $rows = DB::table('suppliers')
            ->where('tenant_id', $request->session()->get('tenant_id'))
            ->whereNull('deleted_at')
            ->orderBy('name')
            ->get(['id', 'name', 'phone', 'gstin']);

        return ApiResponse::ok($rows);
    }

    public function receive(Request $request, string $store): JsonResponse
    {
        $model = $this->store($request, $store);
        if ($model instanceof JsonResponse) {
            return $model;
        }
        $data = $request->validate([
            'supplier_name' => ['required', 'string', 'max:160'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.store_item_id' => ['required', 'uuid'],
            'lines.*.qty' => ['required', 'numeric', 'gt:0'],
            'lines.*.cost_paise' => ['required', 'integer', 'min:0'],
            'lines.*.expires_on' => ['nullable', 'date'],
        ]);

        try {
            $result = $this->purchases->createAndReceive($model, $data['supplier_name'], $data['lines']);
        } catch (RuntimeException $e) {
            return ApiResponse::error('validation.failed', $e->getMessage(), 422);
        }

        return ApiResponse::ok($result, 201);
    }

    public function transfers(Request $request, string $store): JsonResponse
    {
        $model = $this->store($request, $store);
        if ($model instanceof JsonResponse) {
            return $model;
        }

        $transfers = DB::table('stock_transfers')
            ->where('tenant_id', $model->tenant_id)
            ->where(function ($q) use ($model) {
                $q->where('from_store_id', $model->id)
                  ->orWhere('to_store_id', $model->id);
            })
            ->orderByDesc('created_at')
            ->limit(50)
            ->get();

        $storeMap = DB::table('stores')
            ->where('tenant_id', $model->tenant_id)
            ->pluck('name', 'id');

        $transferIds = $transfers->pluck('id');
        $lines = DB::table('stock_transfer_lines')
            ->whereIn('transfer_id', $transferIds)
            ->get();

        $storeItems = DB::table('store_items')
            ->whereIn('id', $lines->pluck('store_item_id'))
            ->get()
            ->keyBy('id');

        $result = $transfers->map(function ($tr) use ($lines, $storeItems, $storeMap, $model) {
            $trLines = $lines->where('transfer_id', $tr->id)->values()->map(function ($l) use ($storeItems) {
                $item = $storeItems->get($l->store_item_id);
                return [
                    'id' => $l->id,
                    'store_item_id' => $l->store_item_id,
                    'item_name' => $item?->name_override ?: ($item?->sku ?? 'Item'),
                    'sku' => $item?->sku ?? '',
                    'dispatched_qty' => (float) $l->qty,
                    'received_qty' => $l->received_qty !== null ? (float) $l->received_qty : null,
                    'variance_qty' => (float) ($l->variance_qty ?? 0),
                ];
            });

            return [
                'id' => $tr->id,
                'transfer_number' => $tr->transfer_number ?: ('TR-' . substr($tr->id, 0, 8)),
                'from_store_id' => $tr->from_store_id,
                'from_store_name' => $storeMap[$tr->from_store_id] ?? 'Source Branch',
                'to_store_id' => $tr->to_store_id,
                'to_store_name' => $storeMap[$tr->to_store_id] ?? 'Destination Branch',
                'is_incoming' => $tr->to_store_id === $model->id,
                'status' => $tr->status,
                'dispatched_at' => $tr->dispatched_at ?: $tr->created_at,
                'received_at' => $tr->received_at,
                'variance_notes' => $tr->variance_notes,
                'lines' => $trLines,
                'created_at' => $tr->created_at,
            ];
        });

        return ApiResponse::ok($result);
    }

    public function transfer(Request $request, string $store): JsonResponse
    {
        $model = $this->store($request, $store);
        if ($model instanceof JsonResponse) {
            return $model;
        }
        $data = $request->validate([
            'to_store_id' => ['required', 'uuid'],
            'store_item_id' => ['nullable', 'uuid'],
            'qty' => ['nullable', 'numeric', 'gt:0'],
            'lines' => ['nullable', 'array', 'min:1'],
            'lines.*.store_item_id' => ['required_with:lines', 'uuid'],
            'lines.*.qty' => ['required_with:lines', 'numeric', 'gt:0'],
            'auto_receive' => ['nullable', 'boolean'],
        ]);

        $lines = $data['lines'] ?? null;
        $singleItemId = $data['store_item_id'] ?? ($lines[0]['store_item_id'] ?? null);
        $singleQty = (float) ($data['qty'] ?? ($lines[0]['qty'] ?? 1));

        if (! $singleItemId && empty($lines)) {
            return ApiResponse::error('validation.failed', 'At least one item is required for transfer.', 422);
        }

        try {
            $result = $this->purchases->transfer(
                $model,
                $data['to_store_id'],
                $singleItemId,
                $singleQty,
                (bool) ($data['auto_receive'] ?? false),
                $lines
            );
        } catch (RuntimeException $e) {
            $status = $e->getMessage() === 'resource.not_found' ? 404 : 422;

            return ApiResponse::error('validation.failed', $e->getMessage(), $status);
        }

        return ApiResponse::ok($result, 201);
    }

    public function receiveTransfer(Request $request, string $store, string $transfer): JsonResponse
    {
        $model = $this->store($request, $store);
        if ($model instanceof JsonResponse) {
            return $model;
        }

        $data = $request->validate([
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.line_id' => ['required', 'uuid'],
            'lines.*.received_qty' => ['required', 'numeric', 'min:0'],
            'variance_notes' => ['nullable', 'string', 'max:500'],
        ]);

        try {
            $result = $this->purchases->receiveTransfer(
                $model,
                $transfer,
                $data['lines'],
                $data['variance_notes'] ?? null
            );
        } catch (RuntimeException $e) {
            $status = $e->getMessage() === 'resource.not_found' ? 404 : 422;
            return ApiResponse::error('validation.failed', $e->getMessage(), $status);
        }

        return ApiResponse::ok($result);
    }

    public function autoPo(Request $request, string $store): JsonResponse
    {
        $model = $this->store($request, $store);
        if ($model instanceof JsonResponse) {
            return $model;
        }

        $proposal = $this->purchases->generateAutoPo($model);
        return ApiResponse::ok($proposal);
    }

    public function count(Request $request, string $store): JsonResponse
    {
        $model = $this->store($request, $store);
        if ($model instanceof JsonResponse) {
            return $model;
        }
        $data = $request->validate([
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.store_item_id' => ['required', 'uuid'],
            'lines.*.counted_qty' => ['required', 'numeric', 'min:0'],
        ]);
        try {
            $result = $this->purchases->count($model, $data['lines']);
        } catch (RuntimeException $e) {
            $status = $e->getMessage() === 'conflict.insufficient_stock' ? 409 : 422;
            $message = $e->getMessage() === 'conflict.insufficient_stock'
                ? 'The count is below stock already reserved for orders.'
                : $e->getMessage();

            return ApiResponse::error($e->getMessage() === 'conflict.insufficient_stock' ? 'conflict.insufficient_stock' : 'validation.failed', $message, $status);
        }

        return ApiResponse::ok($result, 201);
    }

    public function purchaseReturn(Request $request, string $store): JsonResponse
    {
        $model = $this->store($request, $store);
        if ($model instanceof JsonResponse) {
            return $model;
        }
        $data = $request->validate([
            'supplier_id' => ['required', 'uuid'],
            'store_item_id' => ['required', 'uuid'],
            'qty' => ['required', 'numeric', 'gt:0'],
            'cost_paise' => ['required', 'integer', 'min:0'],
        ]);
        try {
            $result = $this->purchases->returnToSupplier($model, $data['supplier_id'], $data['store_item_id'], (float) $data['qty'], (int) $data['cost_paise']);
        } catch (RuntimeException $e) {
            if ($e->getMessage() === 'resource.not_found') {
                return ApiResponse::error('resource.not_found', 'Supplier or item not found.', 404);
            }
            if ($e->getMessage() === 'conflict.insufficient_stock') {
                return ApiResponse::error('conflict.insufficient_stock', 'Not enough free stock to return.', 409);
            }

            return ApiResponse::error('validation.failed', $e->getMessage(), 422);
        }

        return ApiResponse::ok($result, 201);
    }

    public function paySupplier(Request $request, string $store): JsonResponse
    {
        $model = $this->store($request, $store);
        if ($model instanceof JsonResponse) {
            return $model;
        }
        $data = $request->validate([
            'supplier_id' => ['required', 'uuid'],
            'amount_paise' => ['required', 'integer', 'min:1'],
            'note' => ['nullable', 'string', 'max:160'],
        ]);
        try {
            $result = $this->purchases->paySupplier($model, $data['supplier_id'], (int) $data['amount_paise'], $data['note'] ?? null);
        } catch (RuntimeException $e) {
            if ($e->getMessage() === 'resource.not_found') {
                return ApiResponse::error('resource.not_found', 'Supplier not found.', 404);
            }
            if ($e->getMessage() === 'supplier.overpay') {
                return ApiResponse::error('supplier.overpay', 'That payment is more than the amount due.', 422);
            }

            return ApiResponse::error('validation.failed', $e->getMessage(), 422);
        }

        return ApiResponse::ok($result, 201);
    }

    public function alerts(Request $request, string $store): JsonResponse
    {
        $model = $this->store($request, $store);
        if ($model instanceof JsonResponse) {
            return $model;
        }
        $rows = DB::table('stock_balances')
            ->join('store_items', 'store_items.id', '=', 'stock_balances.store_item_id')
            ->where('stock_balances.store_id', $model->id)
            ->whereRaw('(stock_balances.on_hand - stock_balances.reserved) <= store_items.reorder_point')
            ->get(['store_items.id', 'store_items.sku', 'store_items.name_override', 'stock_balances.on_hand', 'store_items.reorder_point']);

        return ApiResponse::ok($rows);
    }

    public function expiry(Request $request, string $store): JsonResponse
    {
        $model = $this->store($request, $store);
        if ($model instanceof JsonResponse) {
            return $model;
        }
        $days = max(1, (int) $request->query('within_days', 30));
        $rows = DB::table('goods_receipt_lines')
            ->join('goods_receipts', 'goods_receipts.id', '=', 'goods_receipt_lines.goods_receipt_id')
            ->join('store_items', 'store_items.id', '=', 'goods_receipt_lines.store_item_id')
            ->where('goods_receipts.store_id', $model->id)
            ->whereNotNull('goods_receipt_lines.expires_on')
            ->where('goods_receipt_lines.expires_on', '<=', now()->addDays($days)->toDateString())
            ->orderBy('goods_receipt_lines.expires_on')
            ->get(['store_items.id', 'store_items.sku', 'store_items.name_override', 'goods_receipt_lines.expires_on', 'goods_receipt_lines.qty']);

        return ApiResponse::ok($rows);
    }

    private function store(Request $request, string $storeId): Store|JsonResponse
    {
        $store = Store::query()->find($storeId);
        if (! $store || $store->tenant_id !== $request->session()->get('tenant_id')) {
            return ApiResponse::error('resource.not_found', 'Store not found.', 404);
        }

        return $store;
    }
}
