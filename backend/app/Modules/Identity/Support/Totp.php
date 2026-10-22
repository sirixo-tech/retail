<?php

namespace App\Modules\Identity\Support;

class Totp
{
    public static function verify(string $secret, string $code): bool
    {
        $slice = intdiv(time(), 30);
        foreach ([-1, 0, 1] as $offset) {
            if (hash_equals(self::code($secret, $slice + $offset), $code)) {
                return true;
            }
        }

        return false;
    }

    public static function current(string $secret): string
    {
        return self::code($secret, intdiv(time(), 30));
    }

    private static function code(string $secret, int $slice): string
    {
        $key = self::base32($secret);
        $binary = hash_hmac('sha1', pack('N', 0).pack('N', $slice), $key, true);
        $offset = ord(substr($binary, -1)) & 0x0F;
        $value = unpack('N', substr($binary, $offset, 4))[1] & 0x7FFFFFFF;

        return str_pad((string) ($value % 1000000), 6, '0', STR_PAD_LEFT);
    }

    private static function base32(string $secret): string
    {
        $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $secret = strtoupper(rtrim($secret, '='));
        $bits = '';
        foreach (str_split($secret) as $char) {
            $pos = strpos($alphabet, $char);
            if ($pos === false) {
                continue;
            }
            $bits .= str_pad(decbin($pos), 5, '0', STR_PAD_LEFT);
        }
        $bytes = '';
        foreach (str_split($bits, 8) as $chunk) {
            if (strlen($chunk) === 8) {
                $bytes .= chr(bindec($chunk));
            }
        }

        return $bytes;
    }
}
