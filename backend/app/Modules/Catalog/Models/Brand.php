<?php

namespace App\Modules\Catalog\Models;

use Illuminate\Database\Eloquent\SoftDeletes;

class Brand extends CatalogModel
{
    use SoftDeletes;

    protected string $catalogName = 'brands';

    protected $fillable = ['name', 'slug'];
}
