<?php

namespace App\Modules\Tenancy\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class ProvisionStep extends Model
{
    use HasUuids;

    protected $table = 'tenant_provision_steps';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['tenant_id', 'step', 'status', 'attempts', 'last_error', 'completed_at'];

    protected function casts(): array
    {
        return ['completed_at' => 'datetime'];
    }

    public function newUniqueId(): string
    {
        return (string) Str::uuid7();
    }

    public function uniqueIds(): array
    {
        return ['id'];
    }
}
