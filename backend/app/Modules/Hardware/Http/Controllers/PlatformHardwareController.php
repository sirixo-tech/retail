<?php

namespace App\Modules\Hardware\Http\Controllers;

use App\Support\ApiResponse;
use App\Support\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PlatformHardwareController
{
    /**
     * List all SelfX hardware products for SuperAdmin.
     */
    public function index(): JsonResponse
    {
        $products = DB::table('selfx_hardware_products')
            ->orderByDesc('created_at')
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
     * Add a new hardware product to the SelfX catalog.
     */
    public function store(Request $request): JsonResponse
    {
        // Support aliases from SuperAdmin frontend forms
        $category = $request->input('category');
        if ($category === 'handheld') {
            $request->merge(['category' => 'handheld_pos']);
        }
        if (! $request->has('model') && $request->has('model_code')) {
            $request->merge(['model' => $request->input('model_code')]);
        }
        if (! $request->has('sku') && $request->has('model_code')) {
            $request->merge(['sku' => $request->input('model_code')]);
        }
        if (! $request->has('sku') && $request->has('model')) {
            $request->merge(['sku' => 'SX-' . strtoupper(Str::slug($request->input('model')))]);
        }
        if (! $request->has('security_deposit_paise') && $request->has('deposit_paise')) {
            $request->merge(['security_deposit_paise' => $request->input('deposit_paise')]);
        }
        if (! $request->has('monthly_rent_paise') && $request->has('rent_price_monthly_paise')) {
            $request->merge(['monthly_rent_paise' => $request->input('rent_price_monthly_paise')]);
        }
        if (! $request->has('stock_qty') && $request->has('stock_quantity')) {
            $request->merge(['stock_qty' => $request->input('stock_quantity')]);
        }
        if (! $request->has('images') && $request->has('image_url')) {
            $img = $request->input('image_url');
            $request->merge(['images' => $img ? [$img] : []]);
        }

        $data = $request->validate([
            'sku' => ['required', 'string', 'max:64', 'unique:selfx_hardware_products,sku'],
            'name' => ['required', 'string', 'max:160'],
            'model' => ['required', 'string', 'max:80'],
            'category' => ['required', 'string', 'in:kiosk,pos_terminal,handheld,handheld_pos,printer,scanner,cash_drawer,accessories'],
            'headline' => ['nullable', 'string', 'max:200'],
            'description' => ['required', 'string'],
            'specs' => ['required', 'array'],
            'buy_price_paise' => ['required', 'integer', 'min:0'],
            'monthly_rent_paise' => ['required', 'integer', 'min:0'],
            'security_deposit_paise' => ['required', 'integer', 'min:0'],
            'warranty_months' => ['nullable', 'integer', 'min:0'],
            'stock_qty' => ['nullable', 'integer', 'min:0'],
            'lead_time_days' => ['nullable', 'integer', 'min:1'],
            'images' => ['nullable', 'array'],
            'datasheet_url' => ['nullable', 'string', 'max:300'],
            'badge' => ['nullable', 'string', 'max:60'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $id = (string) Str::uuid7();
        $now = now();

        DB::table('selfx_hardware_products')->insert([
            'id' => $id,
            'sku' => strtoupper(trim($data['sku'])),
            'name' => $data['name'],
            'model' => $data['model'],
            'category' => $data['category'],
            'headline' => $data['headline'] ?? null,
            'description' => $data['description'],
            'specs' => json_encode($data['specs']),
            'buy_price_paise' => $data['buy_price_paise'],
            'monthly_rent_paise' => $data['monthly_rent_paise'],
            'security_deposit_paise' => $data['security_deposit_paise'],
            'warranty_months' => $data['warranty_months'] ?? 12,
            'stock_qty' => $data['stock_qty'] ?? 10,
            'lead_time_days' => $data['lead_time_days'] ?? 2,
            'images' => ! empty($data['images']) ? json_encode($data['images']) : json_encode([]),
            'datasheet_url' => $data['datasheet_url'] ?? null,
            'badge' => $data['badge'] ?? null,
            'is_active' => $data['is_active'] ?? true,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $created = DB::table('selfx_hardware_products')->where('id', $id)->first();
        $created->specs = $data['specs'];
        $created->images = $data['images'] ?? [];

        return ApiResponse::ok($created, 201);
    }

    /**
     * Update an existing hardware product.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $product = DB::table('selfx_hardware_products')->where('id', $id)->first();
        if (! $product) {
            return ApiResponse::error('resource.not_found', 'Hardware product not found.', 404);
        }

        $data = $request->validate([
            'sku' => ['sometimes', 'required', 'string', 'max:64', 'unique:selfx_hardware_products,sku,'.$id],
            'name' => ['sometimes', 'required', 'string', 'max:160'],
            'model' => ['sometimes', 'required', 'string', 'max:80'],
            'category' => ['sometimes', 'required', 'string', 'in:kiosk,pos_terminal,handheld_pos,printer,scanner,cash_drawer,accessories'],
            'headline' => ['sometimes', 'nullable', 'string', 'max:200'],
            'description' => ['sometimes', 'required', 'string'],
            'specs' => ['sometimes', 'required', 'array'],
            'buy_price_paise' => ['sometimes', 'required', 'integer', 'min:0'],
            'monthly_rent_paise' => ['sometimes', 'required', 'integer', 'min:0'],
            'security_deposit_paise' => ['sometimes', 'required', 'integer', 'min:0'],
            'warranty_months' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'stock_qty' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'lead_time_days' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'images' => ['sometimes', 'nullable', 'array'],
            'datasheet_url' => ['sometimes', 'nullable', 'string', 'max:300'],
            'badge' => ['sometimes', 'nullable', 'string', 'max:60'],
            'is_active' => ['sometimes', 'nullable', 'boolean'],
        ]);

        $updates = ['updated_at' => now()];

        foreach (['sku', 'name', 'model', 'category', 'headline', 'description', 'buy_price_paise', 'monthly_rent_paise', 'security_deposit_paise', 'warranty_months', 'stock_qty', 'lead_time_days', 'datasheet_url', 'badge', 'is_active'] as $f) {
            if (array_key_exists($f, $data)) {
                $updates[$f] = $data[$f];
            }
        }

        if (isset($data['specs'])) {
            $updates['specs'] = json_encode($data['specs']);
        }

        if (isset($data['images'])) {
            $updates['images'] = json_encode($data['images']);
        }

        DB::table('selfx_hardware_products')->where('id', $id)->update($updates);

        return ApiResponse::ok(['id' => $id, 'updated' => true]);
    }

    /**
     * Delete or toggle hardware product.
     */
    public function destroy(string $id): JsonResponse
    {
        DB::table('selfx_hardware_products')->where('id', $id)->delete();
        return ApiResponse::ok(['deleted' => true]);
    }

    /**
     * SuperAdmin: List all tenant hardware orders, rental leases, demo bookings, and RMA claims.
     */
    public function orders(Request $request): JsonResponse
    {
        $type = $request->query('type');
        $status = $request->query('status');

        $query = DB::table('selfx_hardware_orders')
            ->join('selfx_hardware_products', 'selfx_hardware_orders.hardware_product_id', '=', 'selfx_hardware_products.id')
            ->join('tenants', 'selfx_hardware_orders.tenant_id', '=', 'tenants.id')
            ->select(
                'selfx_hardware_orders.*',
                'selfx_hardware_products.name as product_name',
                'selfx_hardware_products.model as product_model',
                'selfx_hardware_products.category as product_category',
                'tenants.name as tenant_name',
                'tenants.slug as tenant_slug',
                'tenants.phone_e164 as tenant_phone',
                'tenants.email as tenant_email'
            )
            ->orderByDesc('selfx_hardware_orders.created_at');

        if ($type && in_array($type, ['buy', 'rent', 'demo', 'replacement', 'return'], true)) {
            $query->where('selfx_hardware_orders.type', $type);
        }

        if ($status) {
            $query->where('selfx_hardware_orders.status', $status);
        }

        $rows = $query->get()->map(function ($row) {
            $row->shipping_address = $row->shipping_address ? json_decode($row->shipping_address, true) : null;
            $row->demo_details = $row->demo_details ? json_decode($row->demo_details, true) : null;
            $row->rma_details = $row->rma_details ? json_decode($row->rma_details, true) : null;
            $row->courier_details = $row->courier_details ? json_decode($row->courier_details, true) : null;
            return $row;
        });

        return ApiResponse::ok($rows);
    }

    /**
     * SuperAdmin: Update order fulfillment status, courier dispatch tracking, or RMA decision.
     */
    public function updateOrderStatus(Request $request, string $id): JsonResponse
    {
        $order = DB::table('selfx_hardware_orders')->where('id', $id)->first();
        if (! $order) {
            return ApiResponse::error('resource.not_found', 'Hardware order not found.', 404);
        }

        $data = $request->validate([
            'status' => ['required', 'string', 'in:pending_payment,confirmed,dispatched,delivered,active_rental,demo_scheduled,demo_completed,replacement_approved,device_shipped,return_inspected,cancelled'],
            'carrier_name' => ['nullable', 'string', 'max:80'],
            'tracking_number' => ['nullable', 'string', 'max:100'],
            'tracking_url' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $updates = [
            'status' => $data['status'],
            'updated_at' => now(),
        ];

        if (! empty($data['carrier_name']) || ! empty($data['tracking_number'])) {
            $existingCourier = $order->courier_details ? json_decode($order->courier_details, true) : [];
            $updates['courier_details'] = json_encode(array_merge($existingCourier, [
                'carrier' => $data['carrier_name'] ?? ($existingCourier['carrier'] ?? 'BlueDart'),
                'tracking_number' => $data['tracking_number'] ?? ($existingCourier['tracking_number'] ?? ''),
                'tracking_url' => $data['tracking_url'] ?? ($existingCourier['tracking_url'] ?? ''),
                'dispatched_at' => now()->toIso8601String(),
                'notes' => $data['notes'] ?? null,
            ]));
        }

        DB::table('selfx_hardware_orders')->where('id', $id)->update($updates);

        return ApiResponse::ok(['id' => $id, 'status' => $data['status'], 'updated' => true]);
    }
}
