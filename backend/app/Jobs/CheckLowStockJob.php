<?php

namespace App\Jobs;

use App\Modules\Tenancy\Models\Tenant;
use App\Notifications\LowStockAlert;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CheckLowStockJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(): void
    {
        Tenant::eachTenant(function (Tenant $tenant) {
            $lowStockItems = DB::table('store_items')
                ->leftJoin('stock_balances', function ($join) {
                    $join->on('store_items.id', '=', 'stock_balances.store_item_id')
                         ->on('store_items.store_id', '=', 'stock_balances.store_id');
                })
                ->where('store_items.tenant_id', $tenant->id)
                ->where('store_items.track_stock', true)
                ->whereNotNull('store_items.reorder_point')
                ->whereRaw('(COALESCE(stock_balances.on_hand, 0) - COALESCE(stock_balances.reserved, 0)) <= store_items.reorder_point')
                ->select([
                    'store_items.id',
                    'store_items.store_id',
                    'store_items.sku',
                    'store_items.name_override',
                    'store_items.reorder_point',
                    'store_items.cost_paise',
                    DB::raw('(COALESCE(stock_balances.on_hand, 0) - COALESCE(stock_balances.reserved, 0)) as current_qty'),
                ])
                ->get();

            if ($lowStockItems->isEmpty()) {
                return;
            }

            // Group by store
            $byStore = $lowStockItems->groupBy('store_id');

            foreach ($byStore as $storeId => $items) {
                $alertId = (string) Str::uuid7();

                $itemsPayload = $items->map(fn ($it) => [
                    'item_id' => $it->id,
                    'sku' => $it->sku,
                    'name' => $it->name_override ?: $it->sku,
                    'current_qty' => (float) $it->current_qty,
                    'reorder_point' => (float) $it->reorder_point,
                    'cost_paise' => (int) $it->cost_paise,
                ])->values()->all();

                DB::table('stock_alerts')->insert([
                    'id' => $alertId,
                    'tenant_id' => $tenant->id,
                    'store_id' => $storeId,
                    'alert_type' => 'low_stock',
                    'item_count' => count($itemsPayload),
                    'items' => json_encode($itemsPayload),
                    'acknowledged_at' => null,
                    'acknowledged_by' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        });
    }
}
