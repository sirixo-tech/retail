<?php

namespace App\Modules\Catalog\Models;

class ImportBatch extends CatalogModel
{
    protected string $catalogName = 'import_batches';

    protected $fillable = ['source', 'filename', 'mapping', 'status', 'dry_run', 'stats'];

    protected function casts(): array
    {
        return [
            'mapping' => 'array',
            'stats' => 'array',
            'dry_run' => 'boolean',
        ];
    }
}
