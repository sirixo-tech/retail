<?php

namespace App\Modules\Catalog\Models;

class Identifier extends CatalogModel
{
    protected string $catalogName = 'identifiers';

    protected $fillable = ['product_id', 'type', 'value_raw', 'value_normalised', 'is_primary'];

    protected function casts(): array
    {
        return ['is_primary' => 'boolean'];
    }
}
