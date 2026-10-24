<?php

namespace App\Modules\Catalog\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends CatalogModel
{
    use SoftDeletes;

    protected string $catalogName = 'products';

    protected $fillable = [
        'kind', 'parent_id', 'name', 'brand_id', 'category_id', 'tax_class_id',
        'description', 'status', 'quality_score', 'source', 'licence', 'reference_mrp_paise',
        'image_url', 'thumbnail_url', 'image_source',
    ];

    public function identifiers(): HasMany
    {
        return $this->hasMany(Identifier::class, 'product_id');
    }
}
