<?php

namespace App\Services;

use App\Modules\Inventory\Models\StoreItem;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class BatchManagementService
{
    /**
     * Allocate quantity from batches using FEFO (First Expiring First Out) or FIFO.
     *
     * @return list<array{batch_id: string, qty: float, expiry_date: string|null}>
     */
    public function allocateBatch(StoreItem $item, float $qty, string $method = 'FEFO'): array
    {
        $query = DB::table('stock_batches')
            ->where('store_item_id', $item->id)
            ->where('status', 'active')
            ->where('qty_remaining', '>', 0);

        if ($method === 'FIFO') {
            $query->orderBy('created_at', 'asc');
        } else {
            // FEFO
            $query->orderByRaw('expiry_date ASC NULLS LAST');
        }

        $batches = $query->lockForUpdate()->get();

        $allocated = [];
        $remaining = $qty;

        foreach ($batches as $batch) {
            if ($remaining <= 0) {
                break;
            }

            $batchQty = (float) $batch->qty_remaining;
            $allocate = min($batchQty, $remaining);

            $allocated[] = [
                'batch_id' => $batch->id,
                'qty' => $allocate,
                'expiry_date' => $batch->expiry_date,
            ];

            DB::table('stock_batches')
                ->where('id', $batch->id)
                ->decrement('qty_remaining', $allocate);

            $remaining -= $allocate;
        }

        return $allocated;
    }

    /**
     * Create a new batch.
     */
    public function createBatch(StoreItem $item, array $data): string
    {
        $id = (string) Str::uuid7();

        DB::table('stock_batches')->insert([
            'id' => $id,
            'tenant_id' => $item->tenant_id,
            'store_item_id' => $item->id,
            'batch_number' => $data['batch_number'],
            'manufacturing_date' => $data['manufacturing_date'] ?? null,
            'expiry_date' => $data['expiry_date'] ?? null,
            'supplier_id' => $data['supplier_id'] ?? null,
            'purchase_id' => $data['purchase_id'] ?? null,
            'qty_purchased' => (float) ($data['qty'] ?? $data['qty_purchased'] ?? 0),
            'qty_remaining' => (float) ($data['qty'] ?? $data['qty_remaining'] ?? $data['qty_purchased'] ?? 0),
            'cost_paise' => (int) ($data['cost_paise'] ?? $item->cost_paise ?? 0),
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $id;
    }

    /**
     * Find batches approaching expiry within specified days.
     */
    public function checkNearExpiry(string $tenantId, int $days = 30): Collection
    {
        $cutoff = now()->addDays($days)->toDateString();

        return DB::table('stock_batches')
            ->join('store_items', 'store_items.id', '=', 'stock_batches.store_item_id')
            ->where('stock_batches.tenant_id', $tenantId)
            ->where('stock_batches.status', 'active')
            ->where('stock_batches.qty_remaining', '>', 0)
            ->whereNotNull('stock_batches.expiry_date')
            ->where('stock_batches.expiry_date', '<=', $cutoff)
            ->select([
                'stock_batches.*',
                'store_items.sku',
                'store_items.name_override',
            ])
            ->orderBy('stock_batches.expiry_date', 'asc')
            ->get();
    }

    /**
     * Mark expired batches as expired.
     */
    public function markExpired(): int
    {
        return DB::table('stock_batches')
            ->where('status', 'active')
            ->whereNotNull('expiry_date')
            ->where('expiry_date', '<', now()->toDateString())
            ->update([
                'status' => 'expired',
                'updated_at' => now(),
            ]);
    }
}
