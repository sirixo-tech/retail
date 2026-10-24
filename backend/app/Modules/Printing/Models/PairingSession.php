<?php

namespace App\Modules\Printing\Models;

use Illuminate\Database\Eloquent\Model;

class PairingSession extends Model
{
    protected $table = 'pairing_sessions';

    public $timestamps = false;
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'code',
        'store_id',
        'agent_fingerprint',
        'device_token',
        'status',
        'expires_at',
        'created_at',
        'completed_at',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'created_at' => 'datetime',
        'completed_at' => 'datetime',
    ];
}
