<?php

namespace App\Modules\Inventory\Models;

use App\Support\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class StoreItem extends Model
{
    use SoftDeletes, BelongsToTenant;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'tenant_id', 'store_id', 'master_product_id', 'sku', 'name_override',
        'online_visible', 'track_stock', 'enable_batch_tracking', 'status',
        'category_id', 'sub_category_id', 'brand_id', 'unit_id', 'cost_paise', 'gst_bps', 'reorder_point', 'image', 'image_url', 'details',
    ];

    protected function casts(): array
    {
        return [
            'online_visible' => 'boolean',
            'track_stock' => 'boolean',
            'enable_batch_tracking' => 'boolean',
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
