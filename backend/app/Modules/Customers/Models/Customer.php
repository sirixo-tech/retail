<?php

namespace App\Modules\Customers\Models;

use App\Support\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Customer extends Model
{
    use HasUuids, SoftDeletes, BelongsToTenant;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $table = 'customers';

    protected $guarded = [];

    public function newUniqueId(): string
    {
        return (string) Str::uuid7();
    }
}
