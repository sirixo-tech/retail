<?php

namespace App\Modules\Printing\Models;

use App\Support\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;

class PrintJob extends Model
{
    use BelongsToTenant;
    protected $table = 'print_jobs';

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'tenant_id',
        'store_id',
        'kind',
        'sale_id',
        'command_plan',
        'cut',
        'drawer',
        'status',
        'purpose',
        'failure_reason',
        'acknowledged_at',
        'retry_count',
    ];

    protected $casts = [
        'drawer' => 'boolean',
        'command_plan' => 'array',
        'acknowledged_at' => 'datetime',
        'retry_count' => 'integer',
    ];
}
