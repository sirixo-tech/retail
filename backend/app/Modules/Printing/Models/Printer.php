<?php

namespace App\Modules\Printing\Models;

use App\Support\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Printer extends Model
{
    use SoftDeletes, BelongsToTenant;

    protected $table = 'printers';

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'tenant_id',
        'store_id',
        'name',
        'transport',
        'driver',
        'connection_params',
        'device_token',
        'status',
        'last_heartbeat_at',
    ];

    protected $casts = [
        'connection_params' => 'array',
        'last_heartbeat_at' => 'datetime',
    ];
}
