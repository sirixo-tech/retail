<?php

namespace App\Modules\Catalog\Models;

class ImportRow extends CatalogModel
{
    protected string $catalogName = 'import_rows';

    protected $fillable = ['batch_id', 'row_number', 'payload', 'status', 'errors', 'product_id'];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'errors' => 'array',
        ];
    }
}
