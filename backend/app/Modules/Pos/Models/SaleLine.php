<?php

namespace App\Modules\Pos\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class SaleLine extends Model
{
    use HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $table = 'sale_lines';

    protected $guarded = [];

    public function newUniqueId(): string
    {
        return (string) Str::uuid7();
    }
}
