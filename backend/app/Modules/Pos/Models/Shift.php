<?php

namespace App\Modules\Pos\Models;

use App\Support\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Shift extends Model
{
    use HasUuids, BelongsToTenant;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $table = 'shifts';

    protected $guarded = [];

    public function newUniqueId(): string
    {
        return (string) Str::uuid7();
    }
}
