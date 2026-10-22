<?php

namespace Database\Seeders;

use App\Modules\Catalog\Models\Brand;
use App\Modules\Catalog\Models\Category;
use App\Modules\Catalog\Models\ExternalSource;
use App\Modules\Catalog\Models\TaxClass;
use Illuminate\Database\Seeder;

class CatalogSeeder extends Seeder
{
    public function run(): void
    {
        $tax = TaxClass::query()->firstOrCreate(
            ['hsn' => '1006', 'effective_from' => '2026-04-01'],
            ['name' => 'GST 5%', 'gst_bps' => 500, 'cess_bps' => 0],
        );
        TaxClass::query()->firstOrCreate(
            ['hsn' => '0401', 'effective_from' => '2026-04-01'],
            ['name' => 'GST 0%', 'gst_bps' => 0, 'cess_bps' => 0],
        );

        foreach (['Staples' => 'staples', 'Dairy' => 'dairy', 'Fruit' => 'fruit'] as $name => $slug) {
            Category::query()->firstOrCreate(
                ['slug' => $slug],
                ['name' => $name, 'path' => $slug, 'default_tax_class_id' => $tax->id],
            );
        }

        Brand::query()->firstOrCreate(['slug' => 'hill-grain'], ['name' => 'Hill Grain']);
        Brand::query()->firstOrCreate(['slug' => 'morning-dairy'], ['name' => 'Morning Dairy']);

        foreach ([
            'open_food_facts', 'open_beauty_facts', 'open_products_facts', 'open_pet_food_facts',
            'wikidata', 'upcitemdb', 'gs1', 'paid_barcode',
        ] as $provider) {
            ExternalSource::query()->firstOrCreate(
                ['provider' => $provider],
                ['enabled' => false, 'config' => []],
            );
        }
    }
}
