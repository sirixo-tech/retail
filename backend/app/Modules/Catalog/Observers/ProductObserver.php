<?php

namespace App\Modules\Catalog\Observers;

use App\Jobs\SyncStoreItemFromMasterJob;
use App\Modules\Catalog\Models\Product;

class ProductObserver
{
    public function updated(Product $product): void
    {
        if ($product->status !== 'published') {
            return;
        }

        $changedFields = array_keys($product->getDirty());
        $syncableFields = ['name', 'reference_mrp_paise', 'tax_class_id', 'description', 'image_url'];
        $needsSync = array_intersect($changedFields, $syncableFields);

        if (! empty($needsSync)) {
            dispatch(new SyncStoreItemFromMasterJob((string) $product->id, array_values($needsSync)));
        }
    }
}
