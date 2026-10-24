<?php

namespace App\Modules\Catalog\Sources;

use App\Modules\Catalog\Models\Brand;
use App\Modules\Catalog\Models\Category;
use App\Modules\Catalog\Models\ExternalSource;
use App\Modules\Catalog\Models\Identifier;
use App\Modules\Catalog\Models\Product;
use App\Modules\Catalog\Support\Gtin;
use App\Modules\Catalog\Support\SourceEndpoint;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use InvalidArgumentException;

class OpenFactsIngestor
{
    public function pull(ExternalSource $source, int $page): int
    {
        $endpoint = $this->endpoint($source, $page);
        SourceEndpoint::assertAllowed($source->provider, $endpoint);
        $response = Http::timeout(10)->withHeaders($this->headers($source))->get($endpoint);
        if (! $response->successful()) {
            throw new InvalidArgumentException('The catalogue source returned an error.');
        }

        $imported = 0;
        foreach ($response->json('products') ?? [] as $item) {
            if (! is_array($item)) {
                continue;
            }
            if ($this->storeDraft($source->provider, $item)) {
                $imported++;
            }
        }

        return $imported;
    }

    /**
     * @param  array<string, mixed>  $item
     */
    public function storeDraft(string $provider, array $item): bool
    {
        $name = trim((string) ($item['product_name'] ?? ''));
        if ($name === '') {
            return false;
        }
        try {
            $gtin = Gtin::normalise((string) ($item['code'] ?? ''));
        } catch (\InvalidArgumentException) {
            return false;
        }
        if (Identifier::query()->where('value_normalised', $gtin)->exists()) {
            return false;
        }

        $categoryName = $this->categoryName($item);
        $brandName = $this->brandName($item);
        $category = Category::query()->firstOrCreate(
            ['slug' => Str::slug($categoryName)],
            ['name' => $categoryName, 'path' => Str::slug($categoryName)],
        );
        $brand = $brandName === '' ? null : Brand::query()->firstOrCreate(
            ['slug' => Str::slug($brandName)],
            ['name' => $brandName],
        );
        $image = $item['image_front_url'] ?? $item['image_url'] ?? null;

        $product = Product::query()->create([
            'name' => $name,
            'brand_id' => $brand?->id,
            'category_id' => $category->id,
            'tax_class_id' => null,
            'status' => 'draft',
            'source' => $provider,
            'reference_mrp_paise' => null,
            'quality_score' => 40,
            'image_url' => is_string($image) ? $image : null,
            'image_source' => $provider,
        ]);
        Identifier::query()->create([
            'product_id' => $product->id,
            'type' => 'gtin',
            'value_raw' => (string) $item['code'],
            'value_normalised' => $gtin,
            'is_primary' => true,
        ]);

        return true;
    }

    public function endpoint(ExternalSource $source, int $page): string
    {
        $configured = trim((string) ($source->config['endpoint'] ?? ''));
        $base = $configured !== '' ? $configured : 'https://world.openfoodfacts.org/api/v2/search';
        $separator = str_contains($base, '?') ? '&' : '?';

        return $base.$separator.'page_size=20&page='.$page;
    }

    /**
     * @return array<string, string>
     */
    private function headers(ExternalSource $source): array
    {
        $headers = ['User-Agent' => (string) ($source->config['user_agent'] ?? 'SelfX-RetailIngest/2.0')];
        $key = $source->apiKey();
        if ($key !== null) {
            $headers['Authorization'] = 'Bearer '.$key;
        }

        return $headers;
    }

    /**
     * @param  array<string, mixed>  $item
     */
    private function categoryName(array $item): string
    {
        $tags = $item['categories_tags'] ?? null;
        if (is_array($tags) && isset($tags[0])) {
            $tag = preg_replace('/^[a-z]{2}:/', '', (string) $tags[0]) ?? 'general';

            return Str::headline(str_replace('-', ' ', $tag));
        }
        $raw = (string) ($item['categories'] ?? $item['category'] ?? 'General');
        $first = trim(explode(',', $raw)[0]);

        return $first !== '' ? $first : 'General';
    }

    /**
     * @param  array<string, mixed>  $item
     */
    private function brandName(array $item): string
    {
        $raw = (string) ($item['brands'] ?? $item['brand'] ?? '');

        return trim(explode(',', $raw)[0]);
    }
}
