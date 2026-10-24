<?php

namespace App\Modules\Pos\Models;

use App\Support\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Sale extends Model
{
    use HasUuids, BelongsToTenant;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $table = 'sales';

    protected $guarded = [];

    public function newUniqueId(): string
    {
        return (string) Str::uuid7();
    }

    public function customer(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(\App\Modules\Customers\Models\Customer::class, 'customer_id');
    }

    public function lines(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(\App\Modules\Pos\Models\SaleLine::class, 'sale_id');
    }
}
