<?php

namespace App\Modules\Inventory\Actions;

use App\Modules\Inventory\Models\StoreItem;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class ReserveStock
{
    /** @var array<string, int> */
    private array $hours = [];

    public function __construct(private PostStock $stock)
    {
    }

    public function releaseExpired(): void
    {
        DB::transaction(function (): void {
            $rows = DB::table('stock_reservations')->where('status', 'reserved')->lockForUpdate()->get();
            foreach ($rows as $row) {
                if (! $this->isExpired($row)) {
                    continue;
                }
                $this->decreaseReserved($row->store_id, $row->store_item_id, (float) $row->qty);
                DB::table('stock_reservations')->where('id', $row->id)->where('status', 'reserved')->update([
                    'status' => 'released',
                    'updated_at' => now(),
                ]);
            }
        });
    }

    public function reserve(object $order): void
    {
        $held = DB::table('stock_reservations')
            ->where('order_id', $order->id)
            ->where('status', 'reserved')
            ->lockForUpdate()
            ->exists();
        if ($held) {
            return;
        }

        $lines = DB::table('order_lines')->where('order_id', $order->id)->get();
        /** @var array<string, float> $qtyByItem */
        $qtyByItem = [];
        foreach ($lines as $line) {
            $qtyByItem[$line->store_item_id] = ($qtyByItem[$line->store_item_id] ?? 0) + (float) $line->qty;
        }

        /** @var array<string, object> $balances */
        $balances = [];
        foreach ($qtyByItem as $itemId => $qty) {
            $balance = DB::table('stock_balances')
                ->where('store_id', $order->store_id)
                ->where('store_item_id', $itemId)
                ->lockForUpdate()
                ->first();
            $onHand = $balance ? (float) $balance->on_hand : 0.0;
            $reserved = $balance ? (float) $balance->reserved : 0.0;
            if (! $balance || $onHand - $reserved + 0.0001 < $qty) {
                throw new RuntimeException('conflict.insufficient_stock');
            }
            $balances[$itemId] = $balance;
        }

        foreach ($qtyByItem as $itemId => $qty) {
            $balance = $balances[$itemId];
            DB::table('stock_balances')->where('id', $balance->id)->update([
                'reserved' => (float) $balance->reserved + $qty,
                'updated_at' => now(),
            ]);
            DB::table('stock_reservations')->insert([
                'id' => (string) Str::uuid7(),
                'tenant_id' => $order->tenant_id,
                'store_id' => $order->store_id,
                'store_item_id' => $itemId,
                'order_id' => $order->id,
                'qty' => $qty,
                'status' => 'reserved',
                'reserved_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function release(string $orderId): void
    {
        $rows = DB::table('stock_reservations')
            ->where('order_id', $orderId)
            ->where('status', 'reserved')
            ->lockForUpdate()
            ->get();
        foreach ($rows as $row) {
            $this->decreaseReserved($row->store_id, $row->store_item_id, (float) $row->qty);
            DB::table('stock_reservations')->where('id', $row->id)->where('status', 'reserved')->update([
                'status' => 'released',
                'updated_at' => now(),
            ]);
        }
    }

    public function convert(object $order): void
    {
        $rows = DB::table('stock_reservations')
            ->where('order_id', $order->id)
            ->where('status', 'reserved')
            ->lockForUpdate()
            ->get();

        /** @var array<string, float> $covered */
        $covered = [];
        foreach ($rows as $row) {
            $qty = (float) $row->qty;
            $this->decreaseReserved($row->store_id, $row->store_item_id, $qty);
            $item = StoreItem::query()->find($row->store_item_id);
            if (! $item) {
                throw new RuntimeException('conflict.insufficient_stock');
            }
            $this->stock->post($item, -1 * $qty, 'sale', null);
            DB::table('stock_reservations')->where('id', $row->id)->update([
                'status' => 'converted',
                'updated_at' => now(),
            ]);
            $covered[$row->store_item_id] = ($covered[$row->store_item_id] ?? 0) + $qty;
        }

        $lines = DB::table('order_lines')->where('order_id', $order->id)->get();
        /** @var array<string, float> $needed */
        $needed = [];
        foreach ($lines as $line) {
            $needed[$line->store_item_id] = ($needed[$line->store_item_id] ?? 0) + (float) $line->qty;
        }
        foreach ($needed as $itemId => $qty) {
            $rest = $qty - ($covered[$itemId] ?? 0);
            if ($rest <= 0.0001) {
                continue;
            }
            $item = StoreItem::query()->find($itemId);
            if (! $item) {
                throw new RuntimeException('conflict.insufficient_stock');
            }
            $this->stock->post($item, -1 * $rest, 'sale', null);
        }
    }

    private function isExpired(object $row): bool
    {
        return Carbon::parse($row->reserved_at)->lte(now()->subHours($this->hoursFor($row->store_id)));
    }

    private function hoursFor(string $storeId): int
    {
        if (isset($this->hours[$storeId])) {
            return $this->hours[$storeId];
        }
        $settings = DB::table('stores')->where('id', $storeId)->value('settings');
        $decoded = is_string($settings) ? json_decode($settings, true) : (array) $settings;
        $hours = (int) ($decoded['reservation_hours'] ?? 24);
        $this->hours[$storeId] = $hours > 0 ? $hours : 24;

        return $this->hours[$storeId];
    }

    private function decreaseReserved(string $storeId, string $itemId, float $qty): void
    {
        $balance = DB::table('stock_balances')
            ->where('store_id', $storeId)
            ->where('store_item_id', $itemId)
            ->lockForUpdate()
            ->first();
        if (! $balance) {
            return;
        }
        $next = (float) $balance->reserved - $qty;
        if ($next < 0) {
            $next = 0;
        }
        DB::table('stock_balances')->where('id', $balance->id)->update([
            'reserved' => $next,
            'updated_at' => now(),
        ]);
    }
}
