<?php

namespace App\Modules\Catalog\Support;

use InvalidArgumentException;

class SourceEndpoint
{
    /** @var array<string, list<string>> */
    private const HOSTS = [
        'open_food_facts' => ['world.openfoodfacts.org'],
        'open_beauty_facts' => ['world.openbeautyfacts.org'],
        'open_products_facts' => ['world.openproductsfacts.org'],
        'open_pet_food_facts' => ['world.openpetfoodfacts.org'],
    ];

    public static function supports(string $provider): bool
    {
        return isset(self::HOSTS[$provider]);
    }

    public static function assertAllowed(string $provider, string $url): void
    {
        if (! self::supports($provider)) {
            throw new InvalidArgumentException('This source does not have an ingest adapter.');
        }
        $parts = parse_url($url);
        $scheme = strtolower((string) ($parts['scheme'] ?? ''));
        $host = strtolower((string) ($parts['host'] ?? ''));
        if ($scheme !== 'https' || ! in_array($host, self::HOSTS[$provider], true)) {
            throw new InvalidArgumentException('That catalogue address is not allowed.');
        }
    }
}
