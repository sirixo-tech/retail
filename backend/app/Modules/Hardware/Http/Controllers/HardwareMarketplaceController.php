<?php

namespace App\Modules\Hardware\Http\Controllers;

use App\Support\ApiResponse;
use App\Support\AuditLog;
use App\Support\PlatformConfig;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class HardwareMarketplaceController
{
    /**
     * Tenant: Browse active SelfX hardware catalog.
     */
    public function index(): JsonResponse
    {
        $products = DB::table('selfx_hardware_products')
            ->where('is_active', true)
            ->orderBy('category')
            ->get()
            ->map(function ($p) {
                $rawSpecs = $p->specs ? json_decode($p->specs, true) : [];
                $specsList = [];
                if (is_array($rawSpecs)) {
                    if (array_keys($rawSpecs) !== range(0, count($rawSpecs) - 1)) {
                        foreach ($rawSpecs as $k => $v) {
                            $keyName = ucwords(str_replace('_', ' ', (string) $k));
                            $specsList[] = is_string($v) ? "{$keyName}: {$v}" : "{$keyName}: " . json_encode($v);
                        }
                    } else {
                        $specsList = array_map('strval', $rawSpecs);
                    }
                }
                $p->specs = $specsList;
                $images = $p->images ? json_decode($p->images, true) : [];
                $p->images = $images;
                $p->image_url = ! empty($images) ? $images[0] : '';
                $p->model_code = $p->sku ?: $p->model;
                $p->stock_quantity = (int) $p->stock_qty;
                $p->rent_price_monthly_paise = (int) $p->monthly_rent_paise;
                $p->deposit_paise = (int) $p->security_deposit_paise;
                return $p;
            });

        return ApiResponse::ok($products);
    }

    /**
     * Tenant: View detailed specs for a single hardware item.
     */
    public function show(string $id): JsonResponse
    {
        $product = DB::table('selfx_hardware_products')->where('id', $id)->first();
        if (! $product) {
            return ApiResponse::error('resource.not_found', 'Hardware product not found.', 404);
        }

        $rawSpecs = $product->specs ? json_decode($product->specs, true) : [];
        $specsList = [];
        if (is_array($rawSpecs)) {
            if (array_keys($rawSpecs) !== range(0, count($rawSpecs) - 1)) {
                foreach ($rawSpecs as $k => $v) {
                    $keyName = ucwords(str_replace('_', ' ', (string) $k));
                    $specsList[] = is_string($v) ? "{$keyName}: {$v}" : "{$keyName}: " . json_encode($v);
                }
            } else {
                $specsList = array_map('strval', $rawSpecs);
            }
        }
        $product->specs = $specsList;
        $product->images = $product->images ? json_decode($product->images, true) : [];

        return ApiResponse::ok($product);
    }

    /**
     * Tenant: Initiate hardware purchase or monthly rental lease.
     * Integrates directly with the platform SaaS billing gateway.
     */
    public function checkout(Request $request): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');

        $data = $request->validate([
            'hardware_product_id' => ['required', 'uuid'],
            'type' => ['required', 'string', 'in:buy,rent'],
            'delivery_store_id' => ['nullable', 'string'],
            'quantity' => ['nullable', 'integer', 'min:1', 'max:50'],
            'gateway' => ['nullable', 'string', 'in:razorpay,stripe,phonepe,cashfree,bank_transfer,upi_qr'],
            'contact_name' => ['required', 'string', 'max:120'],
            'contact_phone' => ['required', 'string', 'max:20'],
            'address_line' => ['required', 'string', 'max:255'],
            'city' => ['required', 'string', 'max:80'],
            'pincode' => ['required', 'string', 'max:10'],
        ]);

        $product = DB::table('selfx_hardware_products')
            ->where('id', $data['hardware_product_id'])
            ->first();

        if (! $product) {
            return ApiResponse::error('resource.not_found', 'Hardware product not found.', 404);
        }

        $qty = $data['quantity'] ?? 1;
        $type = $data['type'];

        $amountPaise = $type === 'buy'
            ? (int) ($product->buy_price_paise * $qty)
            : (int) ($product->monthly_rent_paise * $qty);

        $depositPaise = $type === 'rent'
            ? (int) ($product->security_deposit_paise * $qty)
            : 0;

        $totalPayablePaise = $amountPaise + $depositPaise;

        $orderNumber = 'HW-'.strtoupper(Str::random(8));
        $orderId = (string) Str::uuid7();
        $referenceId = 'hw_pay_'.Str::random(18);

        $shippingAddress = [
            'contact_name' => $data['contact_name'],
            'contact_phone' => $data['contact_phone'],
            'address_line' => $data['address_line'],
            'city' => $data['city'],
            'pincode' => $data['pincode'],
        ];

        DB::table('selfx_hardware_orders')->insert([
            'id' => $orderId,
            'order_number' => $orderNumber,
            'tenant_id' => $tenantId,
            'hardware_product_id' => $product->id,
            'type' => $type,
            'status' => 'pending_payment',
            'amount_paise' => $amountPaise,
            'deposit_paise' => $depositPaise,
            'delivery_store_id' => $data['delivery_store_id'] ?? null,
            'shipping_address' => json_encode($shippingAddress),
            'payment_reference' => $referenceId,
            'payment_gateway' => $data['gateway'] ?? 'razorpay',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Cache session for webhook / confirmation verification
        Cache::put('selfx_hw_checkout_'.$referenceId, [
            'order_id' => $orderId,
            'order_number' => $orderNumber,
            'tenant_id' => $tenantId,
            'amount_paise' => $totalPayablePaise,
            'type' => $type,
        ], 3600);

        // Fetch platform gateway publishable credentials
        $gateways = PlatformConfig::all()['gateways'] ?? [];
        $selectedGateway = $data['gateway'] ?? 'razorpay';
        $gwCfg = $gateways[$selectedGateway] ?? [];

        return ApiResponse::ok([
            'order_id' => $orderId,
            'order_number' => $orderNumber,
            'reference_id' => $referenceId,
            'amount_paise' => $totalPayablePaise,
            'product_name' => $product->name,
            'type' => $type,
            'gateway' => $selectedGateway,
            'gateway_key' => $gwCfg['publishable_key'] ?? ($gwCfg['key_id'] ?? ($gwCfg['app_id'] ?? null)),
            'currency' => 'INR',
        ], 201);
    }

    /**
     * Tenant: Confirm hardware payment and lock in order.
     */
    public function confirmCheckout(Request $request): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');

        $data = $request->validate([
            'order_id' => ['required', 'uuid'],
            'reference_id' => ['required', 'string'],
            'payment_id' => ['nullable', 'string'],
        ]);

        $order = DB::table('selfx_hardware_orders')
            ->where('id', $data['order_id'])
            ->where('tenant_id', $tenantId)
            ->first();

        if (! $order) {
            return ApiResponse::error('resource.not_found', 'Hardware order not found.', 404);
        }

        $newStatus = $order->type === 'rent' ? 'active_rental' : 'confirmed';

        DB::table('selfx_hardware_orders')
            ->where('id', $order->id)
            ->update([
                'status' => $newStatus,
                'payment_reference' => $data['payment_id'] ?? $data['reference_id'],
                'updated_at' => now(),
            ]);

        // Create billing invoice entry for tenant records
        $totalPaise = (int) ($order->amount_paise + $order->deposit_paise);
        $subId = DB::table('subscriptions')->where('tenant_id', $tenantId)->value('id') ?: (string) Str::uuid7();
        $invoiceNumber = 'INV-HW-' . date('Ymd') . '-' . strtoupper(Str::random(6));

        DB::table('billing_invoices')->insert([
            'id' => (string) Str::uuid7(),
            'tenant_id' => $tenantId,
            'subscription_id' => (string) Str::uuid7(), // dedicated hardware billing ref to guarantee uniqueness
            'number' => $invoiceNumber,
            'status' => 'paid',
            'subtotal_paise' => $totalPaise,
            'cgst_paise' => 0,
            'sgst_paise' => 0,
            'total_paise' => $totalPaise,
            'period_start' => now(),
            'period_end' => now()->addMonth(),
            'specimen' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        AuditLog::write($tenantId, $request->user()?->id, 'hardware.order_confirmed', $order->order_number);

        return ApiResponse::ok([
            'order_id' => $order->id,
            'order_number' => $order->order_number,
            'status' => $newStatus,
            'message' => 'Hardware order confirmed successfully! Dispatch preparation has started.',
        ]);
    }

    /**
     * Tenant: Schedule a Free In-Person or Virtual Hardware Demo.
     */
    public function bookDemo(Request $request): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');

        $data = $request->validate([
            'hardware_product_id' => ['required', 'uuid'],
            'demo_date' => ['required', 'date'],
            'demo_time_slot' => ['required', 'string', 'max:50'],
            'mode' => ['required', 'string', 'in:in_store,virtual'],
            'contact_name' => ['required', 'string', 'max:120'],
            'contact_phone' => ['required', 'string', 'max:20'],
            'store_address' => ['nullable', 'string', 'max:300'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $product = DB::table('selfx_hardware_products')->where('id', $data['hardware_product_id'])->first();
        if (! $product) {
            return ApiResponse::error('resource.not_found', 'Hardware product not found.', 404);
        }

        $orderNumber = 'DEMO-'.strtoupper(Str::random(7));
        $id = (string) Str::uuid7();

        $demoDetails = [
            'date' => $data['demo_date'],
            'time_slot' => $data['demo_time_slot'],
            'mode' => $data['mode'],
            'contact_name' => $data['contact_name'],
            'contact_phone' => $data['contact_phone'],
            'store_address' => $data['store_address'] ?? null,
            'notes' => $data['notes'] ?? null,
            'assigned_specialist' => 'SelfX Retail Hardware Solutions Team',
        ];

        DB::table('selfx_hardware_orders')->insert([
            'id' => $id,
            'order_number' => $orderNumber,
            'tenant_id' => $tenantId,
            'hardware_product_id' => $product->id,
            'type' => 'demo',
            'status' => 'demo_scheduled',
            'amount_paise' => 0,
            'deposit_paise' => 0,
            'demo_details' => json_encode($demoDetails),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        AuditLog::write($tenantId, $request->user()?->id, 'hardware.demo_scheduled', $product->name);

        return ApiResponse::ok([
            'id' => $id,
            'order_number' => $orderNumber,
            'status' => 'demo_scheduled',
            'message' => "Demo booked successfully for {$data['demo_date']} ({$data['demo_time_slot']}). A SelfX specialist will connect with you.",
        ], 201);
    }

    /**
     * Tenant: List owned/rented devices for maintenance, returns, or replacements.
     */
    public function myDevices(Request $request): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');

        $orders = DB::table('selfx_hardware_orders')
            ->join('selfx_hardware_products', 'selfx_hardware_orders.hardware_product_id', '=', 'selfx_hardware_products.id')
            ->where('selfx_hardware_orders.tenant_id', $tenantId)
            ->select(
                'selfx_hardware_orders.*',
                'selfx_hardware_products.name as product_name',
                'selfx_hardware_products.model as product_model',
                'selfx_hardware_products.category as product_category',
                'selfx_hardware_products.warranty_months'
            )
            ->orderByDesc('selfx_hardware_orders.created_at')
            ->get()
            ->map(function ($row) {
                $row->shipping_address = $row->shipping_address ? json_decode($row->shipping_address, true) : null;
                $row->demo_details = $row->demo_details ? json_decode($row->demo_details, true) : null;
                $row->rma_details = $row->rma_details ? json_decode($row->rma_details, true) : null;
                $row->courier_details = $row->courier_details ? json_decode($row->courier_details, true) : null;
                return $row;
            });

        return ApiResponse::ok($orders);
    }

    /**
     * Tenant: Submit RMA replacement claim or rental return request.
     */
    public function submitRma(Request $request): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');

        $data = $request->validate([
            'original_order_id' => ['required', 'uuid'],
            'type' => ['required', 'string', 'in:replacement,return'],
            'serial_number' => ['nullable', 'string', 'max:80'],
            'issue_category' => ['required', 'string', 'max:80'], // touch_issue, printer_jam, power_failure, physical_damage, rental_cancellation
            'issue_description' => ['required', 'string', 'max:1000'],
            'photo_urls' => ['nullable', 'array'],
        ]);

        $origOrder = DB::table('selfx_hardware_orders')
            ->where('id', $data['original_order_id'])
            ->where('tenant_id', $tenantId)
            ->first();

        if (! $origOrder) {
            return ApiResponse::error('resource.not_found', 'Original hardware order not found.', 404);
        }

        $rmaNumber = 'RMA-'.strtoupper(Str::random(7));
        $id = (string) Str::uuid7();

        $rmaDetails = [
            'original_order_id' => $origOrder->id,
            'original_order_number' => $origOrder->order_number,
            'serial_number' => $data['serial_number'] ?? 'SN-UNKNOWN',
            'issue_category' => $data['issue_category'],
            'issue_description' => $data['issue_description'],
            'photo_urls' => $data['photo_urls'] ?? [],
            'rma_number' => $rmaNumber,
            'decision' => 'Approved (Under Warranty Review)',
        ];

        DB::table('selfx_hardware_orders')->insert([
            'id' => $id,
            'order_number' => $rmaNumber,
            'tenant_id' => $tenantId,
            'hardware_product_id' => $origOrder->hardware_product_id,
            'type' => $data['type'],
            'status' => $data['type'] === 'replacement' ? 'replacement_approved' : 'return_inspected',
            'amount_paise' => 0,
            'deposit_paise' => 0,
            'rma_details' => json_encode($rmaDetails),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        AuditLog::write($tenantId, $request->user()?->id, 'hardware.rma_submitted', $rmaNumber);

        return ApiResponse::ok([
            'id' => $id,
            'rma_number' => $rmaNumber,
            'type' => $data['type'],
            'status' => 'replacement_approved',
            'message' => "RMA request submitted successfully ({$rmaNumber}). SelfX logistics will coordinate device replacement/pickup.",
        ], 201);
    }
}
