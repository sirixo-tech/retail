<?php

namespace App\Modules\Pos\Actions;

use App\Modules\Inventory\Actions\PostStock;
use App\Modules\Inventory\Models\StoreItem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class ReturnSale
{
    public function __construct(private PostStock $stock)
    {
    }

    /**
     * @param  list<array{sale_line_id: string, qty: float|int|string}>  $lines
     * @return array<string, mixed>
     */
    public function handle(string $tenantId, string $saleId, array $lines, string $reason): array
    {
        return DB::transaction(function () use ($tenantId, $saleId, $lines, $reason) {
            $sale = DB::table('sales')->where('id', $saleId)->where('tenant_id', $tenantId)->lockForUpdate()->first();
            if (! $sale || $sale->status === 'voided') {
                throw new RuntimeException('resource.not_found');
            }

            $noteLines = [];
            $total = 0;
            foreach ($lines as $line) {
                $sold = DB::table('sale_lines')->where('id', $line['sale_line_id'])->where('sale_id', $sale->id)->first();
                if (! $sold) {
                    throw new RuntimeException('Unknown sale line.');
                }
                $already = (float) DB::table('sale_credit_note_lines')->where('sale_line_id', $sold->id)->sum('qty');
                $qty = (float) $line['qty'];
                if ($qty <= 0 || $already + $qty > (float) $sold->qty + 0.0001) {
                    throw new RuntimeException('Return quantity is more than was sold.');
                }
                $refund = (int) round(((int) $sold->line_total_paise) * $qty / (float) $sold->qty);
                $total += $refund;
                $noteLines[] = [$sold, $qty, $refund];
            }

            $count = DB::table('sale_credit_notes')->where('tenant_id', $tenantId)->count() + 1;
            $noteId = (string) Str::uuid7();
            DB::table('sale_credit_notes')->insert([
                'id' => $noteId,
                'tenant_id' => $tenantId,
                'sale_id' => $sale->id,
                'number' => 'CN-'.str_pad((string) $count, 6, '0', STR_PAD_LEFT),
                'total_paise' => $total,
                'reason' => $reason,
                'status' => 'issued',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            foreach ($noteLines as [$sold, $qty, $refund]) {
                DB::table('sale_credit_note_lines')->insert([
                    'id' => (string) Str::uuid7(),
                    'credit_note_id' => $noteId,
                    'sale_line_id' => $sold->id,
                    'qty' => $qty,
                    'total_paise' => $refund,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $item = StoreItem::query()->find($sold->store_item_id);
                if ($item) {
                    $this->stock->post($item, $qty, 'return', null);
                }
            }

            $fully = DB::table('sale_lines')->where('sale_id', $sale->id)->get()->every(function ($sold) {
                $returned = (float) DB::table('sale_credit_note_lines')->where('sale_line_id', $sold->id)->sum('qty');

                return $returned + 0.0001 >= (float) $sold->qty;
            });
            DB::table('sales')->where('id', $sale->id)->update([
                'status' => $fully ? 'returned' : 'partially_returned',
                'updated_at' => now(),
            ]);

            return [
                'id' => $noteId,
                'number' => 'CN-'.str_pad((string) $count, 6, '0', STR_PAD_LEFT),
                'total_paise' => $total,
                'sale_status' => $fully ? 'returned' : 'partially_returned',
            ];
        });
    }
}
