<?php

namespace App\Modules\Payments\Support;

/**
 * Paytm's published checksum. The signature is AES-128-CBC over SHA-256(payload|salt).
 */
class PaytmChecksum
{
    private const IV = '@@@@&&&&####$$$$';

    public static function sign(string $payload, string $key): string
    {
        $salt = self::salt();
        $hash = hash('sha256', $payload.'|'.$salt).$salt;

        return (string) openssl_encrypt($hash, 'AES-128-CBC', $key, 0, self::IV);
    }

    public static function verify(string $payload, string $key, string $checksum): bool
    {
        $hash = openssl_decrypt($checksum, 'AES-128-CBC', $key, 0, self::IV);
        if (! is_string($hash) || strlen($hash) < 4) {
            return false;
        }
        $salt = substr($hash, -4);

        return hash_equals(hash('sha256', $payload.'|'.$salt).$salt, $hash);
    }

    /**
     * @param  array<string, mixed>  $body
     */
    public static function signBody(array $body, string $key): string
    {
        return self::sign((string) json_encode($body, JSON_UNESCAPED_SLASHES), $key);
    }

    /**
     * @param  array<string, mixed>  $params
     */
    public static function verifyParams(array $params, string $key, string $checksum): bool
    {
        unset($params['CHECKSUMHASH']);
        ksort($params);
        $values = [];
        foreach ($params as $value) {
            if ($value !== null && strtolower((string) $value) !== 'null') {
                $values[] = (string) $value;
            }
        }

        return self::verify(implode('|', $values), $key, $checksum);
    }

    private static function salt(): string
    {
        $alphabet = '9876543210ZYXWVUTSRQPONMLKJIHGFEDCBAabcdefghijklmnopqrstuvwxyz!@#$%^&*()';
        $salt = '';
        for ($i = 0; $i < 4; $i++) {
            $salt .= $alphabet[random_int(0, strlen($alphabet) - 1)];
        }

        return $salt;
    }
}
