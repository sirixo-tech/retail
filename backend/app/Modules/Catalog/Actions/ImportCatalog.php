<?php

namespace App\Modules\Catalog\Actions;

use App\Modules\Catalog\Models\Identifier;
use App\Modules\Catalog\Models\ImportBatch;
use App\Modules\Catalog\Models\ImportRow;
use App\Modules\Catalog\Support\Gtin;
use InvalidArgumentException;

class ImportCatalog
{
    public function __construct(private SaveProduct $products)
    {
    }

    public function stage(string $csv, string $filename, bool $commit): ImportBatch
    {
        $lines = preg_split("/\r\n|\n|\r/", trim($csv)) ?: [];
        $header = str_getcsv((string) array_shift($lines));
        $header = array_map(fn ($col) => strtolower(trim((string) $col)), $header);

        $batch = ImportBatch::query()->create([
            'source' => 'csv',
            'filename' => $filename,
            'mapping' => $header,
            'status' => 'staged',
            'dry_run' => ! $commit,
        ]);

        $seen = [];
        $ok = 0;
        $bad = 0;

        foreach ($lines as $index => $line) {
            if (trim($line) === '') {
                continue;
            }
            $values = str_getcsv($line);
            $payload = [];
            foreach ($header as $i => $column) {
                $payload[$column] = $values[$i] ?? null;
            }

            $errors = $this->errors($payload, $seen);
            $status = $errors === [] ? 'valid' : 'error';
            $productId = null;

            if ($status === 'valid') {
                $seen[] = Gtin::normalise((string) $payload['gtin']);
                $ok++;
                if ($commit) {
                    $product = $this->products->create([
                        'name' => $payload['name'],
                        'gtin' => $payload['gtin'],
                        'category_id' => $this->products->categoryId((string) ($payload['category'] ?? '')),
                        'brand_id' => isset($payload['brand']) ? $this->products->brandId((string) $payload['brand']) : null,
                        'reference_mrp_paise' => isset($payload['mrp_paise']) && $payload['mrp_paise'] !== '' ? (int) $payload['mrp_paise'] : null,
                        'source' => 'csv',
                    ]);
                    $productId = $product->id;
                }
            } else {
                $bad++;
            }

            ImportRow::query()->create([
                'batch_id' => $batch->id,
                'row_number' => $index + 2,
                'payload' => $payload,
                'status' => $status,
                'errors' => $errors,
                'product_id' => $productId,
            ]);
        }

        $batch->update([
            'status' => $commit ? 'committed' : 'dry_run',
            'stats' => ['valid' => $ok, 'errors' => $bad],
        ]);

        return $batch->fresh();
    }

    /**
     * @param  array<string, mixed>  $payload
     * @param  list<string>  $seen
     * @return list<string>
     */
    private function errors(array $payload, array $seen): array
    {
        $errors = [];
        if (trim((string) ($payload['name'] ?? '')) === '') {
            $errors[] = 'Name is required.';
        }
        try {
            $normalised = Gtin::normalise((string) ($payload['gtin'] ?? ''));
            if (in_array($normalised, $seen, true) || Identifier::query()->where('value_normalised', $normalised)->exists()) {
                $errors[] = 'Duplicate barcode.';
            }
        } catch (InvalidArgumentException $e) {
            $errors[] = $e->getMessage();
        }

        return $errors;
    }
}
