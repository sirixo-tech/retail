<?php

namespace App\Modules\Inventory\Http\Controllers;

use App\Modules\Catalog\Models\Product;
use App\Modules\Inventory\Actions\ReceivePurchase;
use App\Modules\Inventory\Models\StoreItem;
use App\Modules\Tenancy\Models\Store;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class PurchaseController
{
    public function __construct(private ReceivePurchase $purchases)
    {
    }

    public function suppliers(Request $request): JsonResponse
    {
        $tenantId = $request->session()->get('tenant_id') ?? $request->user()?->tenant_id;
        if (! $tenantId) {
            return ApiResponse::error('auth.unauthorized', 'Tenant not found.', 401);
        }

        $rows = DB::table('suppliers')
            ->where('tenant_id', $tenantId)
            ->whereNull('deleted_at')
            ->orderBy('name')
            ->get(['id', 'name', 'phone', 'email', 'gstin', 'address']);

        $balances = DB::table('supplier_ledger_entries')
            ->where('tenant_id', $tenantId)
            ->groupBy('supplier_id', 'direction')
            ->selectRaw('supplier_id, direction, sum(amount_paise) as total')
            ->get()
            ->groupBy('supplier_id');

        $enriched = $rows->map(function ($s) use ($balances) {
            $entries = $balances->get($s->id, collect());
            $credits = (int) ($entries->firstWhere('direction', 'credit')?->total ?? 0);
            $debits = (int) ($entries->firstWhere('direction', 'debit')?->total ?? 0);
            $s->balance_paise = max(0, $credits - $debits);
            return $s;
        });

        return ApiResponse::ok($enriched);
    }

    public function storeSupplier(Request $request): JsonResponse
    {
        $tenantId = $request->session()->get('tenant_id') ?? $request->user()?->tenant_id;
        if (! $tenantId) {
            return ApiResponse::error('auth.unauthorized', 'Tenant not found.', 401);
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:160'],
            'phone' => ['nullable', 'string', 'max:25'],
            'email' => ['nullable', 'email', 'max:160'],
            'gstin' => ['nullable', 'string', 'max:20'],
            'address' => ['nullable', 'string', 'max:500'],
        ]);

        $id = (string) Str::uuid7();
        DB::table('suppliers')->insert([
            'id' => $id,
            'tenant_id' => $tenantId,
            'name' => $data['name'],
            'phone' => $data['phone'] ?? null,
            'email' => $data['email'] ?? null,
            'gstin' => $data['gstin'] ?? null,
            'address' => $data['address'] ?? null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $created = DB::table('suppliers')->where('id', $id)->first();
        return ApiResponse::ok($created, 201);
    }

    public function index(Request $request): JsonResponse
    {
        $tenantId = $request->session()->get('tenant_id') ?? $request->user()?->tenant_id;
        if (! $tenantId) {
            return ApiResponse::error('auth.unauthorized', 'Tenant not found.', 401);
        }

        $filters = [
            'store_id' => $request->query('store_id'),
            'supplier_id' => $request->query('supplier_id'),
            'status' => $request->query('status'),
            'payment_status' => $request->query('payment_status'),
            'search' => $request->query('search'),
            'date_from' => $request->query('date_from'),
            'date_to' => $request->query('date_to'),
        ];

        $data = $this->purchases->listPurchases($tenantId, $filters);
        return ApiResponse::ok($data);
    }

    public function storePurchase(Request $request): JsonResponse
    {
        $tenantId = $request->session()->get('tenant_id') ?? $request->user()?->tenant_id;
        if (! $tenantId) {
            return ApiResponse::error('auth.unauthorized', 'Tenant not found.', 401);
        }

        $data = $request->validate([
            'store_id' => ['required', 'uuid'],
            'supplier_id' => ['required', 'uuid'],
            'status' => ['required', 'string', 'in:received,pending,ordered'],
            'date' => ['nullable', 'date'],
            'order_tax_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'order_tax_paise' => ['nullable', 'integer', 'min:0'],
            'discount_paise' => ['nullable', 'integer', 'min:0'],
            'shipping_paise' => ['nullable', 'integer', 'min:0'],
            'paid_paise' => ['nullable', 'integer', 'min:0'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.store_item_id' => ['required', 'uuid'],
            'lines.*.qty' => ['required', 'numeric', 'gt:0'],
            'lines.*.cost_paise' => ['required', 'integer', 'min:0'],
            'lines.*.discount_paise' => ['nullable', 'integer', 'min:0'],
            'lines.*.tax_bps' => ['nullable', 'integer', 'min:0'],
            'lines.*.batch_number' => ['nullable', 'string', 'max:50'],
            'lines.*.expires_on' => ['nullable', 'date'],
        ]);

        $store = Store::query()->where('id', $data['store_id'])->where('tenant_id', $tenantId)->first();
        if (! $store) {
            return ApiResponse::error('resource.not_found', 'Store not found.', 404);
        }

        try {
            $result = $this->purchases->createPurchase($store, $data);
        } catch (RuntimeException $e) {
            return ApiResponse::error('validation.failed', $e->getMessage(), 422);
        }

        return ApiResponse::ok($result, 201);
    }

    public function showPurchase(Request $request, string $purchase): JsonResponse
    {
        $tenantId = $request->session()->get('tenant_id') ?? $request->user()?->tenant_id;
        if (! $tenantId) {
            return ApiResponse::error('auth.unauthorized', 'Tenant not found.', 401);
        }

        $details = $this->purchases->getPurchaseDetails($tenantId, $purchase);
        if (! $details) {
            return ApiResponse::error('resource.not_found', 'Purchase order not found.', 404);
        }

        return ApiResponse::ok($details);
    }

    public function recordPayment(Request $request, string $purchase): JsonResponse
    {
        $tenantId = $request->session()->get('tenant_id') ?? $request->user()?->tenant_id;
        if (! $tenantId) {
            return ApiResponse::error('auth.unauthorized', 'Tenant not found.', 401);
        }

        $data = $request->validate([
            'amount_paise' => ['required', 'integer', 'min:1'],
            'payment_method' => ['nullable', 'string', 'in:cash,upi,card,bank_transfer,cheque'],
            'note' => ['nullable', 'string', 'max:255'],
        ]);

        try {
            $result = $this->purchases->recordPurchasePayment(
                $tenantId,
                $purchase,
                (int) $data['amount_paise'],
                $data['payment_method'] ?? 'cash',
                $data['note'] ?? null
            );
        } catch (RuntimeException $e) {
            return ApiResponse::error('validation.failed', $e->getMessage(), 422);
        }

        return ApiResponse::ok($result);
    }

    public function destroyPurchase(Request $request, string $purchase): JsonResponse
    {
        $tenantId = $request->session()->get('tenant_id') ?? $request->user()?->tenant_id;
        if (! $tenantId) {
            return ApiResponse::error('auth.unauthorized', 'Tenant not found.', 401);
        }

        try {
            $this->purchases->deletePurchase($tenantId, $purchase);
        } catch (RuntimeException $e) {
            return ApiResponse::error('validation.failed', $e->getMessage(), 422);
        }

        return ApiResponse::ok(['success' => true]);
    }

    public function importPurchases(Request $request): JsonResponse
    {
        $tenantId = $request->session()->get('tenant_id') ?? $request->user()?->tenant_id;
        if (! $tenantId) {
            return ApiResponse::error('auth.unauthorized', 'Tenant not found.', 401);
        }

        $data = $request->validate([
            'store_id' => ['required', 'uuid'],
            'supplier_id' => ['required', 'uuid'],
            'status' => ['required', 'string', 'in:received,pending,ordered'],
            'notes' => ['nullable', 'string', 'max:500'],
            'rows' => ['required', 'array', 'min:1'],
            'rows.*.product_identifier' => ['required', 'string'],
            'rows.*.cost_paise' => ['required', 'integer', 'min:0'],
            'rows.*.qty' => ['required', 'numeric', 'gt:0'],
            'rows.*.discount_paise' => ['nullable', 'integer', 'min:0'],
            'rows.*.tax_bps' => ['nullable', 'integer', 'min:0'],
            'rows.*.batch_number' => ['nullable', 'string', 'max:50'],
            'rows.*.expires_on' => ['nullable', 'date'],
        ]);

        $store = Store::query()->where('id', $data['store_id'])->where('tenant_id', $tenantId)->first();
        if (! $store) {
            return ApiResponse::error('resource.not_found', 'Store not found.', 404);
        }

        $storeItems = StoreItem::query()->where('store_id', $store->id)->get();
        $masterIds = $storeItems->pluck('master_product_id')->filter()->unique();
        $products = ! $masterIds->isEmpty()
            ? Product::query()->whereIn('id', $masterIds)->get()->keyBy('id')
            : collect();

        $lines = [];
        $unmatched = [];

        foreach ($data['rows'] as $index => $row) {
            $term = trim(strtolower($row['product_identifier']));
            $match = $storeItems->first(function ($item) use ($term, $products) {
                if (strtolower($item->sku) === $term) return true;
                if ($item->name_override && strtolower($item->name_override) === $term) return true;
                $prod = $products->get($item->master_product_id);
                if ($prod && strtolower($prod->name) === $term) return true;
                return false;
            });

            if (! $match) {
                $match = $storeItems->first(function ($item) use ($term, $products) {
                    if (str_contains(strtolower($item->sku), $term)) return true;
                    if ($item->name_override && str_contains(strtolower($item->name_override), $term)) return true;
                    $prod = $products->get($item->master_product_id);
                    if ($prod && str_contains(strtolower($prod->name), $term)) return true;
                    return false;
                });
            }

            if (! $match) {
                $unmatched[] = "Row #" . ($index + 1) . ": \"" . $row['product_identifier'] . "\" could not be matched to an existing catalog item.";
                continue;
            }

            $lines[] = [
                'store_item_id' => $match->id,
                'qty' => $row['qty'],
                'cost_paise' => $row['cost_paise'],
                'discount_paise' => $row['discount_paise'] ?? 0,
                'tax_bps' => $row['tax_bps'] ?? 0,
                'batch_number' => $row['batch_number'] ?? null,
                'expires_on' => $row['expires_on'] ?? null,
            ];
        }

        if (! empty($unmatched)) {
            return ApiResponse::error('validation.failed', implode('; ', array_slice($unmatched, 0, 5)), 422);
        }

        if (empty($lines)) {
            return ApiResponse::error('validation.failed', 'No valid line items found to import.', 422);
        }

        $purchaseData = [
            'store_id' => $store->id,
            'supplier_id' => $data['supplier_id'],
            'status' => $data['status'],
            'notes' => $data['notes'] ?? 'Imported via CSV batch',
            'lines' => $lines,
        ];

        try {
            $result = $this->purchases->createPurchase($store, $purchaseData);
        } catch (RuntimeException $e) {
            return ApiResponse::error('validation.failed', $e->getMessage(), 422);
        }

        return ApiResponse::ok($result, 201);
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
        if (! $store) {
            return ApiResponse::error('resource.not_found', 'Store not found.', 404);
        }

        if ($request->user()?->kind === 'platform') {
            if ($request->hasSession() && $request->session()->get('tenant_id') !== $store->tenant_id) {
                $request->session()->put('tenant_id', $store->tenant_id);
            }
            return $store;
        }

        if ($store->tenant_id !== $request->session()->get('tenant_id')) {
            return ApiResponse::error('resource.not_found', 'Store not found.', 404);
        }

        return $store;
    }
}
