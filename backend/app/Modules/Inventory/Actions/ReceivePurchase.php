<?php

namespace App\Modules\Inventory\Actions;

use App\Modules\Inventory\Models\StoreItem;
use App\Modules\Tenancy\Models\Store;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class ReceivePurchase
{
    public function __construct(private PostStock $stock)
    {
    }

    /**
     * @param  list<array{store_item_id: string, qty: float|int|string, cost_paise: int}>  $lines
     * @return array<string, mixed>
     */
    public function createAndReceive(Store $store, string $supplierName, array $lines): array
    {
        return DB::transaction(function () use ($store, $supplierName, $lines) {
            $supplierId = (string) Str::uuid7();
            DB::table('suppliers')->insert([
                'id' => $supplierId,
                'tenant_id' => $store->tenant_id,
                'name' => $supplierName,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return $this->receiveExisting($store, $supplierId, $lines);
        });
    }

    /**
     * @param  list<array{store_item_id: string, qty: float|int|string, cost_paise: int}>  $lines
     * @return array<string, mixed>
     */
    public function receiveExisting(Store $store, string $supplierId, array $lines): array
    {
        $supplier = DB::table('suppliers')->where('id', $supplierId)->where('tenant_id', $store->tenant_id)->first();
        if (! $supplier) {
            throw new RuntimeException('resource.not_found');
        }

        $count = DB::table('purchase_orders')->where('tenant_id', $store->tenant_id)->count() + 1;
        $orderId = (string) Str::uuid7();
        $receiptId = (string) Str::uuid7();
        $payable = 0;

        DB::table('purchase_orders')->insert([
            'id' => $orderId,
            'tenant_id' => $store->tenant_id,
            'supplier_id' => $supplierId,
            'store_id' => $store->id,
            'number' => 'PO-'.str_pad((string) $count, 6, '0', STR_PAD_LEFT),
            'status' => 'received',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('goods_receipts')->insert([
            'id' => $receiptId,
            'purchase_order_id' => $orderId,
            'store_id' => $store->id,
            'status' => 'posted',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        foreach ($lines as $line) {
            $item = StoreItem::query()->where('store_id', $store->id)->find($line['store_item_id']);
            if (! $item) {
                throw new RuntimeException('Unknown item.');
            }
            $qty = (float) $line['qty'];
            $cost = (int) $line['cost_paise'];
            if ($qty <= 0 || $cost < 0) {
                throw new RuntimeException('Quantity and cost must be valid.');
            }
            $payable += (int) round($qty * $cost);
            DB::table('purchase_order_lines')->insert([
                'id' => (string) Str::uuid7(),
                'purchase_order_id' => $orderId,
                'store_item_id' => $item->id,
                'qty' => $qty,
                'cost_paise' => $cost,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            DB::table('goods_receipt_lines')->insert([
                'id' => (string) Str::uuid7(),
                'goods_receipt_id' => $receiptId,
                'store_item_id' => $item->id,
                'qty' => $qty,
                'cost_paise' => $cost,
                'expires_on' => $line['expires_on'] ?? null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $this->stock->post($item, $qty, 'receipt', $cost);
        }

        DB::table('supplier_ledger_entries')->insert([
            'id' => (string) Str::uuid7(),
            'tenant_id' => $store->tenant_id,
            'supplier_id' => $supplierId,
            'direction' => 'credit',
            'amount_paise' => $payable,
            'reference_type' => 'goods_receipt',
            'reference_id' => $receiptId,
            'created_at' => now(),
        ]);

        return [
            'purchase_order_id' => $orderId,
            'number' => 'PO-'.str_pad((string) $count, 6, '0', STR_PAD_LEFT),
            'supplier_id' => $supplierId,
            'payable_paise' => $payable,
        ];
    }

    /**
    /**
     * @param  list<array{store_item_id: string, qty: float|int}>|null  $multipleLines
     * @return array<string, mixed>
     */
    public function transfer(Store $from, string $toStoreId, string $storeItemId, float $qty, bool $autoReceive = false, ?array $multipleLines = null): array
    {
        $itemsToTransfer = $multipleLines ?? [['store_item_id' => $storeItemId, 'qty' => $qty]];
        if (empty($itemsToTransfer)) {
            throw new RuntimeException('Quantity must be positive.');
        }

        $to = Store::query()->where('id', $toStoreId)->where('tenant_id', $from->tenant_id)->first();
        if (! $to || $to->id === $from->id) {
            throw new RuntimeException('resource.not_found');
        }

        return DB::transaction(function () use ($from, $to, $itemsToTransfer, $autoReceive) {
            $transferId = (string) Str::uuid7();
            $count = DB::table('stock_transfers')->where('tenant_id', $from->tenant_id)->count() + 1;
            $transferNumber = 'TR-'.str_pad((string) $count, 5, '0', STR_PAD_LEFT);
            $status = $autoReceive ? 'received' : 'in_transit';

            DB::table('stock_transfers')->insert([
                'id' => $transferId,
                'tenant_id' => $from->tenant_id,
                'from_store_id' => $from->id,
                'to_store_id' => $to->id,
                'transfer_number' => $transferNumber,
                'status' => $status,
                'dispatched_at' => now(),
                'received_at' => $autoReceive ? now() : null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            foreach ($itemsToTransfer as $line) {
                $transferQty = (float) $line['qty'];
                if ($transferQty <= 0) {
                    continue;
                }
                $source = StoreItem::query()->where('store_id', $from->id)->find($line['store_item_id']);
                if (! $source) {
                    throw new RuntimeException('resource.not_found');
                }

                $destination = StoreItem::query()
                    ->where('store_id', $to->id)
                    ->where(function ($q) use ($source) {
                        if ($source->master_product_id) {
                            $q->where('master_product_id', $source->master_product_id);
                        } else {
                            $q->where('sku', $source->sku);
                        }
                    })
                    ->first();

                if (! $destination) {
                    // Automatically provision product row in destination store if not present
                    $destination = StoreItem::create([
                        'id' => (string) Str::uuid7(),
                        'tenant_id' => $from->tenant_id,
                        'store_id' => $to->id,
                        'master_product_id' => $source->master_product_id,
                        'sku' => $source->sku,
                        'selling_price_paise' => $source->selling_price_paise,
                        'margin_bps' => $source->margin_bps,
                        'name_override' => $source->name_override,
                        'track_stock' => $source->track_stock,
                    ]);
                }

                DB::table('stock_transfer_lines')->insert([
                    'id' => (string) Str::uuid7(),
                    'transfer_id' => $transferId,
                    'store_item_id' => $source->id,
                    'qty' => $transferQty,
                    'received_qty' => $autoReceive ? $transferQty : null,
                    'variance_qty' => 0,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                // Debit source store inventory
                $this->stock->post($source, -1 * $transferQty, 'transfer_out', null);

                if ($autoReceive) {
                    $this->stock->post($destination, $transferQty, 'transfer_in', null);
                }
            }

            return [
                'id' => $transferId,
                'transfer_number' => $transferNumber,
                'status' => $status,
            ];
        });
    }

    /**
     * Acknowledge and receive an inter-branch transfer at the destination branch with variance auditing.
     *
     * @param  list<array{line_id: string, received_qty: float|int}>  $lines
     * @return array<string, mixed>
     */
    public function receiveTransfer(Store $toStore, string $transferId, array $lines, ?string $varianceNotes = null): array
    {
        return DB::transaction(function () use ($toStore, $transferId, $lines, $varianceNotes) {
            $transfer = DB::table('stock_transfers')
                ->where('id', $transferId)
                ->where('to_store_id', $toStore->id)
                ->lockForUpdate()
                ->first();

            if (! $transfer) {
                throw new RuntimeException('resource.not_found');
            }

            if ($transfer->status === 'received') {
                throw new RuntimeException('Transfer has already been received.');
            }

            $totalVariance = 0;
            foreach ($lines as $lineInput) {
                $transferLine = DB::table('stock_transfer_lines')
                    ->where('id', $lineInput['line_id'])
                    ->where('transfer_id', $transfer->id)
                    ->first();

                if (! $transferLine) {
                    continue;
                }

                $sourceItem = StoreItem::query()->find($transferLine->store_item_id);
                if (! $sourceItem) {
                    continue;
                }

                $destination = StoreItem::query()
                    ->where('store_id', $toStore->id)
                    ->where(function ($q) use ($sourceItem) {
                        if ($sourceItem->master_product_id) {
                            $q->where('master_product_id', $sourceItem->master_product_id);
                        } else {
                            $q->where('sku', $sourceItem->sku);
                        }
                    })
                    ->first();

                if (! $destination) {
                    $destination = StoreItem::create([
                        'id' => (string) Str::uuid7(),
                        'tenant_id' => $toStore->tenant_id,
                        'store_id' => $toStore->id,
                        'master_product_id' => $sourceItem->master_product_id,
                        'sku' => $sourceItem->sku,
                        'selling_price_paise' => $sourceItem->selling_price_paise,
                        'margin_bps' => $sourceItem->margin_bps,
                        'name_override' => $sourceItem->name_override,
                        'track_stock' => $sourceItem->track_stock,
                    ]);
                }

                $dispatchedQty = (float) $transferLine->qty;
                $receivedQty = (float) $lineInput['received_qty'];
                $variance = $dispatchedQty - $receivedQty;
                $totalVariance += $variance;

                DB::table('stock_transfer_lines')
                    ->where('id', $transferLine->id)
                    ->update([
                        'received_qty' => $receivedQty,
                        'variance_qty' => $variance,
                        'updated_at' => now(),
                    ]);

                if ($receivedQty > 0) {
                    $this->stock->post($destination, $receivedQty, 'transfer_in', null);
                }
            }

            DB::table('stock_transfers')
                ->where('id', $transfer->id)
                ->update([
                    'status' => 'received',
                    'received_at' => now(),
                    'variance_notes' => $varianceNotes,
                    'updated_at' => now(),
                ]);

            return [
                'id' => $transfer->id,
                'status' => 'received',
                'total_variance' => $totalVariance,
            ];
        });
    }

    /**
     * Automated Purchase Order generator based on low-stock alerts and reorder levels.
     *
     * @return array<string, mixed>
     */
    public function generateAutoPo(Store $store): array
    {
        $items = StoreItem::query()
            ->where('store_id', $store->id)
            ->where('track_stock', true)
            ->get();

        $primarySupplier = DB::table('suppliers')
            ->where('tenant_id', $store->tenant_id)
            ->first();

        $poLines = [];
        $totalEstimatedCostPaise = 0;

        foreach ($items as $item) {
            $onHand = (float) (DB::table('stock_balances')->where('store_item_id', $item->id)->value('on_hand') ?? 0);
            $reorderPoint = (float) $item->reorder_point;

            // Trigger when stock is at or below reorder threshold (or zero)
            if ($onHand <= $reorderPoint) {
                $targetStock = max(10, $reorderPoint > 0 ? $reorderPoint * 2 : 10);
                $suggestedQty = (int) ceil(max(1, $targetStock - $onHand));

                // Cost estimate: approx 70% of selling price or standard margin
                $estCostPaise = (int) round($item->selling_price_paise * 0.7);
                $lineTotal = $estCostPaise * $suggestedQty;
                $totalEstimatedCostPaise += $lineTotal;

                $poLines[] = [
                    'store_item_id' => $item->id,
                    'name' => $item->name_override ?: $item->sku,
                    'sku' => $item->sku,
                    'on_hand' => $onHand,
                    'reorder_point' => $reorderPoint,
                    'suggested_qty' => $suggestedQty,
                    'estimated_cost_paise' => $estCostPaise,
                    'line_total_paise' => $lineTotal,
                ];
            }
        }

        return [
            'store_id' => $store->id,
            'store_name' => $store->name,
            'supplier' => $primarySupplier ? [
                'id' => $primarySupplier->id,
                'name' => $primarySupplier->name,
            ] : null,
            'items_count' => count($poLines),
            'total_estimated_paise' => $totalEstimatedCostPaise,
            'lines' => $poLines,
            'generated_at' => now()->toISOString(),
        ];
    }

    /**
     * @param  list<array{store_item_id: string, counted_qty: float|int|string}>  $lines
     * @return array<string, mixed>
     */
    public function count(Store $store, array $lines): array
    {
        return DB::transaction(function () use ($store, $lines) {
            $countId = (string) Str::uuid7();
            DB::table('stock_counts')->insert([
                'id' => $countId,
                'tenant_id' => $store->tenant_id,
                'store_id' => $store->id,
                'status' => 'posted',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $adjustments = 0;
            foreach ($lines as $line) {
                $item = StoreItem::query()->where('store_id', $store->id)->find($line['store_item_id']);
                if (! $item) {
                    throw new RuntimeException('Unknown item.');
                }
                $counted = (float) $line['counted_qty'];
                if ($counted < 0) {
                    throw new RuntimeException('A count cannot be negative.');
                }
                $balance = DB::table('stock_balances')
                    ->where('store_id', $store->id)
                    ->where('store_item_id', $item->id)
                    ->lockForUpdate()
                    ->first();
                $onHand = $balance ? (float) $balance->on_hand : 0.0;
                $reserved = $balance ? (float) $balance->reserved : 0.0;
                if ($counted + 0.0001 < $reserved) {
                    throw new RuntimeException('conflict.insufficient_stock');
                }
                $delta = $counted - $onHand;
                if (abs($delta) > 0.0001) {
                    $this->stock->post($item, $delta, 'correction', null);
                    $adjustments++;
                }
                DB::table('stock_count_lines')->insert([
                    'id' => (string) Str::uuid7(),
                    'stock_count_id' => $countId,
                    'store_item_id' => $item->id,
                    'counted_qty' => $counted,
                    'on_hand_qty' => $onHand,
                    'delta_qty' => $delta,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            return ['id' => $countId, 'adjustments' => $adjustments];
        });
    }

    /**
     * @return array<string, mixed>
     */
    public function returnToSupplier(Store $store, string $supplierId, string $storeItemId, float $qty, int $costPaise): array
    {
        if ($qty <= 0 || $costPaise < 0) {
            throw new RuntimeException('Quantity and cost must be valid.');
        }

        return DB::transaction(function () use ($store, $supplierId, $storeItemId, $qty, $costPaise) {
            $supplier = DB::table('suppliers')->where('id', $supplierId)->where('tenant_id', $store->tenant_id)->first();
            $item = StoreItem::query()->where('store_id', $store->id)->find($storeItemId);
            if (! $supplier || ! $item) {
                throw new RuntimeException('resource.not_found');
            }
            $balance = DB::table('stock_balances')
                ->where('store_id', $store->id)
                ->where('store_item_id', $item->id)
                ->lockForUpdate()
                ->first();
            $available = $balance ? (float) $balance->on_hand - (float) $balance->reserved : 0.0;
            if ($available + 0.0001 < $qty) {
                throw new RuntimeException('conflict.insufficient_stock');
            }
            $amount = (int) round($qty * $costPaise);
            $id = (string) Str::uuid7();
            DB::table('purchase_returns')->insert([
                'id' => $id,
                'tenant_id' => $store->tenant_id,
                'store_id' => $store->id,
                'supplier_id' => $supplierId,
                'store_item_id' => $item->id,
                'qty' => $qty,
                'cost_paise' => $costPaise,
                'amount_paise' => $amount,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $this->stock->post($item, -1 * $qty, 'return', $costPaise);
            DB::table('supplier_ledger_entries')->insert([
                'id' => (string) Str::uuid7(),
                'tenant_id' => $store->tenant_id,
                'supplier_id' => $supplierId,
                'direction' => 'debit',
                'amount_paise' => $amount,
                'reference_type' => 'purchase_return',
                'reference_id' => $id,
                'created_at' => now(),
            ]);

            return ['id' => $id, 'amount_paise' => $amount];
        });
    }

    /**
     * @return array<string, mixed>
     */
    public function paySupplier(Store $store, string $supplierId, int $amountPaise, ?string $note): array
    {
        if ($amountPaise < 1) {
            throw new RuntimeException('The payment must be at least one paisa.');
        }

        return DB::transaction(function () use ($store, $supplierId, $amountPaise, $note) {
            $supplier = DB::table('suppliers')
                ->where('id', $supplierId)
                ->where('tenant_id', $store->tenant_id)
                ->lockForUpdate()
                ->first();
            if (! $supplier) {
                throw new RuntimeException('resource.not_found');
            }
            $credit = (int) DB::table('supplier_ledger_entries')->where('supplier_id', $supplierId)->where('direction', 'credit')->sum('amount_paise');
            $debit = (int) DB::table('supplier_ledger_entries')->where('supplier_id', $supplierId)->where('direction', 'debit')->sum('amount_paise');
            $due = $credit - $debit;
            if ($amountPaise > $due) {
                throw new RuntimeException('supplier.overpay');
            }
            $id = (string) Str::uuid7();
            DB::table('supplier_payments')->insert([
                'id' => $id,
                'tenant_id' => $store->tenant_id,
                'supplier_id' => $supplierId,
                'amount_paise' => $amountPaise,
                'note' => $note,
                'created_at' => now(),
            ]);
            DB::table('supplier_ledger_entries')->insert([
                'id' => (string) Str::uuid7(),
                'tenant_id' => $store->tenant_id,
                'supplier_id' => $supplierId,
                'direction' => 'debit',
                'amount_paise' => $amountPaise,
                'reference_type' => 'supplier_payment',
                'reference_id' => $id,
                'created_at' => now(),
            ]);

            return ['id' => $id, 'due_paise' => $due - $amountPaise];
        });
    }
}
