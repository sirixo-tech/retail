<?php

namespace App\Modules\Inventory\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class StoreItem extends Model
{
    use SoftDeletes;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'tenant_id', 'store_id', 'master_product_id', 'sku', 'name_override',
        'online_visible', 'track_stock', 'status',
        'category_id', 'sub_category_id', 'brand_id', 'unit_id', 'cost_paise', 'gst_bps', 'reorder_point', 'image', 'details',
    ];

    protected function casts(): array
    {
        return [
            'online_visible' => 'boolean',
            'track_stock' => 'boolean',
            'details' => 'array',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (self $model): void {
            $model->id ??= (string) Str::uuid7();
        });
    }
}
