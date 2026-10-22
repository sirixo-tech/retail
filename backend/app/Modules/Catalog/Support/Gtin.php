<?php

namespace App\Modules\Catalog\Support;

use InvalidArgumentException;

class Gtin
{
    public static function normalise(string $raw): string
    {
        if (preg_match('#/01/(\d{8,14})#', $raw, $match) === 1) {
            $raw = $match[1];
        }

        $digits = preg_replace('/\D+/', '', $raw) ?? '';

        if ($digits === '' || str_starts_with($digits, '2') || str_starts_with($digits, '02')) {
            throw new InvalidArgumentException('In-store barcodes are not master catalog identifiers.');
        }

        if (! in_array(strlen($digits), [8, 12, 13, 14], true)) {
            throw new InvalidArgumentException('A GTIN must be 8, 12, 13, or 14 digits.');
        }

        if (! self::valid($digits)) {
            throw new InvalidArgumentException('The barcode check digit is wrong.');
        }

        return str_pad($digits, 14, '0', STR_PAD_LEFT);
    }

    public static function valid(string $digits): bool
    {
        $check = (int) substr($digits, -1);
        $body = substr($digits, 0, -1);
        $sum = 0;
        $factor = 3;
        for ($i = strlen($body) - 1; $i >= 0; $i--) {
            $sum += (int) $body[$i] * $factor;
            $factor = $factor === 3 ? 1 : 3;
        }
        $expected = (10 - ($sum % 10)) % 10;

        return $check === $expected;
    }
}
