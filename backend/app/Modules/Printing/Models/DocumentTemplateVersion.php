<?php

namespace App\Modules\Printing\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DocumentTemplateVersion extends Model
{
    protected $table = 'document_template_versions';

    public $timestamps = false;
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'template_id',
        'version_number',
        'content',
        'edited_by',
        'created_at',
    ];

    protected $casts = [
        'content' => 'array',
        'version_number' => 'integer',
        'created_at' => 'datetime',
    ];

    public function template(): BelongsTo
    {
        return $this->belongsTo(DocumentTemplate::class, 'template_id');
    }
}
