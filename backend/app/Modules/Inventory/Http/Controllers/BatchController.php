<?php

namespace App\Modules\Inventory\Http\Controllers;

use App\Modules\Inventory\Models\StoreItem;
use App\Services\BatchManagementService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BatchController
{
    public function __construct(private BatchManagementService $batchService)
    {
    }

    public function index(Request $request, string $item): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');

        $storeItem = StoreItem::where('tenant_id', $tenantId)->findOrFail($item);

        $batches = DB::table('stock_batches')
            ->where('tenant_id', $tenantId)
            ->where('store_item_id', $storeItem->id)
            ->orderBy('expiry_date', 'asc')
            ->get();

        return ApiResponse::ok($batches);
    }

    public function store(Request $request, string $item): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $storeItem = StoreItem::where('tenant_id', $tenantId)->findOrFail($item);

        $data = $request->validate([
            'batch_number' => ['required', 'string', 'max:100'],
            'manufacturing_date' => ['nullable', 'date'],
            'expiry_date' => ['nullable', 'date', 'after_or_equal:manufacturing_date'],
            'supplier_id' => ['nullable', 'uuid'],
            'purchase_id' => ['nullable', 'uuid'],
            'qty' => ['required', 'numeric', 'min:0.001'],
            'cost_paise' => ['nullable', 'integer', 'min:0'],
        ]);

        $batchId = $this->batchService->createBatch($storeItem, $data);

        $batch = DB::table('stock_batches')->where('id', $batchId)->first();

        return ApiResponse::ok($batch, 201);
    }

    public function expiring(Request $request): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $days = (int) $request->query('days', 30);

        $batches = $this->batchService->checkNearExpiry($tenantId, $days);

        return ApiResponse::ok($batches);
    }

    public function markExpired(Request $request, string $batch): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');

        $record = DB::table('stock_batches')
            ->where('tenant_id', $tenantId)
            ->where('id', $batch)
            ->first();

        if (! $record) {
            return ApiResponse::error('batch.not_found', 'Batch not found.', 404);
        }

        DB::table('stock_batches')
            ->where('id', $batch)
            ->update([
                'status' => 'expired',
                'updated_at' => now(),
            ]);

        $updated = DB::table('stock_batches')->where('id', $batch)->first();

        return ApiResponse::ok($updated);
    }
}
