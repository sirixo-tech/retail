<?php

namespace App\Modules\Inventory\Actions;

use App\Modules\Catalog\Models\Identifier;
use App\Modules\Catalog\Models\Product;
use App\Modules\Catalog\Support\Gtin;
use App\Modules\Inventory\Models\StoreItem;
use App\Modules\Plans\Models\PlanFeature;
use App\Modules\Plans\Models\Subscription;
use App\Modules\Tenancy\Models\Store;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;

class AddStoreItems
{
    public function __construct(private PostStock $stock)
    {
    }

    /**
     * @param  list<array{master_product_id: string, mrp_paise?: int|null, opening_qty?: float|int|string}>  $lines
     * @return array{added: list<array<string, mixed>>, skipped: list<array<string, string>>}
     */
    public function fromCatalog(Store $store, array $lines, int $marginBps): array
    {
        $added = [];
        $skipped = [];
        $priceListId = $this->defaultPriceList($store->tenant_id);

        foreach ($lines as $line) {
            $master = Product::query()->where('status', 'published')->find($line['master_product_id'] ?? null);
            if (! $master) {
                $skipped[] = ['id' => (string) ($line['master_product_id'] ?? ''), 'reason' => 'Not a published master product.'];
                continue;
            }

            $existing = StoreItem::query()
                ->where('store_id', $store->id)
                ->where('master_product_id', $master->id)
                ->first();
            if ($existing) {
                $added[] = $this->present($existing, $master->name);
                continue;
            }

            $mrp = $line['mrp_paise'] ?? $master->reference_mrp_paise;
            if (! $mrp) {
                $skipped[] = ['id' => $master->id, 'reason' => 'No MRP to apply the margin to.'];
                continue;
            }

            if (! $this->withinProductLimit($store->tenant_id)) {
                $skipped[] = ['id' => $master->id, 'reason' => 'Product limit reached for this plan.'];
                continue;
            }

            $barcode = Identifier::query()->where('product_id', $master->id)->where('is_primary', true)->value('value_normalised');
            if ($barcode && DB::table('store_item_barcodes')->where('tenant_id', $store->tenant_id)->where('value_normalised', $barcode)->exists()) {
                $skipped[] = ['id' => $master->id, 'reason' => 'That barcode is already used in this business.'];
                continue;
            }

            $item = DB::transaction(function () use ($store, $master, $mrp, $marginBps, $priceListId, $barcode, $line) {
                $item = StoreItem::query()->create([
                    'tenant_id' => $store->tenant_id,
                    'store_id' => $store->id,
                    'master_product_id' => $master->id,
                    'sku' => $barcode ?: ('SKU-'.Str::upper(Str::substr(str_replace('-', '', (string) Str::uuid7()), 0, 8))),
                    'online_visible' => true,
                    'track_stock' => true,
                    'status' => 'active',
                ]);

                DB::table('store_item_prices')->insert([
                    'id' => (string) Str::uuid7(),
                    'store_item_id' => $item->id,
                    'price_list_id' => $priceListId,
                    'mrp_paise' => $mrp,
                    'selling_price_paise' => $this->selling((int) $mrp, $marginBps),
                    'starts_at' => now(),
                    'ends_at' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                if ($barcode) {
                    DB::table('store_item_barcodes')->insert([
                        'id' => (string) Str::uuid7(),
                        'store_item_id' => $item->id,
                        'tenant_id' => $store->tenant_id,
                        'value_normalised' => $barcode,
                        'type' => 'gtin',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                $qty = (float) ($line['opening_qty'] ?? 0);
                if ($qty > 0) {
                    $this->stock->post($item, $qty, 'opening', null);
                }

                return $item;
            });

            $added[] = $this->present($item, $master->name);
        }

        return ['added' => $added, 'skipped' => $skipped];
    }

    /**
     * @param  array{name: string, sku: string, selling_price_paise: int, mrp_paise?: int, cost_paise?: int, gst_bps?: int, opening_qty?: float|int|string, category_id?: string|null, brand_id?: string|null, unit_id?: string|null, online_visible?: bool, reorder_point?: float|int|string}  $input
     */
    public function manual(Store $store, array $input): array
    {
        if (! $this->withinProductLimit($store->tenant_id)) {
            throw new InvalidArgumentException('limit.products');
        }
        $sku = trim($input['sku']);
        if (StoreItem::query()->where('store_id', $store->id)->where('sku', $sku)->exists()) {
            throw new InvalidArgumentException('sku.taken');
        }
        $selling = (int) $input['selling_price_paise'];
        $mrp = (int) ($input['mrp_paise'] ?? $selling);
        $item = DB::transaction(function () use ($store, $input, $sku, $selling, $mrp) {
            $details = isset($input['details']) && is_array($input['details']) ? $input['details'] : null;
            $trackStock = isset($input['track_stock'])
                ? (bool) $input['track_stock']
                : (empty($details['always_in_stock']) && ! in_array(strtolower((string) ($details['type'] ?? '')), ['service', 'service product'], true));

            $item = StoreItem::query()->create([
                'tenant_id' => $store->tenant_id,
                'store_id' => $store->id,
                'master_product_id' => null,
                'sku' => $sku,
                'name_override' => $input['name'],
                'online_visible' => (bool) ($input['online_visible'] ?? true),
                'track_stock' => $trackStock,
                'status' => (string) ($input['status'] ?? 'active'),
                'category_id' => $input['category_id'] ?? null,
                'sub_category_id' => $input['sub_category_id'] ?? null,
                'brand_id' => $input['brand_id'] ?? null,
                'unit_id' => $input['unit_id'] ?? null,
                'cost_paise' => (int) ($input['cost_paise'] ?? 0),
                'gst_bps' => (int) ($input['gst_bps'] ?? 0),
                'reorder_point' => $input['reorder_point'] ?? 0,
                'image' => $input['image'] ?? ($details['image'] ?? null),
                'details' => $details,
            ]);
            DB::table('store_item_prices')->insert([
                'id' => (string) Str::uuid7(),
                'store_item_id' => $item->id,
                'price_list_id' => $this->defaultPriceList($store->tenant_id),
                'mrp_paise' => $mrp,
                'selling_price_paise' => $selling,
                'starts_at' => now(),
                'ends_at' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            DB::table('store_item_barcodes')->insert([
                'id' => (string) Str::uuid7(),
                'store_item_id' => $item->id,
                'tenant_id' => $store->tenant_id,
                'value_normalised' => $sku,
                'type' => 'store',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $qty = (float) ($input['opening_qty'] ?? 0);
            if ($qty > 0) {
                $this->stock->post($item, $qty, 'opening', (int) ($input['cost_paise'] ?? 0) ?: null);
            } else {
                DB::table('stock_balances')->insertOrIgnore([
                    'id' => (string) Str::uuid7(),
                    'store_item_id' => $item->id,
                    'store_id' => $item->store_id,
                    'on_hand' => 0,
                    'reserved' => 0,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            return $item;
        });

        return $this->present($item, $input['name']);
    }

    public function lookup(Store $store, string $code): ?array
    {
        try {
            $normalised = Gtin::normalise($code);
        } catch (InvalidArgumentException) {
            $normalised = preg_replace('/\D+/', '', $code) ?: $code;
        }

        $itemId = DB::table('store_item_barcodes')
            ->where('tenant_id', $store->tenant_id)
            ->where('value_normalised', $normalised)
            ->value('store_item_id');

        $item = $itemId
            ? StoreItem::query()->where('store_id', $store->id)->find($itemId)
            : null;

        if (! $item) {
            $masterId = Identifier::query()->where('value_normalised', $normalised)->value('product_id');
            if ($masterId) {
                $item = StoreItem::query()->where('store_id', $store->id)->where('master_product_id', $masterId)->first();
            }
        }

        if (! $item) {
            $item = StoreItem::query()->where('store_id', $store->id)
                ->where(function ($q) use ($code, $normalised) {
                    $q->where('sku', $code)
                      ->orWhere('sku', $normalised)
                      ->orWhere('sku', 'like', "%{$code}%");
                })
                ->first();
        }

        if (! $item) {
            return null;
        }

        $masterName = $item->master_product_id
            ? Product::query()->where('id', $item->master_product_id)->value('name')
            : null;

        return $this->present($item, $masterName ?: $item->name_override ?: $item->sku);
    }

    private function selling(int $mrp, int $marginBps): int
    {
        return (int) round($mrp - ($mrp * $marginBps / 10000));
    }

    private function withinProductLimit(string $tenantId): bool
    {
        $limit = $this->limit($tenantId, 'limit.products');
        if ($limit < 0) {
            return true;
        }

        $count = StoreItem::query()->where('tenant_id', $tenantId)->count();

        return $count < $limit;
    }

    private function limit(string $tenantId, string $key): int
    {
        $planId = Subscription::query()->where('tenant_id', $tenantId)->value('plan_id');
        if (! $planId) {
            return 0;
        }

        $value = PlanFeature::query()
            ->where('plan_id', $planId)
            ->whereHas('feature', fn ($query) => $query->where('key', $key))
            ->value('value');

        return $value === null ? 0 : (int) $value;
    }

    private function defaultPriceList(string $tenantId): string
    {
        $existing = DB::table('price_lists')->where('tenant_id', $tenantId)->where('is_default', true)->value('id');
        if ($existing) {
            return $existing;
        }

        $id = (string) Str::uuid7();
        DB::table('price_lists')->insert([
            'id' => $id,
            'tenant_id' => $tenantId,
            'name' => 'Default',
            'is_default' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $id;
    }

    /**
     * @return array<string, mixed>
     */
    private function present(StoreItem $item, string $name): array
    {
        $price = DB::table('store_item_prices')
            ->where('store_item_id', $item->id)
            ->orderByDesc('starts_at')
            ->first();
        $onHand = DB::table('stock_balances')->where('store_item_id', $item->id)->value('on_hand');

        return [
            'id' => $item->id,
            'sku' => $item->sku,
            'name' => $item->name_override ?: $name,
            'master_product_id' => $item->master_product_id,
            'mrp_paise' => $price?->mrp_paise,
            'selling_price_paise' => $price?->selling_price_paise,
            'on_hand' => $onHand === null ? '0.000' : (string) $onHand,
        ];
    }
}
