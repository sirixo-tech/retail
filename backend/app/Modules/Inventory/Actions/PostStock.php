<?php

namespace App\Modules\Inventory\Actions;

use App\Modules\Inventory\Models\StoreItem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class PostStock
{
    public function post(StoreItem $item, float $qtyDelta, string $reason, ?int $unitCostPaise, bool $allowNegative = false): void
    {
        DB::transaction(function () use ($item, $qtyDelta, $reason, $unitCostPaise, $allowNegative): void {
            $balance = DB::table('stock_balances')
                ->where('store_item_id', $item->id)
                ->where('store_id', $item->store_id)
                ->lockForUpdate()
                ->first();

            $details = is_array($item->details) ? $item->details : [];
            $alwaysInStock = ! $item->track_stock
                || ! empty($details['always_in_stock'])
                || in_array(strtolower((string) ($details['type'] ?? '')), ['service', 'service product'], true);

            if ($qtyDelta < 0 && $reason === 'sale' && ! $allowNegative && ! $alwaysInStock) {
                $onHand = $balance ? (float) $balance->on_hand : 0.0;
                $reserved = $balance ? (float) $balance->reserved : 0.0;
                if ($reserved > 0 && $onHand - $reserved + $qtyDelta < -0.0001) {
                    throw new RuntimeException('conflict.insufficient_stock');
                }
            }

            DB::table('stock_ledger_entries')->insert([
                'id' => (string) Str::uuid7(),
                'tenant_id' => $item->tenant_id,
                'store_id' => $item->store_id,
                'store_item_id' => $item->id,
                'qty_delta' => $qtyDelta,
                'unit_cost_paise' => $unitCostPaise,
                'reason' => $reason,
                'occurred_at' => now(),
                'created_at' => now(),
            ]);

            if (! $balance) {
                DB::table('stock_balances')->insert([
                    'id' => (string) Str::uuid7(),
                    'store_item_id' => $item->id,
                    'store_id' => $item->store_id,
                    'on_hand' => $qtyDelta,
                    'reserved' => 0,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                return;
            }

            DB::table('stock_balances')->where('id', $balance->id)->update([
                'on_hand' => (float) $balance->on_hand + $qtyDelta,
                'updated_at' => now(),
            ]);
        });
    }
}
