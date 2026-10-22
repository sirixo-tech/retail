<?php

namespace App\Modules\Plans\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class PlanPrice extends Model
{
    use HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['plan_id', 'cycle', 'amount_paise', 'compare_at_paise', 'currency', 'trial_days', 'active'];

    protected function casts(): array
    {
        return ['active' => 'boolean'];
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
