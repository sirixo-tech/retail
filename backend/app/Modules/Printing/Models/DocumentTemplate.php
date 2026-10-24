<?php

namespace App\Modules\Printing\Models;

use App\Support\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DocumentTemplate extends Model
{
    use BelongsToTenant;

    public bool $allowsNullTenant = true;
    protected $table = 'document_templates';

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'tenant_id',
        'kind',
        'locale',
        'content',
        'version',
        'is_locked',
        'created_by',
    ];

    protected $casts = [
        'content' => 'array',
        'is_locked' => 'boolean',
        'version' => 'integer',
    ];

    public function versions(): HasMany
    {
        return $this->hasMany(DocumentTemplateVersion::class, 'template_id')->orderBy('version_number', 'desc');
    }
}
