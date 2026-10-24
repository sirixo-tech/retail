<?php

namespace App\Modules\Promotions\Models;

use App\Support\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Coupon extends Model
{
    use HasUuids, BelongsToTenant;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $table = 'coupons';

    protected $guarded = [];

    public function newUniqueId(): string
    {
        return (string) Str::uuid7();
    }
}
