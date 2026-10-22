<?php

namespace App\Modules\Catalog\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

abstract class CatalogModel extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected string $catalogName;

    public function getTable(): string
    {
        $name = $this->catalogName;

        return $this->getConnection()->getDriverName() === 'pgsql' ? 'catalog.'.$name : 'catalog_'.$name;
    }

    protected static function booted(): void
    {
        static::creating(function (self $model): void {
            if (! $model->getKey()) {
                $model->setAttribute($model->getKeyName(), (string) Str::uuid7());
            }
        });
    }
}
