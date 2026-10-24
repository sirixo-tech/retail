<?php

namespace App\Jobs;

use App\Modules\Catalog\Models\Product;
use App\Modules\Catalog\Models\TaxClass;
use App\Modules\Inventory\Models\StoreItem;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SyncStoreItemFromMasterJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * @param list<string> $changedFields
     */
    public function __construct(
        public string $masterProductId,
        public array $changedFields
    ) {
    }

    public function handle(): void
    {
        $subscriptions = DB::table('catalog_subscriptions')
            ->where('master_product_id', $this->masterProductId)
            ->get();

        $master = Product::query()->find($this->masterProductId);
        if (! $master) {
            return;
        }

        foreach ($subscriptions as $sub) {
            Tenant::acting($sub->tenant_id, function () use ($sub, $master) {
                $item = StoreItem::query()->find($sub->store_item_id);
                if (! $item) {
                    return;
                }

                // Update name (only if not customized)
                if ($sub->auto_update_name && in_array('name', $this->changedFields, true)) {
                    if (empty($item->name_override)) {
                        $item->name_override = $master->name;
                    }
                }

                // Update image
                if (in_array('image_url', $this->changedFields, true) && ! empty($master->image_url)) {
                    $item->image_url = $master->image_url;
                }

                // Update price
                if ($sub->auto_update_price && in_array('reference_mrp_paise', $this->changedFields, true) && ! empty($master->reference_mrp_paise)) {
                    $priceRow = DB::table('store_item_prices')
                        ->where('store_item_id', $item->id)
                        ->whereNull('ends_at')
                        ->first();

                    if ($priceRow) {
                        DB::table('store_item_prices')->where('id', $priceRow->id)->update([
                            'mrp_paise' => $master->reference_mrp_paise,
                            'updated_at' => now(),
                        ]);
                    }
                }

                // Update tax rate
                if ($sub->auto_update_tax && in_array('tax_class_id', $this->changedFields, true) && ! empty($master->tax_class_id)) {
                    $taxClass = TaxClass::query()->find($master->tax_class_id);
                    if ($taxClass) {
                        $item->gst_bps = $taxClass->gst_bps;
                    }
                }

                $item->save();

                DB::table('catalog_subscriptions')
                    ->where('id', $sub->id)
                    ->update(['last_synced_at' => now(), 'updated_at' => now()]);
            });
        }
    }
}
