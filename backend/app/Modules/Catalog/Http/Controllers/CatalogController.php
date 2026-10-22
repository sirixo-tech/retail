<?php

namespace App\Modules\Catalog\Http\Controllers;

use App\Modules\Catalog\Actions\ImportCatalog;
use App\Modules\Catalog\Actions\SaveProduct;
use App\Modules\Catalog\Models\Brand;
use App\Modules\Catalog\Models\Category;
use App\Modules\Catalog\Models\ExternalSource;
use App\Modules\Catalog\Models\Product;
use App\Modules\Catalog\Models\TaxClass;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

class CatalogController
{
    public function __construct(private SaveProduct $products, private ImportCatalog $imports)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $query = Product::query()->with('identifiers')->orderBy('name');
        if ($request->user()?->kind !== 'platform') {
            $query->where('status', 'published');
        } elseif ($request->query('status')) {
            $query->where('status', $request->query('status'));
        }
        if ($search = $request->query('q')) {
            $query->where('name', 'like', '%'.$search.'%');
        }

        return ApiResponse::ok($query->limit(100)->get()->map(fn (Product $product) => $this->resource($product)));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:180'],
            'gtin' => ['required', 'string', 'max:80'],
            'category_id' => ['nullable', 'uuid'],
            'brand_id' => ['nullable', 'uuid'],
            'tax_class_id' => ['nullable', 'uuid'],
            'description' => ['nullable', 'string'],
            'reference_mrp_paise' => ['nullable', 'integer', 'min:0'],
        ]);

        try {
            $product = $this->products->create($data, $request->user()?->id);
        } catch (InvalidArgumentException $e) {
            return ApiResponse::error('validation.failed', $e->getMessage(), 422);
        }

        return ApiResponse::ok($this->resource($product), 201);
    }

    public function publish(Request $request, string $product): JsonResponse
    {
        $model = Product::query()->findOrFail($product);
        try {
            $model = $this->products->publish($model, $request->user()?->id);
        } catch (InvalidArgumentException $e) {
            return ApiResponse::error('validation.failed', $e->getMessage(), 422);
        }

        return ApiResponse::ok($this->resource($model));
    }

    public function rollback(Request $request, string $product): JsonResponse
    {
        $model = Product::query()->find($product);
        if (! $model) {
            return ApiResponse::error('resource.not_found', 'Product not found.', 404);
        }
        try {
            $model = $this->products->rollback($model);
        } catch (InvalidArgumentException $e) {
            return ApiResponse::error('validation.failed', $e->getMessage(), 422);
        }

        return ApiResponse::ok($this->resource($model));
    }

    public function barcode(string $code): JsonResponse
    {
        $product = $this->products->findPublishedByCode(urldecode($code));
        if (! $product) {
            return ApiResponse::error('resource.not_found', 'No published product uses that barcode.', 404);
        }

        return ApiResponse::ok($this->resource($product->load('identifiers')));
    }

    public function categories(): JsonResponse
    {
        return ApiResponse::ok(Category::query()->orderBy('name')->get(['id', 'name', 'slug', 'path']));
    }

    public function brands(): JsonResponse
    {
        return ApiResponse::ok(Brand::query()->orderBy('name')->get(['id', 'name', 'slug']));
    }

    public function taxClasses(): JsonResponse
    {
        return ApiResponse::ok(TaxClass::query()->orderBy('name')->get(['id', 'name', 'hsn', 'gst_bps', 'cess_bps']));
    }

    public function sources(): JsonResponse
    {
        return ApiResponse::ok(ExternalSource::query()->orderBy('provider')->get());
    }

    public function updateSource(Request $request, string $provider): JsonResponse
    {
        $source = ExternalSource::query()->where('provider', $provider)->first();
        if (! $source) {
            return ApiResponse::error('resource.not_found', 'External source provider not found.', 404);
        }

        $data = $request->validate([
            'enabled' => ['nullable', 'boolean'],
            'is_enabled' => ['nullable', 'boolean'],
            'licence_note' => ['nullable', 'string'],
            'config' => ['nullable', 'array'],
        ]);

        $enabled = (bool) ($data['enabled'] ?? $data['is_enabled'] ?? false);

        if ($enabled && empty(trim((string) ($data['licence_note'] ?? '')))) {
            return ApiResponse::error('validation.failed', 'A licence note is required before enabling this catalog source.', 422);
        }

        $source->update([
            'enabled' => $enabled,
            'licence_note' => $data['licence_note'] ?? $source->licence_note,
            'config' => $data['config'] ?? $source->config,
            'enabled_by' => $request->user()?->id,
        ]);

        $fresh = $source->fresh();
        return ApiResponse::ok(array_merge($fresh->toArray(), [
            'is_enabled' => (bool) $fresh->enabled,
        ]));
    }

    public function pullSource(Request $request, string $provider): JsonResponse
    {
        $source = ExternalSource::query()->where('provider', $provider)->first();
        if (! $source) {
            return ApiResponse::error('resource.not_found', 'Catalog provider not found.', 404);
        }

        if (! $source->enabled && empty($source->licence_note)) {
            return ApiResponse::error('validation.failed', 'Source must be enabled with a licence note before pulling.', 422);
        }

        $endpoint = $source->config['endpoint'] ?? null;
        $apiKey = $source->config['api_key'] ?? null;

        if (! $endpoint) {
            return ApiResponse::error('config.missing', "No API endpoint configured for {$source->provider}. Please enter a valid provider endpoint.", 422);
        }

        $importedCount = 0;
        try {
            $headers = [
                'User-Agent' => $source->config['user_agent'] ?? 'SelfX-RetailIngest/2.0',
            ];
            if ($apiKey) {
                $headers['Authorization'] = 'Bearer '.$apiKey;
            }

            $response = \Illuminate\Support\Facades\Http::timeout(10)->withHeaders($headers)->get($endpoint);

            if ($response->successful()) {
                $payload = $response->json();
                $items = $payload['products'] ?? ($payload['data'] ?? []);
                $taxClassId = TaxClass::query()->value('id');

                foreach ($items as $item) {
                    $name = $item['product_name'] ?? ($item['name'] ?? null);
                    $gtin = $item['code'] ?? ($item['gtin'] ?? ($item['barcode'] ?? null));
                    if (! $name || ! $gtin) {
                        continue;
                    }

                    $exists = \App\Modules\Catalog\Models\Identifier::query()->where('value_normalised', $gtin)->exists();
                    if ($exists) {
                        continue;
                    }

                    $categoryName = $item['categories'] ?? ($item['category'] ?? 'General FMCG');
                    $brandName = $item['brands'] ?? ($item['brand'] ?? 'General Brand');

                    $category = Category::query()->firstOrCreate(
                        ['slug' => \Illuminate\Support\Str::slug($categoryName)],
                        ['id' => (string) \Illuminate\Support\Str::uuid7(), 'name' => $categoryName, 'path' => $categoryName]
                    );

                    $brand = Brand::query()->firstOrCreate(
                        ['slug' => \Illuminate\Support\Str::slug($brandName)],
                        ['id' => (string) \Illuminate\Support\Str::uuid7(), 'name' => $brandName]
                    );

                    $product = Product::query()->create([
                        'name' => $name,
                        'brand_id' => $brand->id,
                        'category_id' => $category->id,
                        'tax_class_id' => $taxClassId,
                        'status' => 'published',
                        'source' => $provider,
                        'reference_mrp_paise' => isset($item['mrp']) ? (int) $item['mrp'] : 0,
                        'quality_score' => 90,
                    ]);

                    \App\Modules\Catalog\Models\Identifier::query()->create([
                        'product_id' => $product->id,
                        'type' => 'gtin',
                        'value_raw' => $gtin,
                        'value_normalised' => $gtin,
                        'is_primary' => true,
                    ]);

                    $importedCount++;
                }
            }
        } catch (\Throwable $e) {
            return ApiResponse::error('ingestion.failed', "Connection error to {$endpoint}: {$e->getMessage()}", 502);
        }

        $currentConfig = $source->config ?? [];
        $currentConfig['last_pulled_at'] = now()->toIso8601String();
        $currentConfig['total_ingested'] = ($currentConfig['total_ingested'] ?? 0) + $importedCount;
        $source->update(['config' => $currentConfig]);

        return ApiResponse::ok([
            'message' => "Successfully ingested {$importedCount} verified master catalog products from {$source->provider}.",
            'provider' => $provider,
            'imported_count' => $importedCount,
            'total_source_items' => $currentConfig['total_ingested'],
        ]);
    }

    public function import(Request $request): JsonResponse
    {
        $data = $request->validate([
            'filename' => ['nullable', 'string'],
            'csv' => ['required', 'string'],
            'commit' => ['required', 'boolean'],
        ]);

        $batch = $this->imports->stage($data['csv'], $data['filename'] ?? 'upload.csv', (bool) $data['commit']);

        return ApiResponse::ok($batch);
    }

    /**
     * @return array<string, mixed>
     */
    private function resource(Product $product): array
    {
        return [
            'id' => $product->id,
            'name' => $product->name,
            'status' => $product->status,
            'quality_score' => $product->quality_score,
            'reference_mrp_paise' => $product->reference_mrp_paise,
            'category_id' => $product->category_id,
            'brand_id' => $product->brand_id,
            'tax_class_id' => $product->tax_class_id,
            'barcodes' => $product->identifiers->map(fn ($id) => [
                'type' => $id->type,
                'value' => $id->value_normalised,
            ])->values(),
        ];
    }
}
