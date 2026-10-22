<?php

namespace App\Modules\Inventory\Http\Controllers;

use App\Modules\Inventory\Actions\AddStoreItems;
use App\Modules\Tenancy\Models\Store;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;

class TenantCatalogController
{
    public function __construct(private AddStoreItems $items)
    {
    }

    public function categories(Request $request): JsonResponse
    {
        $tenantId = $this->tenant($request);
        $rows = DB::table('tenant_categories')
            ->where('tenant_id', $tenantId)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();
        $counts = DB::table('store_items')
            ->where('tenant_id', $tenantId)
            ->whereNull('deleted_at')
            ->selectRaw('category_id, count(*) as total')
            ->groupBy('category_id')
            ->pluck('total', 'category_id');
        $subCounts = DB::table('store_items')
            ->where('tenant_id', $tenantId)
            ->whereNull('deleted_at')
            ->selectRaw('sub_category_id, count(*) as total')
            ->groupBy('sub_category_id')
            ->pluck('total', 'sub_category_id');

        return ApiResponse::ok($rows->map(function ($row) use ($counts, $subCounts) {
            $item = (array) $row;
            $item['online_visible'] = (bool) ($row->online_visible ?? true);
            $item['products_count'] = (int) (($counts[$row->id] ?? 0) + ($subCounts[$row->id] ?? 0));

            return $item;
        }));
    }

    public function storeCategory(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'code' => ['nullable', 'string', 'max:32'],
            'parent_id' => ['nullable', 'uuid'],
            'online_visible' => ['nullable', 'boolean'],
            'description' => ['nullable', 'string', 'max:240'],
            'image' => ['nullable', 'string', 'max:200000'],
            'status' => ['nullable', 'string', 'max:24'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);
        $tenantId = $this->tenant($request);
        if (! empty($data['parent_id']) && ! DB::table('tenant_categories')->where('tenant_id', $tenantId)->where('id', $data['parent_id'])->exists()) {
            return ApiResponse::error('resource.not_found', 'Parent category not found.', 404);
        }
        $code = trim((string) ($data['code'] ?? ''));
        if ($code !== '') {
            if (DB::table('tenant_categories')->where('tenant_id', $tenantId)->where('code', $code)->exists()) {
                return ApiResponse::error('conflict.duplicate', 'That category code is already used.', 422);
            }
        } else {
            $base = Str::upper(Str::substr(preg_replace('/[^A-Za-z0-9]/', '', $data['name']) ?: 'CAT', 0, 8));
            $code = $base;
            $suffix = 1;
            while (DB::table('tenant_categories')->where('tenant_id', $tenantId)->where('code', $code)->exists()) {
                $code = $base.'-'.$suffix++;
            }
        }
        $id = (string) Str::uuid7();
        DB::table('tenant_categories')->insert([
            'id' => $id,
            'tenant_id' => $tenantId,
            'parent_id' => $data['parent_id'] ?? null,
            'code' => $code,
            'name' => $data['name'],
            'online_visible' => $data['online_visible'] ?? true,
            'description' => $data['description'] ?? null,
            'image' => $data['image'] ?? null,
            'status' => $data['status'] ?? 'active',
            'sort_order' => (int) ($data['sort_order'] ?? 0),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return ApiResponse::ok(['id' => $id, 'code' => $code, 'name' => $data['name']], 201);
    }

    public function updateCategory(Request $request, string $category): JsonResponse
    {
        $tenantId = $this->tenant($request);
        $row = DB::table('tenant_categories')->where('tenant_id', $tenantId)->where('id', $category)->first();
        if (! $row) {
            return ApiResponse::error('resource.not_found', 'Category not found.', 404);
        }
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:80'],
            'code' => ['nullable', 'string', 'max:32'],
            'parent_id' => ['nullable', 'uuid'],
            'online_visible' => ['nullable', 'boolean'],
            'description' => ['nullable', 'string', 'max:240'],
            'image' => ['nullable', 'string', 'max:200000'],
            'status' => ['nullable', 'string', 'max:24'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);
        $code = trim((string) ($data['code'] ?? $row->code));
        if ($code !== $row->code && DB::table('tenant_categories')->where('tenant_id', $tenantId)->where('code', $code)->where('id', '!=', $category)->exists()) {
            return ApiResponse::error('conflict.duplicate', 'That category code is already used.', 422);
        }
        DB::table('tenant_categories')->where('id', $category)->update([
            'name' => $data['name'] ?? $row->name,
            'code' => $code,
            'parent_id' => array_key_exists('parent_id', $data) ? $data['parent_id'] : $row->parent_id,
            'online_visible' => $data['online_visible'] ?? (bool) $row->online_visible,
            'description' => array_key_exists('description', $data) ? $data['description'] : ($row->description ?? null),
            'image' => array_key_exists('image', $data) ? $data['image'] : ($row->image ?? null),
            'status' => $data['status'] ?? ($row->status ?? 'active'),
            'sort_order' => isset($data['sort_order']) ? (int) $data['sort_order'] : (int) ($row->sort_order ?? 0),
            'updated_at' => now(),
        ]);

        return ApiResponse::ok(['id' => $category]);
    }

    public function destroyCategory(Request $request, string $category): JsonResponse
    {
        $row = DB::table('tenant_categories')->where('tenant_id', $this->tenant($request))->where('id', $category)->first();
        if (! $row) {
            return ApiResponse::error('resource.not_found', 'Category not found.', 404);
        }
        if (DB::table('tenant_categories')->where('parent_id', $category)->exists() || DB::table('store_items')->where('category_id', $category)->whereNull('deleted_at')->exists()) {
            return ApiResponse::error('conflict.in_use', 'This category is still used.', 422);
        }
        DB::table('tenant_categories')->where('id', $category)->delete();

        return ApiResponse::ok(['id' => $category]);
    }

    public function brands(Request $request): JsonResponse
    {
        $tenantId = $this->tenant($request);
        $rows = DB::table('tenant_brands')->where('tenant_id', $tenantId)->orderBy('name')->get();
        $counts = DB::table('store_items')
            ->where('tenant_id', $tenantId)
            ->whereNull('deleted_at')
            ->selectRaw('brand_id, count(*) as total')
            ->groupBy('brand_id')
            ->pluck('total', 'brand_id');

        return ApiResponse::ok($rows->map(function ($row) use ($counts) {
            $item = (array) $row;
            $item['is_featured'] = (bool) ($row->is_featured ?? false);
            $item['products_count'] = (int) ($counts[$row->id] ?? 0);

            return $item;
        }));
    }

    public function storeBrand(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'code' => ['nullable', 'string', 'max:32'],
            'description' => ['nullable', 'string', 'max:240'],
            'image' => ['nullable', 'string', 'max:200000'],
            'website' => ['nullable', 'string', 'max:180'],
            'status' => ['nullable', 'string', 'max:24'],
            'is_featured' => ['nullable', 'boolean'],
        ]);
        $tenantId = $this->tenant($request);
        if (DB::table('tenant_brands')->where('tenant_id', $tenantId)->where('name', $data['name'])->exists()) {
            return ApiResponse::error('conflict.duplicate', 'That brand already exists.', 422);
        }
        $id = (string) Str::uuid7();
        $code = trim((string) ($data['code'] ?? '')) ?: Str::upper(Str::substr(preg_replace('/[^A-Za-z0-9]/', '', $data['name']) ?: 'BRD', 0, 8));
        DB::table('tenant_brands')->insert([
            'id' => $id,
            'tenant_id' => $tenantId,
            'name' => $data['name'],
            'code' => $code,
            'description' => $data['description'] ?? null,
            'image' => $data['image'] ?? null,
            'website' => $data['website'] ?? null,
            'status' => $data['status'] ?? 'active',
            'is_featured' => (bool) ($data['is_featured'] ?? false),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return ApiResponse::ok(['id' => $id, 'name' => $data['name'], 'code' => $code], 201);
    }

    public function updateBrand(Request $request, string $brand): JsonResponse
    {
        $tenantId = $this->tenant($request);
        $row = DB::table('tenant_brands')->where('tenant_id', $tenantId)->where('id', $brand)->first();
        if (! $row) {
            return ApiResponse::error('resource.not_found', 'Brand not found.', 404);
        }
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'code' => ['nullable', 'string', 'max:32'],
            'description' => ['nullable', 'string', 'max:240'],
            'image' => ['nullable', 'string', 'max:200000'],
            'website' => ['nullable', 'string', 'max:180'],
            'status' => ['nullable', 'string', 'max:24'],
            'is_featured' => ['nullable', 'boolean'],
        ]);
        if ($data['name'] !== $row->name && DB::table('tenant_brands')->where('tenant_id', $tenantId)->where('name', $data['name'])->where('id', '!=', $brand)->exists()) {
            return ApiResponse::error('conflict.duplicate', 'That brand already exists.', 422);
        }
        DB::table('tenant_brands')->where('id', $brand)->update([
            'name' => $data['name'],
            'code' => $data['code'] ?? ($row->code ?? null),
            'description' => array_key_exists('description', $data) ? $data['description'] : $row->description,
            'image' => array_key_exists('image', $data) ? $data['image'] : ($row->image ?? null),
            'website' => array_key_exists('website', $data) ? $data['website'] : ($row->website ?? null),
            'status' => $data['status'] ?? ($row->status ?? 'active'),
            'is_featured' => isset($data['is_featured']) ? (bool) $data['is_featured'] : (bool) ($row->is_featured ?? false),
            'updated_at' => now(),
        ]);

        return ApiResponse::ok(['id' => $brand]);
    }

    public function destroyBrand(Request $request, string $brand): JsonResponse
    {
        $tenantId = $this->tenant($request);
        if (! DB::table('tenant_brands')->where('tenant_id', $tenantId)->where('id', $brand)->exists()) {
            return ApiResponse::error('resource.not_found', 'Brand not found.', 404);
        }
        if (DB::table('store_items')->where('brand_id', $brand)->whereNull('deleted_at')->exists()) {
            return ApiResponse::error('conflict.in_use', 'This brand is still used.', 422);
        }
        DB::table('tenant_brands')->where('id', $brand)->delete();

        return ApiResponse::ok(['id' => $brand]);
    }

    public function units(Request $request): JsonResponse
    {
        $tenantId = $this->tenant($request);
        $rows = DB::table('tenant_units')->where('tenant_id', $tenantId)->orderBy('name')->get();
        $counts = DB::table('store_items')
            ->where('tenant_id', $tenantId)
            ->whereNull('deleted_at')
            ->selectRaw('unit_id, count(*) as total')
            ->groupBy('unit_id')
            ->pluck('total', 'unit_id');

        return ApiResponse::ok($rows->map(function ($row) use ($counts) {
            $item = (array) $row;
            $item['allow_decimal'] = (bool) ($row->allow_decimal ?? false);
            $item['products_count'] = (int) ($counts[$row->id] ?? 0);

            return $item;
        }));
    }

    public function storeUnit(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:40'],
            'short_name' => ['required', 'string', 'max:16'],
            'base_unit_id' => ['nullable', 'uuid'],
            'operator' => ['nullable', 'in:*,/'],
            'operation_value' => ['nullable', 'numeric', 'gt:0'],
            'allow_decimal' => ['nullable', 'boolean'],
            'status' => ['nullable', 'string', 'max:24'],
        ]);
        $tenantId = $this->tenant($request);
        if (DB::table('tenant_units')->where('tenant_id', $tenantId)->where('short_name', $data['short_name'])->exists()) {
            return ApiResponse::error('conflict.duplicate', 'That unit short name is already used.', 422);
        }
        $id = (string) Str::uuid7();
        DB::table('tenant_units')->insert([
            'id' => $id,
            'tenant_id' => $tenantId,
            'name' => $data['name'],
            'short_name' => $data['short_name'],
            'base_unit_id' => $data['base_unit_id'] ?? null,
            'operator' => $data['operator'] ?? '*',
            'operation_value' => $data['operation_value'] ?? 1,
            'allow_decimal' => (bool) ($data['allow_decimal'] ?? false),
            'status' => $data['status'] ?? 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return ApiResponse::ok(['id' => $id, 'name' => $data['name'], 'short_name' => $data['short_name']], 201);
    }

    public function updateUnit(Request $request, string $unit): JsonResponse
    {
        $tenantId = $this->tenant($request);
        $row = DB::table('tenant_units')->where('tenant_id', $tenantId)->where('id', $unit)->first();
        if (! $row) {
            return ApiResponse::error('resource.not_found', 'Unit not found.', 404);
        }
        $data = $request->validate([
            'name' => ['required', 'string', 'max:40'],
            'short_name' => ['required', 'string', 'max:16'],
            'base_unit_id' => ['nullable', 'uuid'],
            'operator' => ['nullable', 'in:*,/'],
            'operation_value' => ['nullable', 'numeric', 'gt:0'],
            'allow_decimal' => ['nullable', 'boolean'],
            'status' => ['nullable', 'string', 'max:24'],
        ]);
        if ($data['short_name'] !== $row->short_name && DB::table('tenant_units')->where('tenant_id', $tenantId)->where('short_name', $data['short_name'])->where('id', '!=', $unit)->exists()) {
            return ApiResponse::error('conflict.duplicate', 'That unit short name is already used.', 422);
        }
        DB::table('tenant_units')->where('id', $unit)->update([
            'name' => $data['name'],
            'short_name' => $data['short_name'],
            'base_unit_id' => array_key_exists('base_unit_id', $data) ? $data['base_unit_id'] : $row->base_unit_id,
            'operator' => $data['operator'] ?? $row->operator,
            'operation_value' => $data['operation_value'] ?? $row->operation_value,
            'allow_decimal' => isset($data['allow_decimal']) ? (bool) $data['allow_decimal'] : (bool) ($row->allow_decimal ?? false),
            'status' => $data['status'] ?? ($row->status ?? 'active'),
            'updated_at' => now(),
        ]);

        return ApiResponse::ok(['id' => $unit]);
    }

    public function destroyUnit(Request $request, string $unit): JsonResponse
    {
        if (! DB::table('tenant_units')->where('tenant_id', $this->tenant($request))->where('id', $unit)->exists()) {
            return ApiResponse::error('resource.not_found', 'Unit not found.', 404);
        }
        if (DB::table('tenant_units')->where('base_unit_id', $unit)->exists() || DB::table('store_items')->where('unit_id', $unit)->whereNull('deleted_at')->exists()) {
            return ApiResponse::error('conflict.in_use', 'This unit is still used.', 422);
        }
        DB::table('tenant_units')->where('id', $unit)->delete();

        return ApiResponse::ok(['id' => $unit]);
    }

    public function storeProduct(Request $request): JsonResponse
    {
        $store = $this->store($request);
        if ($store instanceof JsonResponse) {
            return $store;
        }
        $data = $request->validate([
            'name' => ['required', 'string', 'max:180'],
            'sku' => ['required', 'string', 'max:64'],
            'selling_price_paise' => ['required', 'integer', 'min:1'],
            'mrp_paise' => ['nullable', 'integer', 'min:1'],
            'cost_paise' => ['nullable', 'integer', 'min:0'],
            'gst_bps' => ['nullable', 'integer', 'min:0', 'max:4000'],
            'opening_qty' => ['nullable', 'numeric', 'min:0'],
            'category_id' => ['nullable', 'uuid'],
            'sub_category_id' => ['nullable', 'uuid'],
            'brand_id' => ['nullable', 'uuid'],
            'unit_id' => ['nullable', 'uuid'],
            'online_visible' => ['nullable', 'boolean'],
            'track_stock' => ['nullable', 'boolean'],
            'status' => ['nullable', 'string', 'max:24'],
            'reorder_point' => ['nullable', 'numeric', 'min:0'],
            'image' => ['nullable', 'string', 'max:300000'],
            'details' => ['nullable', 'array'],
        ]);
        try {
            $created = $this->items->manual($store, $data);
        } catch (InvalidArgumentException $e) {
            $message = $e->getMessage() === 'limit.products' ? 'The plan has no room for another product.' : 'That code is already used.';

            return ApiResponse::error($e->getMessage() === 'limit.products' ? 'entitlement.limit_exceeded' : 'conflict.duplicate', $message, 422);
        }

        return ApiResponse::ok($created, 201);
    }

    public function updateProduct(Request $request, string $item): JsonResponse
    {
        $store = $this->store($request);
        if ($store instanceof JsonResponse) {
            return $store;
        }
        $row = \App\Modules\Inventory\Models\StoreItem::query()->where('store_id', $store->id)->find($item);
        if (! $row) {
            return ApiResponse::error('resource.not_found', 'Product not found.', 404);
        }
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:180'],
            'sku' => ['sometimes', 'required', 'string', 'max:64'],
            'selling_price_paise' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'mrp_paise' => ['nullable', 'integer', 'min:0'],
            'cost_paise' => ['nullable', 'integer', 'min:0'],
            'gst_bps' => ['nullable', 'integer', 'min:0', 'max:4000'],
            'category_id' => ['nullable', 'uuid'],
            'sub_category_id' => ['nullable', 'uuid'],
            'brand_id' => ['nullable', 'uuid'],
            'unit_id' => ['nullable', 'uuid'],
            'online_visible' => ['nullable', 'boolean'],
            'track_stock' => ['nullable', 'boolean'],
            'status' => ['nullable', 'string', 'max:24'],
            'reorder_point' => ['nullable', 'numeric', 'min:0'],
            'image' => ['nullable', 'string', 'max:300000'],
            'details' => ['nullable', 'array'],
        ]);
        $sku = isset($data['sku']) ? trim($data['sku']) : $row->sku;
        if ($sku !== $row->sku && \App\Modules\Inventory\Models\StoreItem::query()->where('store_id', $store->id)->where('sku', $sku)->where('id', '!=', $row->id)->exists()) {
            return ApiResponse::error('conflict.duplicate', 'That code is already used.', 422);
        }
        $row->update([
            'name_override' => $data['name'] ?? $row->name_override,
            'sku' => $sku,
            'cost_paise' => (int) ($data['cost_paise'] ?? $row->cost_paise),
            'gst_bps' => (int) ($data['gst_bps'] ?? $row->gst_bps),
            'category_id' => array_key_exists('category_id', $data) ? $data['category_id'] : $row->category_id,
            'sub_category_id' => array_key_exists('sub_category_id', $data) ? $data['sub_category_id'] : $row->sub_category_id,
            'brand_id' => array_key_exists('brand_id', $data) ? $data['brand_id'] : $row->brand_id,
            'unit_id' => array_key_exists('unit_id', $data) ? $data['unit_id'] : $row->unit_id,
            'online_visible' => isset($data['online_visible']) ? (bool) $data['online_visible'] : $row->online_visible,
            'track_stock' => isset($data['track_stock']) ? (bool) $data['track_stock'] : $row->track_stock,
            'status' => $data['status'] ?? $row->status,
            'reorder_point' => $data['reorder_point'] ?? $row->reorder_point,
            'image' => array_key_exists('image', $data) ? $data['image'] : $row->image,
            'details' => isset($data['details']) ? array_merge(is_array($row->details) ? $row->details : [], $data['details']) : $row->details,
        ]);
        if (isset($data['selling_price_paise']) && (int) $data['selling_price_paise'] > 0) {
            $selling = (int) $data['selling_price_paise'];
            $mrp = (int) ($data['mrp_paise'] ?? $selling);
            $priceListId = DB::table('price_lists')->where('tenant_id', $store->tenant_id)->where('is_default', true)->value('id');
            if ($priceListId) {
                DB::table('store_item_prices')->insert([
                    'id' => (string) Str::uuid7(),
                    'store_item_id' => $row->id,
                    'price_list_id' => $priceListId,
                    'mrp_paise' => $mrp,
                    'selling_price_paise' => $selling,
                    'starts_at' => now(),
                    'ends_at' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        return ApiResponse::ok(['id' => $row->id]);
    }

    public function destroyProduct(Request $request, string $item): JsonResponse
    {
        $store = $this->store($request);
        if ($store instanceof JsonResponse) {
            return $store;
        }
        $row = \App\Modules\Inventory\Models\StoreItem::query()->where('store_id', $store->id)->find($item);
        if (! $row) {
            return ApiResponse::error('resource.not_found', 'Product not found.', 404);
        }
        $row->delete();

        return ApiResponse::ok(['id' => $item]);
    }

    public function importProducts(Request $request): JsonResponse
    {
        $store = $this->store($request);
        if ($store instanceof JsonResponse) {
            return $store;
        }
        $data = $request->validate(['csv' => ['required', 'string', 'max:200000']]);
        $rows = $this->csv($data['csv']);
        $added = 0;
        $skipped = [];
        foreach ($rows as $index => $row) {
            $name = trim((string) ($row['name'] ?? ''));
            $code = trim((string) ($row['code'] ?? ''));
            $price = $this->rupees($row['retail_price'] ?? $row['price'] ?? '');
            if ($name === '' || $code === '' || $price < 1) {
                $skipped[] = ['line' => $index + 2, 'reason' => 'Name, code, and retail price are required.'];
                continue;
            }
            try {
                $this->items->manual($store, [
                    'name' => $name,
                    'sku' => $code,
                    'selling_price_paise' => $price,
                    'mrp_paise' => $price,
                    'cost_paise' => $this->rupees($row['cost'] ?? '0'),
                    'opening_qty' => 0,
                    'category_id' => $this->ensureCategory($store->tenant_id, $row['category'] ?? '', $row['sub_category'] ?? ''),
                    'brand_id' => $this->ensureBrand($store->tenant_id, $row['brand'] ?? ''),
                    'unit_id' => $this->ensureUnit($store->tenant_id, $row['unit'] ?? ''),
                    'reorder_point' => $row['stock_alert'] ?? 0,
                ]);
                $added++;
            } catch (InvalidArgumentException $e) {
                $skipped[] = ['line' => $index + 2, 'reason' => $e->getMessage()];
            }
        }

        return ApiResponse::ok(['added' => $added, 'skipped' => $skipped]);
    }

    public function updatePrices(Request $request): JsonResponse
    {
        $store = $this->store($request);
        if ($store instanceof JsonResponse) {
            return $store;
        }
        $data = $request->validate(['csv' => ['required', 'string', 'max:200000']]);
        $updated = 0;
        $skipped = [];
        foreach ($this->csv($data['csv']) as $index => $row) {
            $item = DB::table('store_items')->where('store_id', $store->id)->where('sku', trim((string) ($row['code'] ?? '')))->first();
            $price = $this->rupees($row['retail_price'] ?? '');
            if (! $item || $price < 1) {
                $skipped[] = ['line' => $index + 2, 'reason' => 'No matching product code.'];
                continue;
            }
            DB::table('store_item_prices')->insert([
                'id' => (string) Str::uuid7(),
                'store_item_id' => $item->id,
                'price_list_id' => DB::table('price_lists')->where('tenant_id', $store->tenant_id)->where('is_default', true)->value('id'),
                'mrp_paise' => $price,
                'selling_price_paise' => $price,
                'starts_at' => now(),
                'ends_at' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            DB::table('store_items')->where('id', $item->id)->update([
                'cost_paise' => $this->rupees($row['cost'] ?? '0'),
                'updated_at' => now(),
            ]);
            $updated++;
        }

        return ApiResponse::ok(['updated' => $updated, 'skipped' => $skipped]);
    }

    public function openingStock(Request $request): JsonResponse
    {
        $store = $this->store($request);
        if ($store instanceof JsonResponse) {
            return $store;
        }
        $data = $request->validate(['csv' => ['required', 'string', 'max:200000']]);
        $posted = 0;
        $skipped = [];
        foreach ($this->csv($data['csv']) as $index => $row) {
            $code = trim((string) ($row['product_code'] ?? $row['code'] ?? ''));
            $qty = (float) ($row['qty'] ?? 0);
            $item = DB::table('store_items')->where('store_id', $store->id)->where('sku', $code)->first();
            if (! $item || $qty <= 0) {
                $skipped[] = ['line' => $index + 2, 'reason' => 'Code and a positive quantity are required.'];
                continue;
            }
            $model = \App\Modules\Inventory\Models\StoreItem::query()->find($item->id);
            app(\App\Modules\Inventory\Actions\PostStock::class)->post($model, $qty, 'opening', null);
            $posted++;
        }

        return ApiResponse::ok(['posted' => $posted, 'skipped' => $skipped]);
    }

    public function labels(Request $request): JsonResponse
    {
        $store = $this->store($request);
        if ($store instanceof JsonResponse) {
            return $store;
        }
        $rows = DB::table('store_items')
            ->leftJoin('store_item_prices', 'store_item_prices.store_item_id', '=', 'store_items.id')
            ->where('store_items.store_id', $store->id)
            ->whereNull('store_items.deleted_at')
            ->orderBy('store_items.sku')
            ->limit(40)
            ->get(['store_items.sku', 'store_items.name_override', 'store_item_prices.selling_price_paise']);

        return ApiResponse::ok($rows->map(fn ($row) => [
            'sku' => $row->sku,
            'name' => $row->name_override ?: $row->sku,
            'selling_price_paise' => (int) ($row->selling_price_paise ?? 0),
        ])->values());
    }

    private function tenant(Request $request): string
    {
        return (string) $request->session()->get('tenant_id');
    }

    private function store(Request $request): Store|JsonResponse
    {
        $store = Store::query()->where('tenant_id', $this->tenant($request))->where('is_default', true)->first()
            ?? Store::query()->where('tenant_id', $this->tenant($request))->first();
        if (! $store) {
            return ApiResponse::error('resource.not_found', 'Store not found.', 404);
        }

        return $store;
    }

    /**
     * @return list<array<string, string>>
     */
    private function csv(string $csv): array
    {
        $lines = array_values(array_filter(preg_split('/\r\n|\n|\r/', trim($csv)) ?: [], fn ($line) => trim($line) !== ''));
        if ($lines === []) {
            return [];
        }
        $headers = array_map(fn ($cell) => strtolower(trim($cell)), str_getcsv($lines[0]));
        $rows = [];
        for ($index = 1; $index < count($lines); $index++) {
            $cells = str_getcsv($lines[$index]);
            $row = [];
            foreach ($headers as $position => $header) {
                $row[$header] = trim((string) ($cells[$position] ?? ''));
            }
            $rows[] = $row;
        }

        return $rows;
    }

    private function rupees(string $value): int
    {
        $number = (float) str_replace([',', '₹'], '', $value);

        return (int) round($number * 100);
    }

    private function ensureCategory(string $tenantId, string $category, string $child): ?string
    {
        $parent = null;
        if (trim($category) !== '') {
            $parent = $this->categoryId($tenantId, $category, null);
        }
        if (trim($child) !== '') {
            return $this->categoryId($tenantId, $child, $parent);
        }

        return $parent;
    }

    private function categoryId(string $tenantId, string $name, ?string $parentId): string
    {
        $existing = DB::table('tenant_categories')->where('tenant_id', $tenantId)->where('name', $name)->value('id');
        if ($existing) {
            return $existing;
        }
        $id = (string) Str::uuid7();
        DB::table('tenant_categories')->insert([
            'id' => $id,
            'tenant_id' => $tenantId,
            'parent_id' => $parentId,
            'code' => Str::upper(Str::substr(preg_replace('/[^A-Za-z0-9]/', '', $name) ?: 'CAT', 0, 12)),
            'name' => $name,
            'online_visible' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $id;
    }

    private function ensureBrand(string $tenantId, string $name): ?string
    {
        $name = trim($name);
        if ($name === '') {
            return null;
        }
        $existing = DB::table('tenant_brands')->where('tenant_id', $tenantId)->where('name', $name)->value('id');
        if ($existing) {
            return $existing;
        }
        $id = (string) Str::uuid7();
        DB::table('tenant_brands')->insert([
            'id' => $id,
            'tenant_id' => $tenantId,
            'name' => $name,
            'description' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $id;
    }

    private function ensureUnit(string $tenantId, string $short): ?string
    {
        $short = trim($short);
        if ($short === '') {
            return null;
        }
        $existing = DB::table('tenant_units')->where('tenant_id', $tenantId)->where('short_name', $short)->value('id');
        if ($existing) {
            return $existing;
        }
        $id = (string) Str::uuid7();
        DB::table('tenant_units')->insert([
            'id' => $id,
            'tenant_id' => $tenantId,
            'name' => $short,
            'short_name' => $short,
            'base_unit_id' => null,
            'operator' => '*',
            'operation_value' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $id;
    }
}
