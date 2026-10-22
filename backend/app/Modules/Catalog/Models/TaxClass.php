<?php

namespace App\Modules\Catalog\Models;

class TaxClass extends CatalogModel
{
    protected string $catalogName = 'tax_classes';

    protected $fillable = ['name', 'hsn', 'gst_bps', 'cess_bps', 'effective_from'];
}
