<?php

namespace App\Modules\Orders\Models;

use App\Support\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Order extends Model
{
    use HasUuids, BelongsToTenant;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $table = 'orders';

    protected $guarded = [];

    public function newUniqueId(): string
    {
        return (string) Str::uuid7();
    }
}
