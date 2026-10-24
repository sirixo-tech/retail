<?php

namespace App\Modules\Catalog\Jobs;

use App\Modules\Catalog\Models\ExternalSource;
use App\Modules\Catalog\Sources\OpenFactsIngestor;
use App\Modules\Catalog\Support\SourceEndpoint;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use InvalidArgumentException;

class IngestCatalogPage implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public const MAX_PAGES = 3;

    public function __construct(public string $provider, public int $page = 1)
    {
    }

    public function handle(OpenFactsIngestor $ingestor): void
    {
        $source = ExternalSource::query()->where('provider', $this->provider)->first();
        if (! $source || ! $source->enabled || ! SourceEndpoint::supports($source->provider)) {
            return;
        }
        try {
            $imported = $ingestor->pull($source, $this->page);
            $source->update([
                'imported_count' => (int) $source->imported_count + $imported,
                'last_pulled_at' => now(),
                'last_error' => null,
            ]);
            if ($imported > 0 && $this->page < self::MAX_PAGES) {
                self::dispatch($this->provider, $this->page + 1);
            }
        } catch (InvalidArgumentException $e) {
            $source->update(['last_error' => $e->getMessage(), 'last_pulled_at' => now()]);
        }
    }
}
