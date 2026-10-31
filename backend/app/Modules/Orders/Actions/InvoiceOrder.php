<?php

namespace App\Modules\Orders\Actions;

use App\Modules\Catalog\Models\Product;
use App\Modules\Customers\Actions\PostLoyalty;
use App\Modules\Inventory\Actions\ReserveStock;
use App\Modules\Inventory\Models\StoreItem;
use App\Modules\Pos\Support\Gst;
use App\Modules\Tenancy\Models\Store;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class InvoiceOrder
{
    /** @var list<string> */
    private const PREPAID = ['razorpay', 'phonepe', 'paytm', 'stripe'];

    public function __construct(private ReserveStock $reservations, private PostLoyalty $loyalty)
    {
    }

    public function applies(object $order, string $to): bool
    {
        $method = (string) ($order->payment_method ?? '');
        if ($method === 'cod') {
            return $to === 'delivered';
        }
        if ($method === 'pay_at_store') {
            return $to === 'picked_up';
        }
        if (! in_array($method, self::PREPAID, true) || (string) $order->payment_status !== 'captured') {
            return false;
        }

        return $to === 'accepted';
    }

    public function create(object $order): string
    {
        $existing = DB::table('sales')->where('order_id', $order->id)->first();
        if ($existing) {
            $this->link($order, $existing->id);

            return (string) $existing->id;
        }

        $store = Store::query()->find($order->store_id);
        if (! $store) {
            throw new RuntimeException('resource.not_found');
        }

        $inclusive = $store->gst_pricing_mode !== 'exclusive';
        $lines = DB::table('order_lines')->where('order_id', $order->id)->get();
        $built = [];
        $subtotal = 0;
        $cgst = 0;
        $sgst = 0;
        $igst = 0;

        foreach ($lines as $line) {
            $item = StoreItem::query()->find($line->store_item_id);
            $master = $item?->master_product_id ? Product::query()->find($item->master_product_id) : null;
            $tax = $master?->tax_class_id
                ? DB::table($this->catalog('tax_classes'))->where('id', $master->tax_class_id)->first()
                : null;
            $gstBps = (int) ($tax->gst_bps ?? 0);
            $qty = (float) $line->qty;
            $gross = (int) round(((int) $line->unit_price_paise) * $qty);
            $split = Gst::split($gross, $gstBps, $inclusive, false);
            $built[] = [
                'item_id' => $line->store_item_id,
                'name' => $line->name_snapshot,
                'hsn' => $tax->hsn ?? null,
                'qty' => $qty,
                'unit' => (int) $line->unit_price_paise,
                'gst_bps' => $gstBps,
                'split' => $split,
            ];
            $subtotal += $split['taxable'];
            $cgst += $split['cgst'];
            $sgst += $split['sgst'];
            $igst += $split['igst'];
        }

        $delivery = (int) $order->delivery_fee_paise;
        if ($delivery > 0) {
            $built[] = [
                'item_id' => null,
                'name' => 'Delivery',
                'hsn' => null,
                'qty' => 1,
                'unit' => $delivery,
                'gst_bps' => 0,
                'split' => ['taxable' => $delivery, 'cgst' => 0, 'sgst' => 0, 'igst' => 0, 'total' => $delivery],
            ];
            $subtotal += $delivery;
        }

        $computed = $subtotal + $cgst + $sgst + $igst;
        $total = (int) $order->total_paise;
        $roundOff = $total - $computed;

        $series = DB::table('invoice_series')->where('store_id', $store->id)->lockForUpdate()->first();
        if (! $series) {
            throw new RuntimeException('No invoice series for this counter.');
        }
        $number = $series->prefix.'-'.str_pad((string) $series->next_number, 6, '0', STR_PAD_LEFT);
        DB::table('invoice_series')->where('id', $series->id)->update([
            'next_number' => $series->next_number + 1,
            'updated_at' => now(),
        ]);

        $shiftId = DB::table('shifts')->where('store_id', $store->id)->where('status', 'open')->value('id');
        $saleId = (string) Str::uuid7();
        DB::table('sales')->insert([
            'id' => $saleId,
            'tenant_id' => $store->tenant_id,
            'store_id' => $store->id,
            'counter_id' => $series->counter_id,
            'shift_id' => $shiftId,
            'customer_id' => null,
            'order_id' => $order->id,
            'number' => $number,
            'client_uuid' => (string) Str::uuid7(),
            'status' => 'completed',
            'gst_pricing_mode' => $inclusive ? 'inclusive' : 'exclusive',
            'subtotal_paise' => $subtotal,
            'discount_paise' => (int) ($order->discount_paise ?? 0),
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
            DB::table('sale_lines')->insert([
                'id' => (string) Str::uuid7(),
                'sale_id' => $saleId,
                'store_item_id' => $row['item_id'],
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
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $this->reservations->convert($order);

        DB::table('sale_payments')->insert([
            'id' => (string) Str::uuid7(),
            'sale_id' => $saleId,
            'method' => (string) ($order->payment_method ?: 'pay_at_store'),
            'amount_paise' => $total,
            'change_paise' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->link($order, $saleId);
        $phone = preg_replace('/\D+/', '', (string) $order->customer_phone) ?? '';
        $customerId = $phone === '' ? null : DB::table('customers')
            ->where('tenant_id', $store->tenant_id)
            ->where('phone_e164', $phone)
            ->whereNull('deleted_at')
            ->value('id');
        $this->loyalty->earn($store->tenant_id, $customerId ? (string) $customerId : null, $saleId, $total);

        return $saleId;
    }

    private function link(object $order, string $saleId): void
    {
        DB::table('orders')->where('id', $order->id)->update([
            'sale_id' => $saleId,
            'payment_status' => (string) $order->payment_status === 'captured' ? 'captured' : 'paid',
            'updated_at' => now(),
        ]);
    }

    private function catalog(string $name): string
    {
        return DB::getDriverName() === 'pgsql' ? 'catalog.'.$name : 'catalog_'.$name;
    }
}
