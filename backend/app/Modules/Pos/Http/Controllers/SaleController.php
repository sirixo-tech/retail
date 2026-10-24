<?php

namespace App\Modules\Pos\Http\Controllers;

use App\Modules\Inventory\Actions\ReserveStock;
use App\Modules\Orders\Actions\PlaceOrder;
use App\Modules\Payments\Http\Controllers\GatewayController;
use App\Modules\Pos\Actions\CompleteCashSale;
use App\Modules\Pos\Actions\ReturnSale;
use App\Modules\Pos\Actions\VoidSale;
use App\Modules\Plans\Support\Entitlement;
use App\Modules\Tenancy\Models\Store;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use RuntimeException;

class SaleController
{
    public function __construct(
        private CompleteCashSale $sales,
        private PlaceOrder $orders,
        private ReturnSale $returns,
        private VoidSale $voids,
        private ReserveStock $reservations,
        private Entitlement $entitlements,
    ) {
    }

    public function openShift(Request $request, string $store): JsonResponse
    {
        $model = $this->store($request, $store);
        if ($model instanceof JsonResponse) {
            return $model;
        }
        $data = $request->validate(['opening_cash_paise' => ['required', 'integer', 'min:0']]);
        $open = DB::table('shifts')->where('store_id', $model->id)->where('status', 'open')->first();
        if ($open) {
            return ApiResponse::ok(['id' => $open->id, 'status' => 'open']);
        }
        $counter = DB::table('counters')->where('store_id', $model->id)->where('code', 'C1')->first();
        $id = (string) Str::uuid7();
        DB::table('shifts')->insert([
            'id' => $id,
            'tenant_id' => $model->tenant_id,
            'store_id' => $model->id,
            'counter_id' => $counter->id,
            'user_id' => $request->user()->id,
            'opened_at' => now(),
            'opening_cash_paise' => $data['opening_cash_paise'],
            'status' => 'open',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return ApiResponse::ok(['id' => $id, 'status' => 'open'], 201);
    }

    public function currentShift(Request $request, string $store): JsonResponse
    {
        $model = $this->store($request, $store);
        if ($model instanceof JsonResponse) {
            return $model;
        }
        $open = DB::table('shifts')->where('store_id', $model->id)->where('status', 'open')->first();

        return ApiResponse::ok($open ? ['id' => $open->id, 'status' => 'open', 'opening_cash_paise' => (int) $open->opening_cash_paise] : null);
    }

    public function closeShift(Request $request, string $store): JsonResponse
    {
        $model = $this->store($request, $store);
        if ($model instanceof JsonResponse) {
            return $model;
        }
        $data = $request->validate([
            'actual_cash_paise' => ['required', 'integer', 'min:0'],
            'denominations' => ['nullable', 'array', 'min:1'],
            'denominations.*.value_paise' => ['required', 'integer', 'in:200000,50000,20000,10000,5000,2000,1000,500,200,100'],
            'denominations.*.count' => ['required', 'integer', 'min:0', 'max:10000'],
        ]);
        if (isset($data['denominations'])) {
            $counted = 0;
            foreach ($data['denominations'] as $note) {
                $counted += (int) $note['value_paise'] * (int) $note['count'];
            }
            if ($counted !== (int) $data['actual_cash_paise']) {
                return ApiResponse::error('conflict.cash_count', 'The notes do not add up to the counted cash.', 422);
            }
        }
        $open = DB::table('shifts')->where('store_id', $model->id)->where('status', 'open')->first();
        if (! $open) {
            return ApiResponse::error('conflict.shift_open', 'There is no open shift.', 409);
        }

        $expected = $this->expectedCash($open);

        DB::table('shifts')->where('id', $open->id)->update([
            'status' => 'closed',
            'closed_at' => now(),
            'expected_cash_paise' => $expected['expected_paise'],
            'actual_cash_paise' => $data['actual_cash_paise'],
            'updated_at' => now(),
        ]);
        foreach ($data['denominations'] ?? [] as $note) {
            if ((int) $note['count'] === 0) {
                continue;
            }
            DB::table('denomination_counts')->insert([
                'id' => (string) \Illuminate\Support\Str::uuid7(),
                'shift_id' => $open->id,
                'value_paise' => (int) $note['value_paise'],
                'count' => (int) $note['count'],
                'created_at' => now(),
            ]);
        }

        return ApiResponse::ok([
            'id' => $open->id,
            'status' => 'closed',
            'opening_cash_paise' => (int) $open->opening_cash_paise,
            'cash_sales_paise' => $expected['sales_paise'],
            'expected_cash_paise' => $expected['expected_paise'],
            'actual_cash_paise' => $data['actual_cash_paise'],
            'difference_paise' => $data['actual_cash_paise'] - $expected['expected_paise'],
        ]);
    }

    public function reading(Request $request, string $store): JsonResponse
    {
        $model = $this->store($request, $store);
        if ($model instanceof JsonResponse) {
            return $model;
        }
        $open = DB::table('shifts')->where('store_id', $model->id)->where('status', 'open')->first();
        if (! $open) {
            return ApiResponse::error('conflict.shift_open', 'There is no open shift.', 409);
        }

        return ApiResponse::ok($this->expectedCash($open));
    }

    public function cashMovement(Request $request, string $store): JsonResponse
    {
        $model = $this->store($request, $store);
        if ($model instanceof JsonResponse) {
            return $model;
        }
        $data = $request->validate([
            'direction' => ['required', 'in:in,out'],
            'amount_paise' => ['required', 'integer', 'min:1'],
            'reason' => ['required', 'string', 'max:160'],
        ]);
        $open = DB::table('shifts')->where('store_id', $model->id)->where('status', 'open')->first();
        if (! $open) {
            return ApiResponse::error('conflict.shift_open', 'There is no open shift.', 409);
        }
        $drawer = $this->expectedCash($open);
        if ($data['direction'] === 'out' && $data['amount_paise'] > $drawer['expected_paise']) {
            return ApiResponse::error('conflict.cash_short', 'The drawer does not have that much cash.', 422);
        }
        $id = (string) \Illuminate\Support\Str::uuid7();
        DB::table('shift_cash_movements')->insert([
            'id' => $id,
            'tenant_id' => $model->tenant_id,
            'shift_id' => $open->id,
            'user_id' => $request->user()->id,
            'direction' => $data['direction'],
            'amount_paise' => $data['amount_paise'],
            'reason' => $data['reason'],
            'created_at' => now(),
        ]);

        return ApiResponse::ok([
            'id' => $id,
            'expected_paise' => $this->expectedCash($open)['expected_paise'],
        ], 201);
    }

    /**
     * @return array{opening_paise: int, sales_paise: int, paid_in_paise: int, paid_out_paise: int, expected_paise: int}
     */
    private function expectedCash(object $open): array
    {
        $payments = DB::table('sale_payments')
            ->join('sales', 'sales.id', '=', 'sale_payments.sale_id')
            ->where('sales.shift_id', $open->id)
            ->where('sales.status', '!=', 'voided')
            ->where('sale_payments.method', 'cash')
            ->get(['sale_payments.amount_paise', 'sale_payments.change_paise']);
        $sales = (int) $payments->sum(fn ($row) => (int) $row->amount_paise - (int) $row->change_paise);
        $in = (int) DB::table('shift_cash_movements')->where('shift_id', $open->id)->where('direction', 'in')->sum('amount_paise');
        $out = (int) DB::table('shift_cash_movements')->where('shift_id', $open->id)->where('direction', 'out')->sum('amount_paise');

        return [
            'opening_paise' => (int) $open->opening_cash_paise,
            'sales_paise' => $sales,
            'paid_in_paise' => $in,
            'paid_out_paise' => $out,
            'expected_paise' => (int) $open->opening_cash_paise + $sales + $in - $out,
        ];
    }

    public function receipt(Request $request, string $sale): JsonResponse
    {
        $row = DB::table('sales')->where('id', $sale)->where('tenant_id', $request->session()->get('tenant_id'))->first();
        if (! $row) {
            return ApiResponse::error('resource.not_found', 'Sale not found.', 404);
        }
        $lines = DB::table('sale_lines')->where('sale_id', $row->id)->get();
        $payment = DB::table('sale_payments')->where('sale_id', $row->id)->first();
        $store = DB::table('stores')->where('id', $row->store_id)->first();
        $settings = [];
        if ($store && $store->settings) {
            $settings = is_string($store->settings) ? json_decode($store->settings, true) : (array) $store->settings;
        }

        return ApiResponse::ok([
            'number' => $row->number,
            'store' => $store->name ?? '',
            'city' => $store->city ?? '',
            'created_at' => $row->created_at,
            'lines' => $lines->map(fn ($line) => [
                'id' => $line->id,
                'name' => $line->description_snapshot,
                'qty' => (string) $line->qty,
                'unit_price_paise' => (int) ($line->unit_price_paise ?? ($line->qty > 0 ? (int) ($line->line_total_paise / $line->qty) : (int) $line->line_total_paise)),
                'total_paise' => (int) $line->line_total_paise,
            ]),
            'cgst_paise' => (int) $row->cgst_paise,
            'sgst_paise' => (int) $row->sgst_paise,
            'round_off_paise' => (int) $row->round_off_paise,
            'discount_paise' => (int) $row->discount_paise,
            'subtotal_paise' => (int) max(0, $row->total_paise - $row->cgst_paise - $row->sgst_paise + $row->discount_paise),
            'total_paise' => (int) $row->total_paise,
            'tender_paise' => $payment ? (int) $payment->amount_paise : 0,
            'change_paise' => $payment ? (int) $payment->change_paise : 0,
            'payment_method' => $payment ? ($payment->method ?? 'Cash') : 'Cash',
            'footer' => (string) ($settings['receipt_footer'] ?? ''),
        ]);
    }

    public function sell(Request $request, string $store): JsonResponse
    {
        $model = $this->store($request, $store);
        if ($model instanceof JsonResponse) {
            return $model;
        }
        $data = $request->validate([
            'client_uuid' => ['required', 'uuid'],
            'cash_tender_paise' => ['required', 'integer', 'min:0'],
            'customer_id' => ['nullable', 'uuid'],
            'loyalty_points' => ['nullable', 'integer', 'min:0'],
            'discount_paise' => ['nullable', 'integer', 'min:0'],
            'discount_reason' => ['nullable', 'string', 'max:160'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.store_item_id' => ['required', 'uuid'],
            'lines.*.qty' => ['required', 'numeric', 'gt:0'],
            'lines.*.unit_price_paise' => ['nullable', 'integer', 'min:0'],
            'lines.*.price_reason' => ['nullable', 'string', 'max:160'],
            'lines.*.serial' => ['nullable', 'string', 'max:64'],
            'payments' => ['nullable', 'array', 'min:1'],
            'payments.*.method' => ['required_with:payments', 'in:cash,upi,card,khata'],
            'payments.*.amount_paise' => ['required_with:payments', 'integer', 'min:1'],
            'oversell' => ['nullable', 'boolean'],
        ]);

        try {
            if (! empty($data['customer_id'])) {
                $owns = DB::table('customers')->where('id', $data['customer_id'])->where('tenant_id', $model->tenant_id)->exists();
                if (! $owns) {
                    return ApiResponse::error('resource.not_found', 'Customer not found.', 404);
                }
            }
            if ((int) ($data['discount_paise'] ?? 0) > 0 && trim((string) ($data['discount_reason'] ?? '')) === '') {
                return ApiResponse::error('validation.failed', 'A discount needs a reason.', 422);
            }
            if ((int) ($data['discount_paise'] ?? 0) > 0 && ($denied = $this->assertPin($request))) {
                return $denied;
            }
            $sale = $this->sales->handle(
                $model,
                $request->user()->id,
                $data['client_uuid'],
                $data['lines'],
                (int) $data['cash_tender_paise'],
                $data['customer_id'] ?? null,
                (int) ($data['loyalty_points'] ?? 0),
                (int) ($data['discount_paise'] ?? 0),
                $data['payments'] ?? null,
                (bool) ($data['oversell'] ?? false),
            );
        } catch (RuntimeException $e) {
            $known = [
                'conflict.shift_open' => 'Open a shift before billing.',
                'conflict.insufficient_stock' => 'Not enough stock is available to sell.',
            ];
            if (isset($known[$e->getMessage()])) {
                return ApiResponse::error($e->getMessage(), $known[$e->getMessage()], 409);
            }
            if ($e->getMessage() === 'entitlement.limit_exceeded') {
                return ApiResponse::error('entitlement.limit_exceeded', 'The plan has no room for another order this month.', 422);
            }
            if ($e->getMessage() === 'entitlement.module_disabled') {
                return ApiResponse::error('entitlement.module_disabled', 'Loyalty is not on this plan.', 403);
            }
            if ($e->getMessage() === 'loyalty.short') {
                return ApiResponse::error('loyalty.short', 'The customer does not have that many points.', 422);
            }
            if ($e->getMessage() === 'loyalty.too_large') {
                return ApiResponse::error('loyalty.too_large', 'Those points are worth more than this bill.', 422);
            }
            if ($e->getMessage() === 'discount.too_large') {
                return ApiResponse::error('discount.too_large', 'The discount is larger than the bill.', 422);
            }
            if ($e->getMessage() === 'khata.customer') {
                return ApiResponse::error('khata.customer', 'A khata sale needs a customer.', 422);
            }
            if ($e->getMessage() === 'khata.disabled') {
                return ApiResponse::error('entitlement.module_disabled', 'Khata is not on this plan.', 403);
            }
            if ($e->getMessage() === 'serial.taken') {
                return ApiResponse::error('serial.taken', 'That serial is already on a bill.', 422);
            }
            if ($e->getMessage() === 'price.too_high') {
                return ApiResponse::error('price.too_high', 'The price cannot be above the shelf price.', 422);
            }
            if ($e->getMessage() === 'price.reason') {
                return ApiResponse::error('price.reason', 'A changed price needs a reason.', 422);
            }

            return ApiResponse::error('validation.failed', $e->getMessage(), 422);
        }

        return ApiResponse::ok($sale, 201);
    }

    public function findSale(Request $request, string $store): JsonResponse
    {
        $model = $this->store($request, $store);
        if ($model instanceof JsonResponse) {
            return $model;
        }
        $number = (string) $request->query('number', '');
        $row = DB::table('sales')->where('store_id', $model->id)->where('number', $number)->first();
        if (! $row) {
            return ApiResponse::error('resource.not_found', 'Invoice not found.', 404);
        }

        return $this->receipt($request, $row->id);
    }

    public function returnSale(Request $request, string $sale): JsonResponse
    {
        $row = DB::table('sales')->where('id', $sale)->where('tenant_id', $request->session()->get('tenant_id'))->first();
        if (! $row) {
            return ApiResponse::error('resource.not_found', 'Sale not found.', 404);
        }
        $data = $request->validate([
            'reason' => ['required', 'string', 'max:160'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.sale_line_id' => ['required', 'uuid'],
            'lines.*.qty' => ['required', 'numeric', 'gt:0'],
        ]);

        try {
            $note = $this->returns->handle((string) $request->session()->get('tenant_id'), $sale, $data['lines'], $data['reason']);
        } catch (RuntimeException $e) {
            $status = $e->getMessage() === 'resource.not_found' ? 404 : 422;

            return ApiResponse::error('validation.failed', $e->getMessage(), $status);
        }

        return ApiResponse::ok($note, 201);
    }

    public function exchange(Request $request, string $sale): JsonResponse
    {
        $row = DB::table('sales')->where('id', $sale)->where('tenant_id', $request->session()->get('tenant_id'))->first();
        if (! $row) {
            return ApiResponse::error('resource.not_found', 'Sale not found.', 404);
        }
        $data = $request->validate([
            'reason' => ['required', 'string', 'max:160'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.sale_line_id' => ['required', 'uuid'],
            'lines.*.qty' => ['required', 'numeric', 'gt:0'],
            'replacement' => ['required', 'array', 'min:1'],
            'replacement.*.store_item_id' => ['required', 'uuid'],
            'replacement.*.qty' => ['required', 'numeric', 'gt:0'],
            'cash_tender_paise' => ['required', 'integer', 'min:0'],
            'client_uuid' => ['required', 'uuid'],
        ]);
        $store = Store::query()->find($row->store_id);
        if (! $store) {
            return ApiResponse::error('resource.not_found', 'Store not found.', 404);
        }
        try {
            $note = $this->returns->handle((string) $store->tenant_id, $sale, $data['lines'], $data['reason']);
            $next = $this->sales->handle(
                $store,
                $request->user()->id,
                $data['client_uuid'],
                $data['replacement'],
                (int) $data['cash_tender_paise'],
            );
        } catch (RuntimeException $e) {
            return ApiResponse::error('validation.failed', $e->getMessage(), 422);
        }

        return ApiResponse::ok(['credit_note' => $note, 'sale' => $next], 201);
    }

    public function numberBlock(Request $request, string $store): JsonResponse
    {
        $model = $this->store($request, $store);
        if ($model instanceof JsonResponse) {
            return $model;
        }
        if (! $this->entitlements->allows($model->tenant_id, 'module.offline_pos')) {
            return ApiResponse::error('entitlement.module_disabled', 'Offline billing is not on this plan.', 403);
        }
        $data = $request->validate(['size' => ['required', 'integer', 'min:1', 'max:50']]);

        return DB::transaction(function () use ($model, $data) {
            $series = DB::table('invoice_series')->where('store_id', $model->id)->lockForUpdate()->first();
            if (! $series) {
                return ApiResponse::error('resource.not_found', 'No invoice series for this counter.', 404);
            }
            $start = (int) $series->next_number;
            $end = $start + (int) $data['size'] - 1;
            DB::table('invoice_series')->where('id', $series->id)->update([
                'next_number' => $end + 1,
                'updated_at' => now(),
            ]);
            $id = (string) Str::uuid7();
            DB::table('invoice_number_blocks')->insert([
                'id' => $id,
                'store_id' => $model->id,
                'start_number' => $start,
                'end_number' => $end,
                'expires_at' => now()->addDay(),
                'created_at' => now(),
            ]);

            return ApiResponse::ok([
                'id' => $id,
                'prefix' => $series->prefix,
                'start_number' => $start,
                'end_number' => $end,
            ], 201);
        });
    }

    public function sync(Request $request, string $store): JsonResponse
    {
        $model = $this->store($request, $store);
        if ($model instanceof JsonResponse) {
            return $model;
        }
        if (! $this->entitlements->allows($model->tenant_id, 'module.offline_pos')) {
            return ApiResponse::error('entitlement.module_disabled', 'Offline billing is not on this plan.', 403);
        }
        $data = $request->validate([
            'sales' => ['required', 'array', 'min:1', 'max:20'],
            'sales.*.client_uuid' => ['required', 'uuid'],
            'sales.*.cash_tender_paise' => ['required', 'integer', 'min:0'],
            'sales.*.lines' => ['required', 'array', 'min:1'],
            'sales.*.lines.*.store_item_id' => ['required', 'uuid'],
            'sales.*.lines.*.qty' => ['required', 'numeric', 'gt:0'],
        ]);
        $saved = [];
        foreach ($data['sales'] as $sale) {
            try {
                $saved[] = $this->sales->handle(
                    $model,
                    $request->user()->id,
                    $sale['client_uuid'],
                    $sale['lines'],
                    (int) $sale['cash_tender_paise'],
                );
            } catch (RuntimeException $e) {
                return ApiResponse::error('validation.failed', $e->getMessage(), 422);
            }
        }

        return ApiResponse::ok($saved);
    }

    public function proof(Request $request, string $order): JsonResponse
    {
        $data = $request->validate(['note' => ['required', 'string', 'max:240']]);
        $row = DB::table('orders')->where('id', $order)->where('tenant_id', $request->session()->get('tenant_id'))->first();
        if (! $row || $row->status !== 'out_for_delivery') {
            return ApiResponse::error('conflict.transition', 'A proof photo can be saved while the order is out for delivery.', 409);
        }
        $delivery = DB::table('deliveries')->where('order_id', $row->id)->first();
        if (! $delivery) {
            return ApiResponse::error('resource.not_found', 'Delivery not found.', 404);
        }
        DB::table('deliveries')->where('id', $delivery->id)->update([
            'proof_note' => $data['note'],
            'updated_at' => now(),
        ]);

        return ApiResponse::ok(['order_id' => $row->id, 'proof_note' => $data['note']]);
    }

    public function saveSections(Request $request, string $store): JsonResponse
    {
        $model = $this->store($request, $store);
        if ($model instanceof JsonResponse) {
            return $model;
        }
        $data = $request->validate([
            'sections' => ['present', 'array', 'max:8'],
            'sections.*.position' => ['required', 'integer', 'min:1', 'max:8'],
            'sections.*.kind' => ['required', 'in:banner,collection,announcement'],
            'sections.*.title' => ['required', 'string', 'max:80'],
        ]);
        DB::transaction(function () use ($model, $data) {
            DB::table('storefront_sections')->where('store_id', $model->id)->delete();
            foreach ($data['sections'] as $section) {
                DB::table('storefront_sections')->insert([
                    'id' => (string) Str::uuid7(),
                    'store_id' => $model->id,
                    'position' => (int) $section['position'],
                    'kind' => $section['kind'],
                    'title' => $section['title'],
                    'created_at' => now(),
                ]);
            }
        });

        return ApiResponse::ok(['count' => count($data['sections'])]);
    }

    public function void(Request $request, string $sale): JsonResponse
    {
        if ($denied = $this->assertPin($request)) {
            return $denied;
        }
        $data = $request->validate([
            'reason' => ['required', 'string', 'max:160'],
        ]);
        try {
            $updated = $this->voids->handle((string) $request->session()->get('tenant_id'), $sale, $data['reason']);
        } catch (RuntimeException $e) {
            $message = match ($e->getMessage()) {
                'resource.not_found' => 'Sale not found.',
                'conflict.void' => 'Only a completed counter bill can be voided.',
                'conflict.online' => 'An online invoice cannot be voided from the counter.',
                'conflict.returned' => 'This bill already has a return.',
                'conflict.shift_closed' => 'The shift for this bill is already closed.',
                'loyalty.short' => 'Those points have already been used.',
                default => 'The bill was not voided.',
            };
            $status = match ($e->getMessage()) {
                'resource.not_found' => 404,
                'loyalty.short' => 422,
                default => 409,
            };

            return ApiResponse::error($e->getMessage(), $message, $status);
        }

        return ApiResponse::ok($updated);
    }

    public function checkout(Request $request, string $slug): JsonResponse
    {
        $store = Store::resolvePublic($slug);
        if (! $store) {
            return ApiResponse::error('resource.not_found', 'Store not found.', 404);
        }
        if (! $this->hoursFor($store)['open_now']) {
            return ApiResponse::error('conflict.closed', 'The shop is closed.', 422);
        }
        $data = $request->validate([
            'customer_name' => ['required', 'string', 'max:120'],
            'customer_phone' => ['required', 'string', 'max:20'],
            'customer_email' => ['nullable', 'string', 'email', 'max:120'],
            'fulfillment' => ['required', 'in:pickup,delivery'],
            'payment_method' => ['nullable', 'string', 'max:50'],
            'pincode' => ['nullable', 'string', 'max:12'],
            'address' => ['nullable', 'string', 'max:500'],
            'landmark' => ['nullable', 'string', 'max:200'],
            'latitude' => ['nullable', 'numeric'],
            'longitude' => ['nullable', 'numeric'],
            'live_location_url' => ['nullable', 'string', 'max:500'],
            'special_instructions' => ['nullable', 'string', 'max:500'],
            'coupon_code' => ['nullable', 'string', 'max:32'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.store_item_id' => ['required', 'uuid'],
            'lines.*.qty' => ['required', 'numeric', 'gt:0'],
        ]);

        $method = $data['payment_method'] ?? ($data['fulfillment'] === 'delivery' ? 'cod' : 'pay_at_store');
        $gatewayRow = DB::table('payment_gateways')
            ->where('store_id', $store->id)
            ->where('provider', $method)
            ->first();

        if ($gatewayRow) {
            if ($gatewayRow->status !== 'active') {
                return ApiResponse::error('validation.failed', 'That payment method is not turned on for this store.', 422);
            }
        } elseif (! in_array($method, ['cod', 'pay_at_store', 'upi_qr'], true)) {
            return ApiResponse::error('validation.failed', 'That payment method is not turned on for this store.', 422);
        }

        $addressData = [
            'name' => $data['customer_name'],
            'phone' => $data['customer_phone'],
            'email' => $data['customer_email'] ?? null,
            'address' => $data['address'] ?? null,
            'landmark' => $data['landmark'] ?? null,
            'latitude' => $data['latitude'] ?? null,
            'longitude' => $data['longitude'] ?? null,
            'live_location_url' => $data['live_location_url'] ?? null,
            'special_instructions' => $data['special_instructions'] ?? null,
            'pincode' => $data['pincode'] ?? null,
        ];

        try {
            $order = $this->orders->place(
                $store,
                $data['customer_name'],
                $data['customer_phone'],
                $data['fulfillment'],
                $data['lines'],
                $data['pincode'] ?? null,
                $method,
                $data['coupon_code'] ?? null,
                $addressData
            );
        } catch (RuntimeException $e) {
            if ($e->getMessage() === 'entitlement.limit_exceeded') {
                return ApiResponse::error('entitlement.limit_exceeded', 'The plan has no room for another order this month.', 422);
            }

            return ApiResponse::error('validation.failed', $e->getMessage(), 422);
        }

        if (in_array($method, GatewayController::PREPAID, true)) {
            $token = Str::random(40);
            $paymentId = (string) Str::uuid7();
            DB::table('payments')->insert([
                'id' => $paymentId,
                'tenant_id' => $store->tenant_id,
                'store_id' => $store->id,
                'order_id' => $order['id'],
                'provider' => $method,
                'mode' => 'test',
                'amount_paise' => $order['total_paise'],
                'status' => 'created',
                'capture_token_hash' => hash_hmac('sha256', $token, (string) config('app.key')),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $order['payment'] = [
                'id' => $paymentId,
                'provider' => $method,
                'amount_paise' => $order['total_paise'],
                'capture_token' => $token,
            ];
        }

        return ApiResponse::ok($order, 201);
    }

    public function orders(Request $request): JsonResponse
    {
        $this->reservations->releaseExpired();
        $tenantId = $request->session()->get('tenant_id');
        if (! $tenantId && $request->user()) {
            $tenantId = DB::table('staff_profiles')->where('user_id', $request->user()->id)->value('tenant_id');
        }
        if (! $tenantId) {
            $tenantId = DB::table('staff_profiles')->value('tenant_id') ?? DB::table('tenants')->value('id');
        }
        $rows = DB::table('orders')->where('tenant_id', $tenantId);
        if ($request->query('since')) {
            $rows->where('created_at', '>', $request->query('since'));
        }
        $rows = $rows->orderByDesc('created_at')->limit(60)->get();
        $stores = DB::table('stores')->where('tenant_id', $tenantId)->pluck('name', 'id');
        $orderLines = DB::table('order_lines')->whereIn('order_id', $rows->pluck('id'))->get(['order_id', 'name_snapshot', 'qty', 'unit_price_paise']);

        $online = $rows->map(function ($order) use ($stores, $orderLines) {
            $lines = $orderLines->where('order_id', $order->id)->values();

            $address = $order->address_snapshot ? (is_string($order->address_snapshot) ? json_decode($order->address_snapshot, true) : (array) $order->address_snapshot) : [];
            $lat = $order->latitude ?? ($address['latitude'] ?? null);
            $lng = $order->longitude ?? ($address['longitude'] ?? null);
            $liveLoc = $order->live_location_url ?? ($address['live_location_url'] ?? ($lat && $lng ? "https://www.google.com/maps?q={$lat},{$lng}" : null));

            return [
                'id' => $order->id,
                'number' => $order->number,
                'status' => $order->status,
                'fulfillment' => $order->fulfillment,
                'customer_name' => $order->customer_name,
                'customer_phone' => $order->customer_phone ?? null,
                'payment_method' => $order->payment_method ?? 'pay_at_store',
                'payment_status' => $order->payment_status ?? 'unpaid',
                'subtotal_paise' => (int) ($order->subtotal_paise ?? $order->total_paise),
                'discount_paise' => (int) ($order->discount_paise ?? 0),
                'delivery_fee_paise' => (int) ($order->delivery_fee_paise ?? 0),
                'total_paise' => (int) $order->total_paise,
                'sale_id' => $order->sale_id,
                'pickup_qr' => $order->pickup_qr ?? null,
                'delivery_status' => $order->delivery_status ?? ($order->fulfillment === 'delivery' ? 'unassigned' : 'not_applicable'),
                'delivery_staff_id' => $order->delivery_staff_id ?? null,
                'delivery_staff_name' => $order->delivery_staff_name ?? null,
                'delivery_staff_phone' => $order->delivery_staff_phone ?? null,
                'latitude' => $lat,
                'longitude' => $lng,
                'live_location_url' => $liveLoc,
                'address' => $address['address'] ?? ($address['address_line'] ?? null),
                'city' => $address['city'] ?? null,
                'pincode' => $address['pincode'] ?? null,
                'landmark' => $address['landmark'] ?? null,
                'order_notes' => $order->order_notes ?? ($address['special_instructions'] ?? null),
                'address_snapshot' => $address,
                'store_name' => $stores[$order->store_id] ?? 'Default Store',
                'items_count' => (float) $lines->sum('qty'),
                'lines_summary' => $lines->map(fn ($l) => ((float) $l->qty).' × '.$l->name_snapshot)->implode(', '),
                'lines' => $lines->map(fn ($l) => [
                    'name' => $l->name_snapshot,
                    'qty' => (float) $l->qty,
                    'unit_price_paise' => (int) $l->unit_price_paise,
                    'total_paise' => (int) ($l->qty * $l->unit_price_paise),
                ])->values(),
                'channel' => 'online',
                'created_at' => $order->created_at,
            ];
        });

        return ApiResponse::ok($online->concat($this->counterSales($tenantId, $stores, $request->query('since')))->sortByDesc('created_at')->values());
    }

    /**
     * @param  \Illuminate\Support\Collection<string, string>  $stores
     * @return \Illuminate\Support\Collection<int, array<string, mixed>>
     */
    private function counterSales(mixed $tenantId, $stores = null, mixed $since = null): \Illuminate\Support\Collection
    {
        $stores ??= DB::table('stores')->where('tenant_id', $tenantId)->pluck('name', 'id');
        $query = DB::table('sales')
            ->leftJoin('customers', 'customers.id', '=', 'sales.customer_id')
            ->where('sales.tenant_id', $tenantId)
            ->whereNull('sales.order_id');
        if ($since) {
            $query->where('sales.created_at', '>', $since);
        }
        $sales = $query
            ->orderByDesc('sales.created_at')
            ->limit(60)
            ->get([
                'sales.id',
                'sales.store_id',
                'sales.number',
                'sales.status',
                'sales.subtotal_paise',
                'sales.discount_paise',
                'sales.cgst_paise',
                'sales.sgst_paise',
                'sales.total_paise',
                'sales.created_at',
                DB::raw("coalesce(customers.name, 'Walk-in Customer') as customer_name"),
                'customers.phone_e164 as customer_phone',
            ]);
        $saleIds = $sales->pluck('id');
        $saleLines = DB::table('sale_lines')->whereIn('sale_id', $saleIds)->get(['sale_id', 'description_snapshot', 'qty', 'line_total_paise']);
        $salePayments = DB::table('sale_payments')->whereIn('sale_id', $saleIds)->get(['sale_id', 'method', 'amount_paise', 'change_paise']);

        return $sales->map(function ($sale) use ($stores, $saleLines, $salePayments) {
            $lines = $saleLines->where('sale_id', $sale->id)->values();
            $payments = $salePayments->where('sale_id', $sale->id)->values();
            $method = $payments->pluck('method')->unique()->implode(', ') ?: 'cash';
            $paidPaise = (int) $payments->where('method', '!=', 'khata')->sum(fn ($p) => (int) $p->amount_paise - (int) $p->change_paise);
            $paymentStatus = $sale->status === 'voided' ? 'voided' : ($paidPaise >= (int) $sale->total_paise ? 'paid' : ($paidPaise > 0 ? 'partial' : 'due'));

            return [
                'id' => $sale->id,
                'number' => $sale->number,
                'status' => $sale->status,
                'fulfillment' => 'counter',
                'customer_name' => $sale->customer_name,
                'customer_phone' => $sale->customer_phone ?? null,
                'payment_method' => $method,
                'payment_status' => $paymentStatus,
                'subtotal_paise' => (int) ($sale->subtotal_paise ?? $sale->total_paise),
                'discount_paise' => (int) ($sale->discount_paise ?? 0),
                'cgst_paise' => (int) ($sale->cgst_paise ?? 0),
                'sgst_paise' => (int) ($sale->sgst_paise ?? 0),
                'total_paise' => (int) $sale->total_paise,
                'paid_paise' => $paidPaise,
                'due_paise' => max(0, (int) $sale->total_paise - $paidPaise),
                'sale_id' => $sale->id,
                'store_name' => $stores[$sale->store_id] ?? 'Default Store',
                'items_count' => (float) $lines->sum('qty'),
                'lines_summary' => $lines->map(fn ($l) => ((float) $l->qty).' × '.$l->description_snapshot)->implode(', '),
                'lines' => $lines->map(fn ($l) => [
                    'name' => $l->description_snapshot,
                    'qty' => (float) $l->qty,
                    'unit_price_paise' => (int) ($l->line_total_paise / max(1, $l->qty)),
                    'total_paise' => (int) $l->line_total_paise,
                ])->values(),
                'channel' => 'counter',
                'created_at' => $sale->created_at,
            ];
        });
    }

    public function pickList(Request $request): JsonResponse
    {
        $this->reservations->releaseExpired();
        $orders = DB::table('orders')
            ->where('tenant_id', $request->session()->get('tenant_id'))
            ->whereIn('status', ['accepted', 'packing'])
            ->orderBy('created_at')
            ->get(['id', 'number', 'status', 'customer_name', 'fulfillment']);
        $lines = DB::table('order_lines')->whereIn('order_id', $orders->pluck('id'))->get(['order_id', 'name_snapshot', 'qty']);

        return ApiResponse::ok($orders->map(fn ($order) => [
            'id' => $order->id,
            'number' => $order->number,
            'status' => $order->status,
            'customer_name' => $order->customer_name,
            'fulfillment' => $order->fulfillment,
            'lines' => $lines->where('order_id', $order->id)->map(fn ($line) => [
                'name' => $line->name_snapshot,
                'qty' => (float) $line->qty,
            ])->values(),
        ]));
    }

    public function transition(Request $request, string $order): JsonResponse
    {
        $data = $request->validate([
            'to' => ['required', 'string'],
            'otp' => ['nullable', 'string', 'max:8'],
        ]);
        try {
            $updated = $this->orders->transition(
                (string) $request->session()->get('tenant_id'),
                $order,
                $data['to'],
                $request->user()->id,
                $data['otp'] ?? null,
            );
        } catch (RuntimeException $e) {
            $status = match ($e->getMessage()) {
                'resource.not_found' => 404,
                'auth.invalid_code' => 401,
                'auth.locked' => 423,
                default => 409,
            };
            $message = match ($e->getMessage()) {
                'conflict.insufficient_stock' => 'Not enough stock is available for this order.',
                'resource.not_found' => 'Order not found.',
                'auth.invalid_code' => 'That delivery code is not valid.',
                'auth.locked' => 'Too many attempts. The delivery code is locked.',
                default => 'That status change is not allowed.',
            };

            return ApiResponse::error($e->getMessage(), $message, $status);
        }

        return ApiResponse::ok($updated);
    }

    public function holds(Request $request, string $store): JsonResponse
    {
        $model = $this->store($request, $store);
        if ($model instanceof JsonResponse) {
            return $model;
        }
        $rows = DB::table('pos_holds')->where('store_id', $model->id)->orderByDesc('created_at')->limit(20)->get(['id', 'label', 'lines', 'created_at']);

        return ApiResponse::ok($rows->map(function ($row) {
            $lines = is_string($row->lines) ? json_decode($row->lines, true) : $row->lines;

            return [
                'id' => $row->id,
                'label' => $row->label,
                'lines' => $lines,
                'created_at' => $row->created_at,
            ];
        }));
    }

    public function park(Request $request, string $store): JsonResponse
    {
        $model = $this->store($request, $store);
        if ($model instanceof JsonResponse) {
            return $model;
        }
        $data = $request->validate([
            'label' => ['nullable', 'string', 'max:80'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.store_item_id' => ['required', 'uuid'],
            'lines.*.qty' => ['required', 'numeric', 'gt:0'],
        ]);
        $id = (string) Str::uuid7();
        DB::table('pos_holds')->insert([
            'id' => $id,
            'tenant_id' => $model->tenant_id,
            'store_id' => $model->id,
            'user_id' => $request->user()->id,
            'label' => $data['label'] ?? null,
            'lines' => json_encode($data['lines']),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return ApiResponse::ok(['id' => $id], 201);
    }

    public function releaseHold(Request $request, string $store, string $hold): JsonResponse
    {
        $model = $this->store($request, $store);
        if ($model instanceof JsonResponse) {
            return $model;
        }
        $deleted = DB::table('pos_holds')->where('id', $hold)->where('store_id', $model->id)->delete();
        if (! $deleted) {
            return ApiResponse::error('resource.not_found', 'Parked bill not found.', 404);
        }

        return ApiResponse::ok(['id' => $hold]);
    }

    public function show(Request $request, string $order): JsonResponse
    {
        $row = DB::table('orders')->where('id', $order)->where('tenant_id', $request->session()->get('tenant_id'))->first();
        if (! $row) {
            return ApiResponse::error('resource.not_found', 'Order not found.', 404);
        }
        $events = DB::table('order_status_events')->where('order_id', $row->id)->orderBy('created_at')->get(['from_status', 'to_status', 'created_at']);

        return ApiResponse::ok([
            'id' => $row->id,
            'number' => $row->number,
            'status' => $row->status,
            'fulfillment' => $row->fulfillment,
            'customer_name' => $row->customer_name,
            'total_paise' => (int) $row->total_paise,
            'sale_id' => $row->sale_id,
            'timeline' => $events,
        ]);
    }

    public function track(Request $request): JsonResponse
    {
        $data = $request->validate([
            'number' => ['required', 'string'],
            'phone' => ['nullable', 'string'],
        ]);

        $query = DB::table('orders')->where(function ($q) use ($data) {
            $q->where('number', $data['number'])
              ->orWhere('id', $data['number']);
        });

        if (! empty($data['phone'])) {
            $cleaned = preg_replace('/\D/', '', $data['phone']);
            $tenDigits = substr($cleaned, -10);
            $query->where(function ($q) use ($data, $tenDigits) {
                $q->where('customer_phone', $data['phone'])
                  ->orWhere('customer_phone', 'LIKE', "%{$tenDigits}");
            });
        }

        $row = $query->first();
        if (! $row) {
            return ApiResponse::error('resource.not_found', 'Order not found.', 404);
        }

        $events = DB::table('order_status_events')
            ->where('order_id', $row->id)
            ->orderBy('created_at')
            ->get(['from_status', 'to_status', 'created_at']);

        $lines = DB::table('order_lines')
            ->where('order_id', $row->id)
            ->get(['store_item_id', 'name_snapshot', 'qty', 'unit_price_paise']);

        $store = DB::table('stores')->where('id', $row->store_id)->first();
        $storeSettings = $store && $store->settings ? (is_string($store->settings) ? json_decode($store->settings, true) : (array) $store->settings) : [];
        $onlineSettings = $storeSettings['online_store'] ?? ($storeSettings['online_store_settings'] ?? []);
        $mapsKey = $onlineSettings['contact']['googleMapsApiKey'] ?? ($onlineSettings['basics']['googleMapsApiKey'] ?? null);
        $storeLat = $store?->lat ?: ($onlineSettings['contact']['storeLatitude'] ?? 12.9716);
        $storeLng = $store?->lng ?: ($onlineSettings['contact']['storeLongitude'] ?? 77.5946);

        $addressData = $row->address_snapshot ? (is_string($row->address_snapshot) ? json_decode($row->address_snapshot, true) : (array) $row->address_snapshot) : [];
        $custLat = $row->latitude ?? ($addressData['latitude'] ?? null);
        $custLng = $row->longitude ?? ($addressData['longitude'] ?? null);
        $liveLocUrl = $row->live_location_url ?? ($addressData['live_location_url'] ?? ($custLat && $custLng ? "https://www.google.com/maps?q={$custLat},{$custLng}" : null));

        return ApiResponse::ok([
            'id' => $row->id,
            'number' => $row->number,
            'status' => $row->status,
            'fulfillment' => $row->fulfillment,
            'customer_name' => $row->customer_name,
            'customer_phone' => $row->customer_phone,
            'address_snapshot' => $addressData,
            'subtotal_paise' => (int) $row->subtotal_paise,
            'delivery_fee_paise' => (int) $row->delivery_fee_paise,
            'discount_paise' => (int) ($row->discount_paise ?? 0),
            'total_paise' => (int) $row->total_paise,
            'payment_status' => $row->payment_status,
            'payment_method' => $row->payment_method ?? ($row->fulfillment === 'delivery' ? 'cod' : 'pay_at_store'),
            'created_at' => $row->created_at,
            'latitude' => $custLat ? (float) $custLat : null,
            'longitude' => $custLng ? (float) $custLng : null,
            'live_location_url' => $liveLocUrl,
            'delivery_staff_name' => $row->delivery_staff_name ?? null,
            'delivery_staff_phone' => $row->delivery_staff_phone ?? null,
            'delivery_status' => $row->delivery_status ?? $row->status,
            'store' => [
                'name' => $store?->name ?? 'Retail Store',
                'slug' => $store?->public_slug ?? ($store?->slug ?? 'bangalore'),
                'phone' => $store?->phone ?? null,
                'address' => $store?->address_line ?? ($store?->address ?? null),
                'city' => $store?->city ?? null,
                'lat' => $storeLat ? (float) $storeLat : null,
                'lng' => $storeLng ? (float) $storeLng : null,
                'google_maps_api_key' => $mapsKey,
            ],
            'lines' => $lines->map(fn($l) => [
                'store_item_id' => $l->store_item_id,
                'name' => $l->name_snapshot,
                'qty' => (float) $l->qty,
                'unit_price_paise' => (int) $l->unit_price_paise,
                'total_paise' => (int) ($l->qty * $l->unit_price_paise),
            ]),
            'timeline' => $events,
        ]);
    }

    public function customerOrders(Request $request): JsonResponse
    {
        $phone = $request->query('phone');
        if (! $phone) {
            return ApiResponse::error('validation.failed', 'Phone number is required.', 422);
        }
        $cleanedPhone = preg_replace('/\D/', '', $phone);
        $tenDigits = substr($cleanedPhone, -10);

        $orders = DB::table('orders')
            ->where(function ($q) use ($phone, $tenDigits) {
                $q->where('customer_phone', $phone)
                  ->orWhere('customer_phone', 'LIKE', "%{$tenDigits}");
            })
            ->orderByDesc('created_at')
            ->limit(40)
            ->get();

        $orderIds = $orders->pluck('id');
        $lines = DB::table('order_lines')
            ->whereIn('order_id', $orderIds)
            ->get(['order_id', 'store_item_id', 'name_snapshot', 'qty', 'unit_price_paise']);

        $stores = DB::table('stores')->whereIn('id', $orders->pluck('store_id'))->get()->keyBy('id');

        $result = $orders->map(function ($order) use ($lines, $stores) {
            $orderLines = $lines->where('order_id', $order->id)->values();
            $store = $stores->get($order->store_id);
            $addressData = $order->address_snapshot ? (is_string($order->address_snapshot) ? json_decode($order->address_snapshot, true) : (array) $order->address_snapshot) : [];
            $custLat = $order->latitude ?? ($addressData['latitude'] ?? null);
            $custLng = $order->longitude ?? ($addressData['longitude'] ?? null);
            $liveLoc = $order->live_location_url ?? ($addressData['live_location_url'] ?? ($custLat && $custLng ? "https://www.google.com/maps?q={$custLat},{$custLng}" : null));

            return [
                'id' => $order->id,
                'number' => $order->number,
                'status' => $order->status,
                'fulfillment' => $order->fulfillment,
                'customer_name' => $order->customer_name,
                'total_paise' => (int) $order->total_paise,
                'delivery_fee_paise' => (int) $order->delivery_fee_paise,
                'discount_paise' => (int) ($order->discount_paise ?? 0),
                'subtotal_paise' => (int) $order->subtotal_paise,
                'payment_status' => $order->payment_status,
                'payment_method' => $order->payment_method ?? 'cod',
                'created_at' => $order->created_at,
                'latitude' => $custLat ? (float) $custLat : null,
                'longitude' => $custLng ? (float) $custLng : null,
                'live_location_url' => $liveLoc,
                'delivery_status' => $order->delivery_status ?? $order->status,
                'delivery_staff_name' => $order->delivery_staff_name ?? null,
                'delivery_staff_phone' => $order->delivery_staff_phone ?? null,
                'store_slug' => $store?->public_slug ?? ($store?->slug ?? 'bangalore'),
                'store_name' => $store?->name ?? 'Retail Store',
                'items_count' => $orderLines->count(),
                'lines' => $orderLines->map(fn($l) => [
                    'store_item_id' => $l->store_item_id,
                    'name' => $l->name_snapshot,
                    'qty' => (float) $l->qty,
                    'unit_price_paise' => (int) $l->unit_price_paise,
                    'total_paise' => (int) ($l->qty * $l->unit_price_paise),
                ]),
            ];
        });

        return ApiResponse::ok($result);
    }

    public function deliveryOrders(Request $request): JsonResponse
    {
        $this->reservations->releaseExpired();
        $tenantId = $request->session()->get('tenant_id');
        if (! $tenantId && $request->user()) {
            $tenantId = DB::table('staff_profiles')->where('user_id', $request->user()->id)->value('tenant_id');
        }
        if (! $tenantId) {
            $tenantId = DB::table('staff_profiles')->value('tenant_id') ?? DB::table('tenants')->value('id');
        }

        $allTenantOrders = DB::table('orders')->where('tenant_id', $tenantId)->get(['id', 'status', 'fulfillment', 'delivery_status', 'created_at']);
        $counts = [
            'total' => $allTenantOrders->count(),
            'pending' => $allTenantOrders->filter(function ($o) {
                return (in_array($o->delivery_status, ['unassigned', 'assigned'], true) || ($o->fulfillment === 'pickup' && in_array($o->status, ['placed', 'accepted', 'packing', 'ready'], true)))
                    && ! in_array($o->status, ['delivered', 'picked_up', 'rejected', 'cancelled'], true);
            })->count(),
            'active' => $allTenantOrders->filter(function ($o) {
                return $o->delivery_status === 'out_for_delivery' || ($o->fulfillment === 'pickup' && $o->status === 'ready');
            })->count(),
            'delivered' => $allTenantOrders->filter(function ($o) {
                return $o->delivery_status === 'delivered' || $o->status === 'picked_up';
            })->count(),
        ];

        $fulfillment = $request->query('fulfillment');
        $query = DB::table('orders')->where('tenant_id', $tenantId);
        if ($fulfillment && $fulfillment !== 'all') {
            $query->where('fulfillment', $fulfillment);
        } else {
            // Default to online delivery orders, or all online orders
            $query->whereIn('fulfillment', ['delivery', 'pickup']);
        }

        $status = $request->query('status');
        if ($status && $status !== 'all') {
            if ($status === 'pending') {
                $query->where(function ($sub) {
                    $sub->whereIn('delivery_status', ['unassigned', 'assigned'])
                        ->orWhere(function ($p) {
                            $p->where('fulfillment', 'pickup')->whereIn('status', ['placed', 'accepted', 'packing', 'ready']);
                        });
                })->whereNotIn('status', ['delivered', 'picked_up', 'rejected', 'cancelled']);
            } elseif ($status === 'active' || $status === 'out_for_delivery') {
                $query->where(function ($sub) {
                    $sub->where('delivery_status', 'out_for_delivery')
                        ->orWhere(function ($p) {
                            $p->where('fulfillment', 'pickup')->where('status', 'ready');
                        });
                });
            } elseif ($status === 'delivered') {
                $query->where(function ($sub) {
                    $sub->where('delivery_status', 'delivered')
                        ->orWhere('status', 'picked_up');
                });
            } elseif ($status === 'failed') {
                $query->where('delivery_status', 'failed');
            } else {
                $query->where('delivery_status', $status);
            }
        }

        $staffId = $request->query('staff_id');
        if ($staffId) {
            $query->where('delivery_staff_id', $staffId);
        }

        $search = $request->query('search');
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('number', 'LIKE', "%{$search}%")
                  ->orWhere('customer_name', 'LIKE', "%{$search}%")
                  ->orWhere('customer_phone', 'LIKE', "%{$search}%");
            });
        }

        $orders = $query->orderByDesc('created_at')->limit(80)->get();
        $orderIds = $orders->pluck('id');
        $lines = DB::table('order_lines')->whereIn('order_id', $orderIds)->get(['order_id', 'name_snapshot', 'qty', 'unit_price_paise']);
        $stores = DB::table('stores')->whereIn('id', $orders->pluck('store_id'))->pluck('name', 'id');

        $staffList = DB::table('staff_profiles')
            ->where('tenant_id', $tenantId)
            ->where('status', 'active')
            ->get(['id', 'display_name']);

        $result = $orders->map(function ($order) use ($lines, $stores) {
            $orderLines = $lines->where('order_id', $order->id)->values();
            $address = $order->address_snapshot ? (is_string($order->address_snapshot) ? json_decode($order->address_snapshot, true) : (array) $order->address_snapshot) : [];

            $lat = $order->latitude ?? ($address['latitude'] ?? null);
            $lng = $order->longitude ?? ($address['longitude'] ?? null);
            $mapsUrl = $order->live_location_url ?? ($address['live_location_url'] ?? ($lat && $lng ? "https://www.google.com/maps?q={$lat},{$lng}" : null));

            return [
                'id' => $order->id,
                'number' => $order->number,
                'status' => $order->status,
                'fulfillment' => $order->fulfillment,
                'customer_name' => $order->customer_name,
                'customer_phone' => $order->customer_phone,
                'total_paise' => (int) $order->total_paise,
                'subtotal_paise' => (int) ($order->subtotal_paise ?? $order->total_paise),
                'delivery_fee_paise' => (int) ($order->delivery_fee_paise ?? 0),
                'discount_paise' => (int) ($order->discount_paise ?? 0),
                'payment_status' => $order->payment_status,
                'payment_method' => $order->payment_method ?? 'cod',
                'delivery_status' => $order->delivery_status ?? 'unassigned',
                'delivery_staff_id' => $order->delivery_staff_id,
                'delivery_staff_name' => $order->delivery_staff_name,
                'delivery_staff_phone' => $order->delivery_staff_phone,
                'latitude' => $lat,
                'longitude' => $lng,
                'live_location_url' => $mapsUrl,
                'address' => $address['address'] ?? ($address['address_line'] ?? ($order->address_line ?? 'Customer Address')),
                'city' => $address['city'] ?? 'Bangalore',
                'pincode' => $address['pincode'] ?? '',
                'landmark' => $address['landmark'] ?? null,
                'order_notes' => $order->order_notes ?? ($address['special_instructions'] ?? null),
                'store_name' => $stores[$order->store_id] ?? 'Main Store',
                'created_at' => $order->created_at,
                'updated_at' => $order->updated_at,
                'items_count' => (float) $orderLines->sum('qty'),
                'lines' => $orderLines->map(fn ($l) => [
                    'name' => $l->name_snapshot,
                    'qty' => (float) $l->qty,
                    'unit_price_paise' => (int) $l->unit_price_paise,
                    'total_paise' => (int) ($l->qty * $l->unit_price_paise),
                ])->values(),
            ];
        });

        return ApiResponse::ok([
            'orders' => $result,
            'counts' => $counts,
            'available_riders' => $staffList,
        ]);
    }

    public function assignDeliveryStaff(Request $request, string $orderId): JsonResponse
    {
        $tenantId = $request->session()->get('tenant_id');
        if (! $tenantId && $request->user()) {
            $tenantId = DB::table('staff_profiles')->where('user_id', $request->user()->id)->value('tenant_id');
        }
        if (! $tenantId) {
            $tenantId = DB::table('staff_profiles')->value('tenant_id') ?? DB::table('tenants')->value('id');
        }
        $data = $request->validate([
            'staff_id' => ['required', 'string'],
            'staff_name' => ['nullable', 'string', 'max:120'],
            'staff_phone' => ['nullable', 'string', 'max:30'],
        ]);

        $order = DB::table('orders')->where('id', $orderId)->where('tenant_id', $tenantId)->first();
        if (! $order) {
            return ApiResponse::error('resource.not_found', 'Order not found.', 404);
        }

        $staffName = $data['staff_name'] ?? null;
        $staffPhone = $data['staff_phone'] ?? null;
        if (! $staffName) {
            $profile = DB::table('staff_profiles')->where('id', $data['staff_id'])->first();
            $staffName = $profile?->display_name ?? 'Rider';
            if (! $staffPhone && $profile) {
                $user = DB::table('users')->where('id', $profile->user_id)->first();
                $staffPhone = $user?->phone_e164 ?? null;
            }
        }

        DB::table('orders')->where('id', $orderId)->update([
            'delivery_staff_id' => $data['staff_id'],
            'delivery_staff_name' => $staffName,
            'delivery_staff_phone' => $staffPhone,
            'delivery_status' => 'assigned',
            'updated_at' => now(),
        ]);

        DB::table('order_status_events')->insert([
            'id' => (string) Str::uuid7(),
            'order_id' => $orderId,
            'from_status' => $order->status,
            'to_status' => $order->status,
            'actor_id' => $request->user()?->id,
            'note' => "Assigned to delivery rider {$staffName}",
            'created_at' => now(),
        ]);

        return ApiResponse::ok(['assigned' => true, 'staff_name' => $staffName]);
    }

    public function updateDeliveryStatus(Request $request, string $orderId): JsonResponse
    {
        $tenantId = $request->session()->get('tenant_id');
        if (! $tenantId && $request->user()) {
            $tenantId = DB::table('staff_profiles')->where('user_id', $request->user()->id)->value('tenant_id');
        }
        if (! $tenantId) {
            $tenantId = DB::table('staff_profiles')->value('tenant_id') ?? DB::table('tenants')->value('id');
        }
        $data = $request->validate([
            'status' => ['required', 'in:assigned,out_for_delivery,delivered,failed'],
            'notes' => ['nullable', 'string', 'max:500'],
            'mark_paid' => ['nullable', 'boolean'],
        ]);

        $order = DB::table('orders')->where('id', $orderId)->where('tenant_id', $tenantId)->first();
        if (! $order) {
            return ApiResponse::error('resource.not_found', 'Order not found.', 404);
        }

        $updates = [
            'delivery_status' => $data['status'],
            'updated_at' => now(),
        ];

        if ($data['status'] === 'out_for_delivery') {
            $updates['status'] = 'out_for_delivery';
        } elseif ($data['status'] === 'delivered') {
            $updates['status'] = 'delivered';
            if (! empty($data['mark_paid']) || $order->payment_method === 'cod') {
                $updates['payment_status'] = 'paid';
            }
        }

        DB::table('orders')->where('id', $orderId)->update($updates);

        DB::table('order_status_events')->insert([
            'id' => (string) Str::uuid7(),
            'order_id' => $orderId,
            'from_status' => $order->status,
            'to_status' => $updates['status'] ?? $order->status,
            'actor_id' => $request->user()?->id,
            'note' => $data['notes'] ?? "Delivery status updated to {$data['status']}",
            'created_at' => now(),
        ]);

        return ApiResponse::ok(['updated' => true, 'delivery_status' => $data['status']]);
    }

    public function scanPickupQr(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string'],
        ]);

        $code = trim($data['code']);
        $tenantId = $request->session()->get('tenant_id');

        $query = DB::table('orders')->where(function ($q) use ($code) {
            $q->where('pickup_qr', $code)
              ->orWhere('number', $code)
              ->orWhere('id', $code);
        });

        if ($tenantId) {
            $query->where('tenant_id', $tenantId);
        }

        $order = $query->first();
        if (! $order) {
            return ApiResponse::error('resource.not_found', 'Pickup order QR code not found.', 404);
        }

        $updates = [
            'status' => 'picked_up',
            'updated_at' => now(),
        ];
        if ($order->payment_status !== 'paid' && in_array($order->payment_method, ['pay_at_store', 'cod'])) {
            $updates['payment_status'] = 'paid';
        }
        DB::table('orders')->where('id', $order->id)->update($updates);

        $store = DB::table('stores')->where('id', $order->store_id)->first();
        $lines = DB::table('order_lines')->where('order_id', $order->id)->get();

        $receipt = [
            'store_name' => $store?->name ?? 'Retail Store',
            'store_address' => $store?->address_line ?? $store?->city,
            'store_phone' => $store?->phone ?? '',
            'order_number' => $order->number,
            'customer_name' => $order->customer_name,
            'customer_phone' => $order->customer_phone,
            'date' => now()->format('d M Y, h:i A'),
            'lines' => $lines->map(fn ($l) => [
                'name' => $l->name_snapshot,
                'qty' => (float) $l->qty,
                'price' => (int) $l->unit_price_paise,
                'total' => (int) round((float) $l->qty * (int) $l->unit_price_paise),
            ])->values(),
            'subtotal_paise' => (int) $order->subtotal_paise,
            'discount_paise' => (int) $order->discount_paise,
            'delivery_fee_paise' => (int) $order->delivery_fee_paise,
            'total_paise' => (int) $order->total_paise,
            'payment_method' => strtoupper($order->payment_method ?? 'IN-STORE'),
            'payment_status' => 'PAID',
            'auto_print' => true,
        ];

        return ApiResponse::ok([
            'order' => $order,
            'receipt' => $receipt,
            'message' => "Order {$order->number} confirmed for pickup and receipt printed.",
        ]);
    }

    public function addZone(Request $request, string $store): JsonResponse
    {
        $model = $this->store($request, $store);
        if ($model instanceof JsonResponse) {
            return $model;
        }
        $data = $request->validate([
            'pincode' => ['required', 'string', 'max:12'],
            'charge_paise' => ['required', 'integer', 'min:0'],
        ]);
        DB::table('delivery_zones')->updateOrInsert(
            ['store_id' => $model->id, 'pincode' => $data['pincode']],
            [
                'id' => (string) Str::uuid7(),
                'tenant_id' => $model->tenant_id,
                'charge_paise' => $data['charge_paise'],
                'created_at' => now(),
                'updated_at' => now(),
            ],
        );

        return ApiResponse::ok(['pincode' => $data['pincode'], 'charge_paise' => $data['charge_paise']]);
    }

    public function publicItems(Request $request, string $slug): JsonResponse
    {
        $store = Store::resolvePublic($slug);
        if (! $store) {
            return ApiResponse::error('resource.not_found', 'Store not found.', 404);
        }
        $items = DB::table('store_items')
            ->where('store_id', $store->id)
            ->where('online_visible', true)
            ->whereNull('deleted_at')
            ->get();
        $categories = DB::table('tenant_categories')->where('tenant_id', $store->tenant_id)->pluck('name', 'id');
        $brands = DB::table('tenant_brands')->where('tenant_id', $store->tenant_id)->pluck('name', 'id');
        $units = DB::table('tenant_units')->where('tenant_id', $store->tenant_id)->pluck('short_name', 'id');
        $balances = DB::table('stock_balances')->where('store_id', $store->id)->pluck('on_hand', 'store_item_id');
        $needle = mb_strtolower(trim((string) $request->query('q', '')));

        $rows = $items->map(function ($item) use ($categories, $brands, $units, $balances) {
            $price = DB::table('store_item_prices')->where('store_item_id', $item->id)->orderByDesc('starts_at')->first();
            $name = $item->name_override;
            if (! $name && $item->master_product_id) {
                $name = DB::table($this->catalog('products'))->where('id', $item->master_product_id)->value('name');
            }
            $details = [];
            if (! empty($item->details)) {
                $rawDetails = is_string($item->details) ? (json_decode($item->details, true) ?: []) : (array) $item->details;
                $details = [
                    'description' => isset($rawDetails['description']) && is_string($rawDetails['description']) ? \Illuminate\Support\Str::limit($rawDetails['description'], 500) : null,
                    'type' => $rawDetails['type'] ?? null,
                    'tax_type' => $rawDetails['tax_type'] ?? null,
                ];
            }
            $firstDetailImage = null;
            if (isset($rawDetails['images']) && is_array($rawDetails['images']) && ! empty($rawDetails['images'][0]) && is_string($rawDetails['images'][0])) {
                $firstDetailImage = $rawDetails['images'][0];
            }

            return [
                'id' => $item->id,
                'name' => $name ?: $item->sku,
                'sku' => $item->sku,
                'selling_price_paise' => $price ? (int) $price->selling_price_paise : null,
                'mrp_paise' => $price ? (int) $price->mrp_paise : null,
                'category' => $item->category_id ? ($categories[$item->category_id] ?? null) : null,
                'sub_category' => ! empty($item->sub_category_id) ? ($categories[$item->sub_category_id] ?? null) : null,
                'brand' => $item->brand_id ? ($brands[$item->brand_id] ?? null) : null,
                'unit_short' => $item->unit_id ? ($units[$item->unit_id] ?? null) : null,
                'image' => $item->image ?: ($rawDetails['image'] ?? $firstDetailImage),
                'on_hand' => isset($balances[$item->id]) ? (float) $balances[$item->id] : 0.0,
                'details' => $details,
            ];
        })->values();
        if ($needle === '') {
            return ApiResponse::ok($rows);
        }
        $contains = $rows->filter(fn (array $row) => str_contains(mb_strtolower($row['name'].' '.$row['sku'].' '.($row['category'] ?? '').' '.($row['brand'] ?? '')), $needle))->values();
        if ($contains->isNotEmpty() || mb_strlen($needle) < 4) {
            return ApiResponse::ok($contains);
        }
        $fuzzy = $rows->filter(function (array $row) use ($needle) {
            $name = mb_strtolower($row['name']);
            if (levenshtein($needle, $name) <= 2) {
                return true;
            }
            foreach (preg_split('/\s+/', $name) ?: [] as $word) {
                if ($word !== '' && levenshtein($needle, $word) <= 2) {
                    return true;
                }
            }

            return false;
        })->values();

        return ApiResponse::ok($fuzzy);
    }

    public function favourites(Request $request, string $slug): JsonResponse
    {
        $store = Store::resolvePublic($slug);
        if (! $store) {
            return ApiResponse::error('resource.not_found', 'Store not found.', 404);
        }
        $phone = preg_replace('/\D+/', '', (string) $request->query('phone', '')) ?? '';
        $ids = DB::table('customer_favourites')->where('tenant_id', $store->tenant_id)->where('phone_e164', $phone)->pluck('store_item_id');

        return ApiResponse::ok($ids);
    }

    public function publicLoyalty(Request $request, string $slug): JsonResponse
    {
        $store = Store::resolvePublic($slug);
        if (! $store) {
            return ApiResponse::error('resource.not_found', 'Store not found.', 404);
        }
        $phone = preg_replace('/\D+/', '', (string) $request->query('phone', '')) ?? '';
        $customer = DB::table('customers')
            ->where('tenant_id', $store->tenant_id)
            ->where('phone_e164', $phone)
            ->whereNull('deleted_at')
            ->first();
        if (! $customer) {
            return ApiResponse::error('resource.not_found', 'No loyalty account for that mobile.', 404);
        }
        $earned = (int) DB::table('loyalty_entries')
            ->leftJoin('sales', 'sales.id', '=', 'loyalty_entries.sale_id')
            ->where('loyalty_entries.customer_id', $customer->id)
            ->where('loyalty_entries.direction', 'earn')
            ->where(function ($query) {
                $query->whereNull('sales.id')->orWhere('sales.status', '!=', 'voided');
            })
            ->sum('loyalty_entries.points');

        return ApiResponse::ok([
            'name' => $customer->name,
            'points' => (int) $customer->loyalty_points,
            'tier' => \App\Modules\Customers\Actions\PostLoyalty::tier($earned),
        ]);
    }

    public function saveFavourite(Request $request, string $slug): JsonResponse
    {
        $store = Store::resolvePublic($slug);
        if (! $store) {
            return ApiResponse::error('resource.not_found', 'Store not found.', 404);
        }
        $data = $request->validate([
            'phone' => ['required', 'string', 'max:20'],
            'store_item_id' => ['required', 'uuid'],
        ]);
        $phone = preg_replace('/\D+/', '', $data['phone']) ?? '';
        $owns = DB::table('store_items')->where('id', $data['store_item_id'])->where('store_id', $store->id)->where('online_visible', true)->exists();
        if (strlen($phone) < 10 || ! $owns) {
            return ApiResponse::error('validation.failed', 'Choose an item from this shop and a valid mobile.', 422);
        }
        DB::table('customer_favourites')->insertOrIgnore([
            'tenant_id' => $store->tenant_id,
            'phone_e164' => $phone,
            'store_item_id' => $data['store_item_id'],
            'created_at' => now(),
        ]);

        return ApiResponse::ok(['saved' => true]);
    }

    public function receiptSettings(Request $request, string $store): JsonResponse
    {
        $model = $this->store($request, $store);
        if ($model instanceof JsonResponse) {
            return $model;
        }

        return ApiResponse::ok([
            'receipt_footer' => (string) ($model->settings['receipt_footer'] ?? ''),
            'pos_settings' => $model->settings['pos'] ?? null,
            'printer_settings' => $model->settings['printer'] ?? null,
            'online_store_settings' => $model->settings['online_store'] ?? null,
            'tenant_settings' => $model->settings['tenant'] ?? null,
            'gateway_configs' => $model->settings['gateway_configs'] ?? null,
        ]);
    }

    public function updateReceiptSettings(Request $request, string $store): JsonResponse
    {
        $model = $this->store($request, $store);
        if ($model instanceof JsonResponse) {
            return $model;
        }
        $data = $request->validate([
            'receipt_footer' => ['nullable', 'string', 'max:240'],
            'pos_settings' => ['nullable', 'array'],
            'printer_settings' => ['nullable', 'array'],
            'online_store_settings' => ['nullable', 'array'],
            'tenant_settings' => ['nullable', 'array'],
            'gateway_configs' => ['nullable', 'array'],
        ]);
        $settings = $model->settings ?? [];
        if (array_key_exists('receipt_footer', $data)) {
            $settings['receipt_footer'] = trim((string) ($data['receipt_footer'] ?? ''));
        }
        if (isset($data['pos_settings']) && is_array($data['pos_settings'])) {
            $settings['pos'] = array_merge(is_array($settings['pos'] ?? null) ? $settings['pos'] : [], $data['pos_settings']);
        }
        if (isset($data['printer_settings']) && is_array($data['printer_settings'])) {
            $settings['printer'] = array_merge(is_array($settings['printer'] ?? null) ? $settings['printer'] : [], $data['printer_settings']);
        }
        if (isset($data['online_store_settings']) && is_array($data['online_store_settings'])) {
            $settings['online_store'] = array_merge(is_array($settings['online_store'] ?? null) ? $settings['online_store'] : [], $data['online_store_settings']);
            $customName = trim((string) ($settings['online_store']['basics']['storeName'] ?? ''));
            if ($customName !== '' && ! str_contains(mb_strtolower($customName), 'annapurna')) {
                $model->name = $customName;
            }
            $customSlug = trim((string) ($settings['online_store']['basics']['storeUrlPath'] ?? ''));
            if ($customSlug !== '' && $customSlug !== 'annapurna') {
                $taken = Store::query()->where('public_slug', $customSlug)->where('id', '!=', $model->id)->exists();
                if (! $taken) {
                    $model->public_slug = $customSlug;
                }
            }
        }
        if (isset($data['tenant_settings']) && is_array($data['tenant_settings'])) {
            $settings['tenant'] = array_merge(is_array($settings['tenant'] ?? null) ? $settings['tenant'] : [], $data['tenant_settings']);
            $tradeName = trim((string) ($settings['tenant']['tradeName'] ?? ''));
            if ($tradeName !== '' && ! str_contains(mb_strtolower($tradeName), 'annapurna')) {
                $model->name = $tradeName;
            }
        }
        if (isset($data['gateway_configs']) && is_array($data['gateway_configs'])) {
            $settings['gateway_configs'] = array_merge(is_array($settings['gateway_configs'] ?? null) ? $settings['gateway_configs'] : [], $data['gateway_configs']);
        }
        $model->settings = $settings;
        $model->save();

        return ApiResponse::ok([
            'receipt_footer' => (string) ($settings['receipt_footer'] ?? ''),
            'pos_settings' => $settings['pos'] ?? null,
            'printer_settings' => $settings['printer'] ?? null,
            'online_store_settings' => $settings['online_store'] ?? null,
            'tenant_settings' => $settings['tenant'] ?? null,
            'gateway_configs' => $settings['gateway_configs'] ?? null,
        ]);
    }

    public function hours(Request $request, string $store): JsonResponse
    {
        $model = $this->store($request, $store);
        if ($model instanceof JsonResponse) {
            return $model;
        }
        $hours = $this->hoursFor($model);

        return ApiResponse::ok($hours);
    }

    public function updateHours(Request $request, string $store): JsonResponse
    {
        $model = $this->store($request, $store);
        if ($model instanceof JsonResponse) {
            return $model;
        }
        $data = $request->validate([
            'open' => ['required', 'date_format:H:i'],
            'close' => ['required', 'date_format:H:i'],
        ]);
        if ($data['open'] >= $data['close']) {
            return ApiResponse::error('validation.failed', 'Closing time must be after opening time.', 422);
        }
        $settings = $model->settings ?? [];
        $settings['hours'] = ['open' => $data['open'], 'close' => $data['close']];
        $model->settings = $settings;
        $model->save();

        return ApiResponse::ok($this->hoursFor($model->fresh() ?? $model));
    }

    public function publicStore(string $slug): JsonResponse
    {
        $store = Store::resolvePublic($slug);
        if (! $store) {
            return ApiResponse::error('resource.not_found', 'Store not found.', 404);
        }
        $hours = $this->hoursFor($store);
        $categories = DB::table('tenant_categories')
            ->where('tenant_id', $store->tenant_id)
            ->whereNull('parent_id')
            ->where('online_visible', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->pluck('name');
        $zones = DB::table('delivery_zones')
            ->where('store_id', $store->id)
            ->orderBy('pincode')
            ->get(['pincode', 'charge_paise']);
        $sections = DB::table('storefront_sections')
            ->where('store_id', $store->id)
            ->orderBy('position')
            ->get(['position', 'kind', 'title']);
        $displayName = $store->settings['online_store']['basics']['storeName']
            ?? ($store->settings['tenant']['tradeName'] ?? $store->name);

        return ApiResponse::ok([
            'name' => is_string($displayName) && trim($displayName) !== '' ? $displayName : $store->name,
            'slug' => $store->public_slug,
            'address_line' => $store->address_line ?: ($store->settings['tenant']['registeredAddress'] ?? null),
            'city' => $store->city,
            'pincode' => $store->pincode,
            'lat' => $store->lat ? (float) $store->lat : null,
            'lng' => $store->lng ? (float) $store->lng : null,
            'open' => $hours['open'],
            'close' => $hours['close'],
            'open_now' => $hours['open_now'],
            'categories' => $categories,
            'delivery_zones' => $zones,
            'sections' => $sections,
            'online_store_settings' => $store->settings['online_store'] ?? null,
            'tenant_settings' => $store->settings['tenant'] ?? null,
        ]);
    }

    /**
     * @return array{open: string|null, close: string|null, open_now: bool}
     */
    private function hoursFor(Store $store): array
    {
        $hours = $store->settings['hours'] ?? null;
        $open = is_array($hours) ? ($hours['open'] ?? null) : null;
        $close = is_array($hours) ? ($hours['close'] ?? null) : null;
        if (! is_string($open) || ! is_string($close)) {
            return ['open' => null, 'close' => null, 'open_now' => true];
        }
        $now = now($store->timezone ?: 'Asia/Kolkata')->format('H:i');

        return [
            'open' => $open,
            'close' => $close,
            'open_now' => $now >= $open && $now < $close,
        ];
    }

    private function store(Request $request, string $storeId): Store|JsonResponse
    {
        $store = Store::query()->find($storeId);
        if (! $store) {
            return ApiResponse::error('resource.not_found', 'Store not found.', 404);
        }

        if ($request->user()?->kind === 'platform') {
            if ($request->hasSession() && $request->session()->get('tenant_id') !== $store->tenant_id) {
                $request->session()->put('tenant_id', $store->tenant_id);
            }
            return $store;
        }

        if ($store->tenant_id !== $request->session()->get('tenant_id')) {
            return ApiResponse::error('resource.not_found', 'Store not found.', 404);
        }

        return $store;
    }

    private function assertPin(Request $request): ?JsonResponse
    {
        $hash = DB::table('staff_profiles')
            ->where('user_id', $request->user()->id)
            ->where('tenant_id', $request->session()->get('tenant_id'))
            ->value('pin_hash');
        if (! is_string($hash) || $hash === '') {
            return null;
        }
        $pin = (string) $request->header('X-Cashier-Pin', '');
        if (! Hash::check($pin, $hash)) {
            return ApiResponse::error('auth.invalid_pin', 'The cashier PIN is wrong.', 401);
        }

        return null;
    }

    private function catalog(string $name): string
    {
        return DB::getDriverName() === 'pgsql' ? 'catalog.'.$name : 'catalog_'.$name;
    }
}
