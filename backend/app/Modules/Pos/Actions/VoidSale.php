<?php

namespace App\Modules\Pos\Actions;

use App\Modules\Customers\Actions\PostLoyalty;
use App\Modules\Inventory\Actions\PostStock;
use App\Modules\Inventory\Models\StoreItem;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class VoidSale
{
    public function __construct(private PostStock $stock, private PostLoyalty $loyalty)
    {
    }

    /**
     * @return array<string, mixed>
     */
    public function handle(string $tenantId, string $saleId, string $reason): array
    {
        return DB::transaction(function () use ($tenantId, $saleId, $reason) {
            $sale = DB::table('sales')->where('id', $saleId)->where('tenant_id', $tenantId)->lockForUpdate()->first();
            if (! $sale) {
                throw new RuntimeException('resource.not_found');
            }
            if (DB::table('sale_credit_notes')->where('sale_id', $sale->id)->exists()) {
                throw new RuntimeException('conflict.returned');
            }
            if ($sale->status !== 'completed') {
                throw new RuntimeException('conflict.void');
            }
            if ($sale->order_id) {
                throw new RuntimeException('conflict.online');
            }
            $shiftOpen = $sale->shift_id && DB::table('shifts')->where('id', $sale->shift_id)->where('status', 'open')->exists();
            if (! $shiftOpen) {
                throw new RuntimeException('conflict.shift_closed');
            }

            $lines = DB::table('sale_lines')->where('sale_id', $sale->id)->get();
            foreach ($lines as $line) {
                if (! $line->store_item_id) {
                    continue;
                }
                $item = StoreItem::query()->find($line->store_item_id);
                if ($item) {
                    $this->stock->post($item, (float) $line->qty, 'void', null);
                }
            }
            $this->loyalty->reverseSale($sale->id);
            DB::table('sales')->where('id', $sale->id)->update([
                'status' => 'voided',
                'updated_at' => now(),
            ]);

            return [
                'id' => $sale->id,
                'number' => $sale->number,
                'status' => 'voided',
                'reason' => $reason,
            ];
        });
    }
}
