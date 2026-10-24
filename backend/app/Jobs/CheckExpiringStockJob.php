<?php

namespace App\Jobs;

use App\Modules\Tenancy\Models\Tenant;
use App\Services\BatchManagementService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CheckExpiringStockJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(BatchManagementService $batchService): void
    {
        // 1. Mark expired batches
        $batchService->markExpired();

        // 2. Check near expiry per tenant
        Tenant::eachTenant(function (Tenant $tenant) use ($batchService) {
            $nearExpiry = $batchService->checkNearExpiry($tenant->id, 30);
            if ($nearExpiry->isEmpty()) {
                return;
            }

            $itemsPayload = $nearExpiry->map(fn ($b) => [
                'batch_id' => $b->id,
                'store_item_id' => $b->store_item_id,
                'sku' => $b->sku,
                'name' => $b->name_override ?: $b->sku,
                'batch_number' => $b->batch_number,
                'expiry_date' => $b->expiry_date,
                'qty_remaining' => (float) $b->qty_remaining,
            ])->values()->all();

            DB::table('stock_alerts')->insert([
                'id' => (string) Str::uuid7(),
                'tenant_id' => $tenant->id,
                'store_id' => null,
                'alert_type' => 'expiring_stock',
                'item_count' => count($itemsPayload),
                'items' => json_encode($itemsPayload),
                'acknowledged_at' => null,
                'acknowledged_by' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        });
    }
}
