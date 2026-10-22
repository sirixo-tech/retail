<?php

namespace App\Modules\Catalog\Actions;

use App\Modules\Catalog\Models\Brand;
use App\Modules\Catalog\Models\Category;
use App\Modules\Catalog\Models\Identifier;
use App\Modules\Catalog\Models\Product;
use App\Modules\Catalog\Models\ProductVersion;
use App\Modules\Catalog\Models\TaxClass;
use App\Modules\Catalog\Support\Gtin;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;

class SaveProduct
{
    /**
     * @param  array<string, mixed>  $input
     */
    public function create(array $input, ?string $actorId = null): Product
    {
        $normalised = Gtin::normalise((string) $input['gtin']);
        if (Identifier::query()->where('value_normalised', $normalised)->exists()) {
            throw new InvalidArgumentException('That barcode is already on a master product.');
        }

        return DB::transaction(function () use ($input, $normalised, $actorId) {
            $product = Product::query()->create([
                'name' => $input['name'],
                'brand_id' => $input['brand_id'] ?? null,
                'category_id' => $input['category_id'] ?? null,
                'tax_class_id' => $input['tax_class_id'] ?? null,
                'description' => $input['description'] ?? null,
                'status' => 'draft',
                'source' => $input['source'] ?? 'manual',
                'reference_mrp_paise' => $input['reference_mrp_paise'] ?? null,
                'quality_score' => 0,
            ]);
            Identifier::query()->create([
                'product_id' => $product->id,
                'type' => 'gtin',
                'value_raw' => $input['gtin'],
                'value_normalised' => $normalised,
                'is_primary' => true,
            ]);
            $product->update(['quality_score' => $this->score($product)]);

            return $product->fresh('identifiers');
        });
    }

    public function publish(Product $product, ?string $actorId): Product
    {
        $product->load('identifiers');
        if ($product->identifiers->isEmpty() || ! $product->category_id || ! $product->tax_class_id) {
            throw new InvalidArgumentException('Publish needs a barcode, a category, and a tax class.');
        }

        $version = (int) ProductVersion::query()->where('product_id', $product->id)->max('version') + 1;
        $product->update([
            'status' => 'published',
            'quality_score' => $this->score($product),
        ]);
        ProductVersion::query()->create([
            'product_id' => $product->id,
            'version' => $version,
            'snapshot' => $product->fresh('identifiers')->toArray(),
            'published_at' => now(),
            'actor_id' => $actorId,
        ]);

        return $product->fresh('identifiers');
    }

    public function rollback(Product $product): Product
    {
        if ($product->status !== 'published') {
            throw new InvalidArgumentException('Only a published product can be rolled back.');
        }
        $product->update(['status' => 'draft']);

        return $product->fresh('identifiers');
    }

    public function score(Product $product): int
    {
        $product->loadMissing('identifiers');
        $score = 0;
        if ($product->identifiers->isNotEmpty()) {
            $score += 25;
        }
        if ($product->brand_id) {
            $score += 15;
        }
        if ($product->category_id) {
            $score += 15;
        }
        $tax = $product->tax_class_id ? TaxClass::query()->find($product->tax_class_id) : null;
        if ($tax && $tax->hsn !== '') {
            $score += 20;
        }
        if (strlen((string) $product->description) >= 40) {
            $score += 25;
        }

        return min(100, $score);
    }

    public function findPublishedByCode(string $raw): ?Product
    {
        try {
            $normalised = Gtin::normalise($raw);
        } catch (InvalidArgumentException) {
            return null;
        }

        $productId = Identifier::query()->where('value_normalised', $normalised)->value('product_id');
        if (! $productId) {
            return null;
        }

        return Product::query()->where('status', 'published')->find($productId);
    }

    public function categoryId(string $name): ?string
    {
        return Category::query()->where('slug', Str::slug($name))->orWhere('name', $name)->value('id');
    }

    public function brandId(string $name): ?string
    {
        return Brand::query()->where('slug', Str::slug($name))->orWhere('name', $name)->value('id');
    }
}
