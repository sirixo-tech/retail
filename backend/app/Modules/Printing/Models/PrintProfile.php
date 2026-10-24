<?php

namespace App\Modules\Printing\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PrintProfile extends Model
{
    protected $table = 'print_profiles';

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'store_id',
        'document_kind',
        'printer_id',
        'template_id',
        'driver_name',
        'cut_mode',
        'open_drawer_on',
        'orientation',
    ];

    public function printer(): BelongsTo
    {
        return $this->belongsTo(Printer::class, 'printer_id');
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(DocumentTemplate::class, 'template_id');
    }
}
