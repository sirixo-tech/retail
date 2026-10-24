<?php

namespace App\Modules\Pos\Actions;

use App\Modules\Catalog\Models\Product;
use App\Modules\Customers\Actions\PostLoyalty;
use App\Modules\Inventory\Actions\PostStock;
use App\Modules\Inventory\Models\StoreItem;
use App\Modules\Plans\Support\Entitlement;
use App\Modules\Pos\Support\Gst;
use App\Modules\Tenancy\Models\Store;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class CompleteCashSale
{
    public function __construct(private PostStock $stock, private Entitlement $entitlements, private PostLoyalty $loyalty)
    {
    }

    /**
     * @param  list<array{store_item_id: string, qty: float|int|string}>  $lines
     * @return array<string, mixed>
     */
    public function handle(Store $store, string $userId, string $clientUuid, array $lines, int $cashTenderPaise, ?string $customerId = null, int $redeemPoints = 0, int $discountPaise = 0, ?array $payments = null, bool $oversell = false): array
    {
        $existing = DB::table('sales')->where('tenant_id', $store->tenant_id)->where('client_uuid', $clientUuid)->first();
        if ($existing) {
            return $this->present($existing);
        }

        $this->entitlements->assertOrders($store->tenant_id);

        $shift = DB::table('shifts')->where('store_id', $store->id)->where('status', 'open')->first();
        if (! $shift) {
            throw new RuntimeException('conflict.shift_open');
        }

        return DB::transaction(function () use ($store, $userId, $clientUuid, $lines, $cashTenderPaise, $shift, $customerId, $redeemPoints, $discountPaise, $payments, $oversell) {
            $again = DB::table('sales')->where('tenant_id', $store->tenant_id)->where('client_uuid', $clientUuid)->first();
            if ($again) {
                return $this->present($again);
            }

            $inclusive = $store->gst_pricing_mode !== 'exclusive';
            $built = [];
            $subtotal = 0;
            $cgst = 0;
            $sgst = 0;
            $igst = 0;

            foreach ($lines as $line) {
                $item = StoreItem::query()->where('store_id', $store->id)->find($line['store_item_id']);
                if (! $item) {
                    throw new RuntimeException('Unknown item.');
                }
                $qty = (float) $line['qty'];
                if ($qty <= 0) {
                    throw new RuntimeException('Quantity must be positive.');
                }
                $price = DB::table('store_item_prices')->where('store_item_id', $item->id)->orderByDesc('starts_at')->first();
                if (! $price) {
                    throw new RuntimeException('Item has no price.');
                }
                $shelf = (int) $price->selling_price_paise;
                $unit = $shelf;
                if (isset($line['unit_price_paise']) && $line['unit_price_paise'] !== null && (int) $line['unit_price_paise'] !== $shelf) {
                    $unit = (int) $line['unit_price_paise'];
                    if ($unit < 0 || $unit > $shelf) {
                        throw new RuntimeException('price.too_high');
                    }
                    if (trim((string) ($line['price_reason'] ?? '')) === '') {
                        throw new RuntimeException('price.reason');
                    }
                }
                $master = $item->master_product_id ? Product::query()->find($item->master_product_id) : null;
                $tax = $master?->tax_class_id
                    ? DB::table($this->catalog('tax_classes'))->where('id', $master->tax_class_id)->first()
                    : null;
                $gstBps = (int) ($tax->gst_bps ?? 0);
                if ($gstBps === 0) {
                    $gstBps = (int) ($item->gst_bps ?? 0);
                }
                $gross = (int) round($unit * $qty);
                $split = Gst::split($gross, $gstBps, $inclusive, false);
                $serial = trim((string) ($line['serial'] ?? ''));
                if ($serial !== '') {
                    $taken = DB::table('sale_lines')
                        ->join('sales', 'sales.id', '=', 'sale_lines.sale_id')
                        ->where('sales.tenant_id', $store->tenant_id)
                        ->where('sales.status', '!=', 'voided')
                        ->where('sale_lines.serial', $serial)
                        ->exists();
                    if ($taken) {
                        throw new RuntimeException('serial.taken');
                    }
                }
                $name = $item->name_override ?: ($master->name ?? $item->sku);
                $built[] = [
                    'item' => $item,
                    'name' => $name,
                    'hsn' => $tax->hsn ?? null,
                    'qty' => $qty,
                    'unit' => $unit,
                    'gst_bps' => $gstBps,
                    'split' => $split,
                    'serial' => $serial !== '' ? $serial : null,
                ];
                $subtotal += $split['taxable'];
                $cgst += $split['cgst'];
                $sgst += $split['sgst'];
                $igst += $split['igst'];
            }

            $total = $subtotal + $cgst + $sgst + $igst;
            $roundOff = 0;
            if ($store->round_to_rupee) {
                $rounded = (int) (round($total / 100) * 100);
                $roundOff = $rounded - $total;
                $total = $rounded;
            }

            $saleId = (string) Str::uuid7();
            $billDiscount = max(0, $discountPaise);
            if ($billDiscount > $total) {
                throw new RuntimeException('discount.too_large');
            }
            $total -= $billDiscount;
            $loyaltyDiscount = 0;
            if ($customerId && $redeemPoints > 0) {
                $loyaltyDiscount = $this->loyalty->redeem($store->tenant_id, $customerId, $saleId, $redeemPoints, $total);
                $total -= $loyaltyDiscount;
            }
            $discount = $billDiscount + $loyaltyDiscount;

            if (! $payments && $cashTenderPaise < $total) {
                throw new RuntimeException('Cash tender is short.');
            }

            $series = DB::table('invoice_series')->where('store_id', $store->id)->lockForUpdate()->first();
            if (! $series) {
                throw new RuntimeException('No invoice series for this counter.');
            }
            $number = $series->prefix.'-'.str_pad((string) $series->next_number, 6, '0', STR_PAD_LEFT);
            DB::table('invoice_series')->where('id', $series->id)->update([
                'next_number' => $series->next_number + 1,
                'updated_at' => now(),
            ]);

            DB::table('sales')->insert([
                'id' => $saleId,
                'tenant_id' => $store->tenant_id,
                'store_id' => $store->id,
                'counter_id' => $shift->counter_id,
                'shift_id' => $shift->id,
                'customer_id' => $customerId,
                'number' => $number,
                'client_uuid' => $clientUuid,
                'status' => 'completed',
                'gst_pricing_mode' => $inclusive ? 'inclusive' : 'exclusive',
                'subtotal_paise' => $subtotal,
                'discount_paise' => $discount,
                'cgst_paise' => $cgst,
                'sgst_paise' => $sgst,
                'igst_paise' => $igst,
                'cess_paise' => 0,
                'round_off_paise' => $roundOff,
                'total_paise' => $total,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            foreach ($built as $row) {
                $lineId = (string) Str::uuid7();
                DB::table('sale_lines')->insert([
                    'id' => $lineId,
                    'sale_id' => $saleId,
                    'store_item_id' => $row['item']->id,
                    'description_snapshot' => $row['name'],
                    'hsn_snapshot' => $row['hsn'],
                    'qty' => $row['qty'],
                    'unit_price_paise' => $row['unit'],
                    'discount_paise' => 0,
                    'taxable_paise' => $row['split']['taxable'],
                    'gst_bps' => $row['gst_bps'],
                    'cess_bps' => 0,
                    'cgst_paise' => $row['split']['cgst'],
                    'sgst_paise' => $row['split']['sgst'],
                    'igst_paise' => $row['split']['igst'],
                    'cess_paise' => 0,
                    'line_total_paise' => $row['split']['total'],
                    'serial' => $row['serial'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                if (! empty($row['item']->enable_batch_tracking)) {
                    $batches = app(\App\Services\BatchManagementService::class)->allocateBatch($row['item'], (float) $row['qty'], 'FEFO');
                    foreach ($batches as $batch) {
                        DB::table('sale_line_batches')->insert([
                            'id' => (string) Str::uuid7(),
                            'sale_line_id' => $lineId,
                            'batch_id' => $batch['batch_id'],
                            'qty' => $batch['qty'],
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    }
                }

                $this->stock->post($row['item'], -1 * $row['qty'], 'sale', null, $oversell);
            }

            if ($payments) {
                $cash = 0;
                $other = 0;
                $khata = 0;
                foreach ($payments as $payment) {
                    if ($payment['method'] === 'cash') {
                        $cash += (int) $payment['amount_paise'];
                    } else {
                        $other += (int) $payment['amount_paise'];
                    }
                    if ($payment['method'] === 'khata') {
                        $khata += (int) $payment['amount_paise'];
                    }
                }
                if ($khata > 0 && ! $customerId) {
                    throw new RuntimeException('khata.customer');
                }
                if ($khata > 0 && ! $this->entitlements->allows($store->tenant_id, 'module.khata')) {
                    throw new RuntimeException('khata.disabled');
                }
                if ($other > $total || $cash + $other < $total) {
                    throw new RuntimeException('Cash tender is short.');
                }
                $change = $cash - ($total - $other);
                $changeLeft = $change;
                foreach ($payments as $payment) {
                    $amount = (int) $payment['amount_paise'];
                    $rowChange = 0;
                    if ($payment['method'] === 'cash' && $changeLeft > 0) {
                        $rowChange = min($changeLeft, $amount);
                        $changeLeft -= $rowChange;
                    }
                    DB::table('sale_payments')->insert([
                        'id' => (string) Str::uuid7(),
                        'sale_id' => $saleId,
                        'method' => $payment['method'],
                        'amount_paise' => $amount,
                        'change_paise' => $rowChange,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
                if ($khata > 0) {
                    $customer = DB::table('customers')->where('id', $customerId)->lockForUpdate()->first();
                    DB::table('customers')->where('id', $customerId)->update([
                        'khata_balance_paise' => (int) $customer->khata_balance_paise + $khata,
                        'updated_at' => now(),
                    ]);
                    DB::table('khata_entries')->insert([
                        'id' => (string) Str::uuid7(),
                        'tenant_id' => $store->tenant_id,
                        'customer_id' => $customerId,
                        'direction' => 'charge',
                        'amount_paise' => $khata,
                        'note' => 'Counter sale',
                        'sale_id' => $saleId,
                        'created_at' => now(),
                    ]);
                }
            } else {
                DB::table('sale_payments')->insert([
                    'id' => (string) Str::uuid7(),
                    'sale_id' => $saleId,
                    'method' => 'cash',
                    'amount_paise' => $cashTenderPaise,
                    'change_paise' => $cashTenderPaise - $total,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
            $this->loyalty->earn($store->tenant_id, $customerId, $saleId, $total);

            return $this->present(DB::table('sales')->where('id', $saleId)->first());
        });

        event(new \App\Modules\Printing\Events\SaleCompleted($result['id'], $store->id, $store->tenant_id));

        $saleModel = \App\Modules\Pos\Models\Sale::withoutTenancy()->find($result['id']);
        if ($saleModel && app(\App\Services\EInvoiceService::class)->requiresEInvoice($saleModel)) {
            dispatch(new \App\Jobs\GenerateEInvoiceJob((string) $saleModel->id));
        }

        return $result;
    }

    /**
     * @return array<string, mixed>
     */
    private function present(object $sale): array
    {
        return [
            'id' => $sale->id,
            'number' => $sale->number,
            'total_paise' => (int) $sale->total_paise,
            'cgst_paise' => (int) $sale->cgst_paise,
            'sgst_paise' => (int) $sale->sgst_paise,
            'round_off_paise' => (int) $sale->round_off_paise,
            'discount_paise' => (int) $sale->discount_paise,
            'status' => $sale->status,
            'points_earned' => (int) DB::table('loyalty_entries')->where('sale_id', $sale->id)->where('direction', 'earn')->value('points'),
        ];
    }

    private function catalog(string $name): string
    {
        return DB::getDriverName() === 'pgsql' ? 'catalog.'.$name : 'catalog_'.$name;
    }
}
