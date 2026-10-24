<?php

namespace App\Modules\Catalog\Models;

use Illuminate\Support\Facades\Crypt;

class ExternalSource extends CatalogModel
{
    protected string $catalogName = 'external_sources';

    protected $fillable = [
        'provider', 'config', 'licence_note', 'enabled', 'enabled_by',
        'secret', 'last_pulled_at', 'imported_count', 'last_error',
    ];

    protected $hidden = ['secret'];

    protected function casts(): array
    {
        return [
            'config' => 'array',
            'enabled' => 'boolean',
            'last_pulled_at' => 'datetime',
        ];
    }

    public function apiKey(): ?string
    {
        if ($this->secret === null || $this->secret === '') {
            return null;
        }
        $decoded = json_decode(Crypt::decryptString($this->secret), true);

        return is_array($decoded) ? ($decoded['api_key'] ?? null) : null;
    }
}
