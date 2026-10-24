<?php

namespace App\Modules\Catalog\Http\Controllers;

use App\Modules\Catalog\Actions\ImportCatalog;
use App\Modules\Catalog\Actions\SaveProduct;
use App\Modules\Catalog\Jobs\IngestCatalogPage;
use App\Modules\Catalog\Models\Brand;
use App\Modules\Catalog\Models\Category;
use App\Modules\Catalog\Models\ExternalSource;
use App\Modules\Catalog\Models\Product;
use App\Modules\Catalog\Models\TaxClass;
use App\Modules\Catalog\Support\SourceEndpoint;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\RateLimiter;
use InvalidArgumentException;

class CatalogController
{
    public function __construct(private SaveProduct $products, private ImportCatalog $imports)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $query = Product::query()->with('identifiers');
        if ($request->user()?->kind !== 'platform') {
            $query->where('status', 'published');
        } elseif ($request->query('status')) {
            $query->where('status', $request->query('status'));
        }

        if ($search = $request->query('q')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', '%'.$search.'%')
                  ->orWhere('description', 'like', '%'.$search.'%')
                  ->orWhereHas('identifiers', function ($iq) use ($search) {
                      $iq->where('value_normalised', 'like', '%'.$search.'%');
                  });
            });
        }

        if ($categoryId = $request->query('category_id')) {
            $query->where('category_id', $categoryId);
        }

        if ($brandId = $request->query('brand_id')) {
            $query->where('brand_id', $brandId);
        }

        if ($minPrice = $request->query('min_price_paise')) {
            $query->where('reference_mrp_paise', '>=', (int) $minPrice);
        }

        if ($maxPrice = $request->query('max_price_paise')) {
            $query->where('reference_mrp_paise', '<=', (int) $maxPrice);
        }

        $sort = (string) $request->query('sort', 'name:asc');
        [$sortField, $sortDir] = str_contains($sort, ':') ? explode(':', $sort, 2) : [$sort, 'asc'];
        $sortDir = strtolower($sortDir) === 'desc' ? 'desc' : 'asc';
        if ($sortField === 'price') {
            $query->orderBy('reference_mrp_paise', $sortDir);
        } else {
            $query->orderBy('name', $sortDir);
        }

        if ($request->has('page') || $request->has('per_page')) {
            $perPage = max(1, min(100, (int) $request->query('per_page', 50)));
            $paginated = $query->paginate($perPage);

            return response()->json([
                'data' => $paginated->getCollection()->map(fn (Product $p) => $this->resource($p))->values(),
                'meta' => [
                    'current_page' => $paginated->currentPage(),
                    'per_page' => $paginated->perPage(),
                    'total' => $paginated->total(),
                    'last_page' => $paginated->lastPage(),
                ],
            ]);
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
            'image' => ['nullable'],
            'image_url' => ['nullable', 'string', 'max:500'],
        ]);

        if ($request->hasFile('image')) {
            $uploaded = app(\App\Services\ImageUploadService::class)->uploadProductImage(
                $request->file('image'),
                (string) \Illuminate\Support\Str::uuid7()
            );
            $data['image_url'] = $uploaded['image_url'];
            $data['thumbnail_url'] = $uploaded['thumbnail_url'];
        }

        try {
            $product = $this->products->create($data, $request->user()?->id);
            if (! empty($data['image_url'])) {
                $product->image_url = $data['image_url'];
                $product->thumbnail_url = $data['thumbnail_url'] ?? null;
                $product->save();
            }
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
        return ApiResponse::ok(ExternalSource::query()->orderBy('provider')->get()->map(fn (ExternalSource $source) => $this->presentSource($source)));
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

        if ($enabled && empty(trim((string) ($data['licence_note'] ?? $source->licence_note ?? '')))) {
            return ApiResponse::error('validation.failed', 'A licence note is required before enabling this catalog source.', 422);
        }

        $config = $data['config'] ?? $source->config ?? [];
        if (isset($data['config'])) {
            $secret = $this->sealSecrets($config, $source->secret);
            unset($config['api_key'], $config['api_secret']);
            if ($secret !== null) {
                $source->secret = $secret;
            }
            if (! empty($config['endpoint'])) {
                try {
                    SourceEndpoint::assertAllowed($provider, (string) $config['endpoint']);
                } catch (InvalidArgumentException $e) {
                    return ApiResponse::error('validation.failed', $e->getMessage(), 422);
                }
            }
        }

        $source->fill([
            'enabled' => $enabled,
            'licence_note' => $data['licence_note'] ?? $source->licence_note,
            'config' => $config,
            'enabled_by' => $request->user()?->id,
        ]);
        $source->save();

        return ApiResponse::ok($this->presentSource($source->fresh()));
    }

    public function pullSource(Request $request, string $provider): JsonResponse
    {
        $source = ExternalSource::query()->where('provider', $provider)->first();
        if (! $source) {
            return ApiResponse::error('resource.not_found', 'Catalog provider not found.', 404);
        }
        if (! $source->enabled) {
            return ApiResponse::error('validation.failed', 'Enable the source before pulling.', 422);
        }
        if (! $request->boolean('confirm')) {
            return ApiResponse::error('validation.failed', 'Confirm the pull before it starts.', 422);
        }
        if (! SourceEndpoint::supports($provider)) {
            return ApiResponse::error('catalog.adapter_missing', 'This source does not have an ingest adapter.', 422);
        }
        if (RateLimiter::tooManyAttempts('catalog-pull:'.$request->user()?->id, 10)) {
            return ApiResponse::error('rate.limited', 'Too many catalogue pulls. Wait a minute.', 429);
        }
        RateLimiter::hit('catalog-pull:'.$request->user()?->id, 60);

        IngestCatalogPage::dispatch($provider, 1);

        return ApiResponse::ok([
            'status' => 'queued',
            'provider' => $provider,
            'imported_count' => (int) $source->fresh()->imported_count,
            'last_error' => $source->fresh()->last_error,
        ], 202);
    }

    /**
     * @param  array<string, mixed>  $config
     */
    private function sealSecrets(array &$config, ?string $existing): ?string
    {
        $secrets = [];
        if ($existing) {
            $decoded = json_decode(Crypt::decryptString($existing), true);
            if (is_array($decoded)) {
                $secrets = $decoded;
            }
        }
        foreach (['api_key', 'api_secret'] as $key) {
            if (! array_key_exists($key, $config)) {
                continue;
            }
            $value = trim((string) $config[$key]);
            if ($value !== '') {
                $secrets[$key] = $value;
            }
            unset($config[$key]);
        }

        return $secrets === [] ? null : Crypt::encryptString(json_encode($secrets));
    }

    /**
     * @return array<string, mixed>
     */
    private function presentSource(ExternalSource $source): array
    {
        $config = $source->config ?? [];
        unset($config['api_key'], $config['api_secret']);

        return [
            'id' => $source->id,
            'provider' => $source->provider,
            'enabled' => (bool) $source->enabled,
            'is_enabled' => (bool) $source->enabled,
            'licence_note' => $source->licence_note,
            'config' => $config,
            'has_api_key' => $source->apiKey() !== null,
            'last_pulled_at' => optional($source->last_pulled_at)?->toIso8601String(),
            'imported_count' => (int) $source->imported_count,
            'last_error' => $source->last_error,
        ];
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
            'description' => $product->description,
            'image_url' => $product->image_url,
            'thumbnail_url' => $product->thumbnail_url,
            'image_source' => $product->image_source,
            'barcodes' => $product->identifiers->map(fn ($id) => [
                'type' => $id->type,
                'value' => $id->value_normalised,
            ])->values(),
        ];
    }
}
