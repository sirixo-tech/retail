<?php

namespace App\Modules\Catalog\Models;

use Illuminate\Database\Eloquent\SoftDeletes;

class Category extends CatalogModel
{
    use SoftDeletes;

    protected string $catalogName = 'categories';

    protected $fillable = ['parent_id', 'name', 'slug', 'path', 'default_tax_class_id'];
}
