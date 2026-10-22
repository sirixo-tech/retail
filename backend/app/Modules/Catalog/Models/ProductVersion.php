<?php

namespace App\Modules\Catalog\Models;

class ProductVersion extends CatalogModel
{
    protected string $catalogName = 'product_versions';

    protected $fillable = ['product_id', 'version', 'snapshot', 'published_at', 'actor_id'];

    protected function casts(): array
    {
        return [
            'snapshot' => 'array',
            'published_at' => 'datetime',
        ];
    }
}
