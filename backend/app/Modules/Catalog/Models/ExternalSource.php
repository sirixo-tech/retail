<?php

namespace App\Modules\Catalog\Models;

class ExternalSource extends CatalogModel
{
    protected string $catalogName = 'external_sources';

    protected $fillable = ['provider', 'config', 'licence_note', 'enabled', 'enabled_by'];

    protected function casts(): array
    {
        return [
            'config' => 'array',
            'enabled' => 'boolean',
        ];
    }
}
