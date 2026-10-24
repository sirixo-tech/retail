<?php

namespace App\Modules\Inventory\Http\Controllers;

use App\Modules\Catalog\Models\Product;
use App\Modules\Inventory\Actions\AddStoreItems;
use App\Modules\Inventory\Actions\PostStock;
use App\Modules\Inventory\Models\StoreItem;
use App\Modules\Tenancy\Models\Store;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StoreItemController
{
    public function __construct(private AddStoreItems $items, private PostStock $stock)
    {
    }

    public function index(Request $request, string $store): JsonResponse
    {
        $model = $this->store($request, $store);
        if ($model instanceof JsonResponse) {
            return $model;
        }

        $rows = StoreItem::query()->where('store_id', $model->id)->orderBy('sku')->get();
        $names = Product::query()->whereIn('id', $rows->pluck('master_product_id')->filter())->pluck('name', 'id');

        $categories = DB::table('tenant_categories')->where('tenant_id', $model->tenant_id)->pluck('name', 'id');
        $brands = DB::table('tenant_brands')->where('tenant_id', $model->tenant_id)->pluck('name', 'id');
        $units = DB::table('tenant_units')->where('tenant_id', $model->tenant_id)->get(['id', 'name', 'short_name'])->keyBy('id');

        return ApiResponse::ok($rows->map(function (StoreItem $item) use ($names, $categories, $brands, $units) {
            $price = DB::table('store_item_prices')->where('store_item_id', $item->id)->orderByDesc('starts_at')->first();
            $onHand = DB::table('stock_balances')->where('store_item_id', $item->id)->value('on_hand');
            $details = is_array($item->details) ? $item->details : [];
            $unitRow = $item->unit_id ? ($units[$item->unit_id] ?? null) : null;

            return [
                'id' => $item->id,
                'sku' => $item->sku,
                'name' => $item->name_override ?: ($names[$item->master_product_id] ?? $item->sku),
                'master_product_id' => $item->master_product_id,
                'mrp_paise' => $price ? (int) $price->mrp_paise : null,
                'selling_price_paise' => $price ? (int) $price->selling_price_paise : null,
                'cost_paise' => (int) ($item->cost_paise ?? 0),
                'wholesale_paise' => isset($details['wholesale_paise']) ? (int) $details['wholesale_paise'] : 0,
                'min_price_paise' => isset($details['min_price_paise']) ? (int) $details['min_price_paise'] : 0,
                'gst_bps' => (int) ($item->gst_bps ?? 0),
                'category_id' => $item->category_id,
                'sub_category_id' => $item->sub_category_id ?? ($details['sub_category_id'] ?? null),
                'brand_id' => $item->brand_id,
                'unit_id' => $item->unit_id,
                'category' => $item->category_id ? ($categories[$item->category_id] ?? null) : null,
                'sub_category' => ($item->sub_category_id ?? ($details['sub_category_id'] ?? null)) ? ($categories[$item->sub_category_id ?? $details['sub_category_id']] ?? null) : null,
                'brand' => $item->brand_id ? ($brands[$item->brand_id] ?? null) : null,
                'unit' => $unitRow?->name,
                'unit_short' => $unitRow?->short_name,
                'on_hand' => $onHand === null ? '0.000' : (string) $onHand,
                'reorder_point' => (string) $item->reorder_point,
                'online_visible' => (bool) $item->online_visible,
                'track_stock' => (bool) $item->track_stock,
                'status' => (string) ($item->status ?: 'active'),
                'image' => $item->image ?: ($details['image'] ?? null),
                'details' => $details,
            ];
        }));
    }

    public function fromCatalog(Request $request, string $store): JsonResponse
    {
        $model = $this->store($request, $store);
        if ($model instanceof JsonResponse) {
            return $model;
        }

        $data = $request->validate([
            'margin_bps' => ['required', 'integer', 'min:0', 'max:9000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.master_product_id' => ['required', 'uuid'],
            'items.*.mrp_paise' => ['nullable', 'integer', 'min:1'],
            'items.*.opening_qty' => ['nullable', 'numeric', 'min:0'],
        ]);

        return ApiResponse::ok($this->items->fromCatalog($model, $data['items'], (int) $data['margin_bps']));
    }

    public function bulkFromCatalog(Request $request, string $store): JsonResponse
    {
        $model = $this->store($request, $store);
        if ($model instanceof JsonResponse) {
            return $model;
        }

        $data = $request->validate([
            'master_product_ids' => ['required', 'array', 'min:1'],
            'master_product_ids.*' => ['required', 'uuid'],
            'margin_bps' => ['nullable', 'integer', 'min:0', 'max:9000'],
        ]);

        $marginBps = (int) ($data['margin_bps'] ?? 0);
        $items = array_map(fn ($id) => ['master_product_id' => $id], $data['master_product_ids']);

        $result = $this->items->fromCatalog($model, $items, $marginBps);

        return ApiResponse::ok([
            'added' => count($result['added']),
            'items' => $result['added'],
            'skipped' => $result['skipped'],
        ]);
    }

    public function getSubscription(Request $request, string $item): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $sub = DB::table('catalog_subscriptions')
            ->where('tenant_id', $tenantId)
            ->where('store_item_id', $item)
            ->first();

        if (! $sub) {
            return ApiResponse::error('subscription.not_found', 'No global catalog subscription for this item.', 404);
        }

        $sub->auto_update_price = (bool) $sub->auto_update_price;
        $sub->auto_update_name = (bool) $sub->auto_update_name;
        $sub->auto_update_description = (bool) $sub->auto_update_description;
        $sub->auto_update_tax = (bool) $sub->auto_update_tax;

        return ApiResponse::ok($sub);
    }

    public function updateSubscription(Request $request, string $item): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $data = $request->validate([
            'auto_update_price' => ['nullable', 'boolean'],
            'auto_update_name' => ['nullable', 'boolean'],
            'auto_update_description' => ['nullable', 'boolean'],
            'auto_update_tax' => ['nullable', 'boolean'],
        ]);

        $existing = DB::table('catalog_subscriptions')
            ->where('tenant_id', $tenantId)
            ->where('store_item_id', $item)
            ->first();

        if (! $existing) {
            return ApiResponse::error('subscription.not_found', 'No global catalog subscription for this item.', 404);
        }

        $update = array_filter($data, fn ($v) => $v !== null);
        $update['updated_at'] = now();

        DB::table('catalog_subscriptions')
            ->where('id', $existing->id)
            ->update($update);

        $fresh = DB::table('catalog_subscriptions')->where('id', $existing->id)->first();
        $fresh->auto_update_price = (bool) $fresh->auto_update_price;
        $fresh->auto_update_name = (bool) $fresh->auto_update_name;
        $fresh->auto_update_description = (bool) $fresh->auto_update_description;
        $fresh->auto_update_tax = (bool) $fresh->auto_update_tax;

        return ApiResponse::ok($fresh);
    }

    public function lookup(Request $request, string $store): JsonResponse
    {
        $model = $this->store($request, $store);
        if ($model instanceof JsonResponse) {
            return $model;
        }

        $code = (string) $request->query('code', '');
        $found = $this->items->lookup($model, $code);
        if (! $found) {
            return ApiResponse::error('resource.not_found', 'No store item uses that code.', 404);
        }

        return ApiResponse::ok($found);
    }

    public function adjust(Request $request, string $store): JsonResponse
    {
        $model = $this->store($request, $store);
        if ($model instanceof JsonResponse) {
            return $model;
        }

        $data = $request->validate([
            'store_item_id' => ['required', 'uuid'],
            'qty_delta' => ['required', 'numeric', 'not_in:0'],
            'reason' => ['required', 'string', 'max:40'],
        ]);

        $item = StoreItem::query()->where('store_id', $model->id)->find($data['store_item_id']);
        if (! $item) {
            return ApiResponse::error('resource.not_found', 'That item is not in this store.', 404);
        }

        $this->stock->post($item, (float) $data['qty_delta'], $data['reason'], null);
        $onHand = DB::table('stock_balances')->where('store_item_id', $item->id)->value('on_hand');

        return ApiResponse::ok(['store_item_id' => $item->id, 'on_hand' => (string) $onHand]);
    }

    public function reorder(Request $request, string $store, string $item): JsonResponse
    {
        $model = $this->store($request, $store);
        if ($model instanceof JsonResponse) {
            return $model;
        }
        $data = $request->validate([
            'reorder_point' => ['required', 'numeric', 'min:0', 'max:999999'],
        ]);
        $row = StoreItem::query()->where('store_id', $model->id)->find($item);
        if (! $row) {
            return ApiResponse::error('resource.not_found', 'That item is not in this store.', 404);
        }
        $row->reorder_point = $data['reorder_point'];
        $row->save();

        return ApiResponse::ok(['id' => $row->id, 'reorder_point' => (string) $row->reorder_point]);
    }

    public function quickKeys(Request $request, string $store): JsonResponse
    {
        $model = $this->store($request, $store);
        if ($model instanceof JsonResponse) {
            return $model;
        }
        $rows = DB::table('pos_quick_keys')
            ->where('store_id', $model->id)
            ->orderBy('position')
            ->get(['store_item_id', 'position'])
            ->map(fn ($row) => [
                'store_item_id' => $row->store_item_id,
                'position' => (int) $row->position,
            ]);

        return ApiResponse::ok($rows);
    }

    public function saveQuickKeys(Request $request, string $store): JsonResponse
    {
        $model = $this->store($request, $store);
        if ($model instanceof JsonResponse) {
            return $model;
        }
        $data = $request->validate([
            'keys' => ['present', 'array', 'max:12'],
            'keys.*.store_item_id' => ['required', 'uuid'],
            'keys.*.position' => ['required', 'integer', 'min:1', 'max:12'],
        ]);
        $positions = [];
        $items = [];
        foreach ($data['keys'] as $key) {
            if (isset($positions[$key['position']]) || isset($items[$key['store_item_id']])) {
                return ApiResponse::error('validation.failed', 'Each position and item can appear once.', 422);
            }
            $positions[$key['position']] = true;
            $items[$key['store_item_id']] = true;
            $owns = StoreItem::query()->where('store_id', $model->id)->where('id', $key['store_item_id'])->exists();
            if (! $owns) {
                return ApiResponse::error('resource.not_found', 'That item is not in this store.', 404);
            }
        }
        DB::transaction(function () use ($model, $data) {
            DB::table('pos_quick_keys')->where('store_id', $model->id)->delete();
            foreach ($data['keys'] as $key) {
                DB::table('pos_quick_keys')->insert([
                    'id' => (string) \Illuminate\Support\Str::uuid7(),
                    'tenant_id' => $model->tenant_id,
                    'store_id' => $model->id,
                    'store_item_id' => $key['store_item_id'],
                    'position' => (int) $key['position'],
                    'created_at' => now(),
                ]);
            }
        });

        return ApiResponse::ok(['count' => count($data['keys'])]);
    }

    private function store(Request $request, string $storeId): Store|JsonResponse
    {
        $store = Store::query()->find($storeId);
        if (! $store || $store->tenant_id !== $request->session()->get('tenant_id')) {
            return ApiResponse::error('resource.not_found', 'Store not found.', 404);
        }

        return $store;
    }
}
