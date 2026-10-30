<?php

namespace App\Support;

class PhoneNumber
{
    public static function digits(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone) ?? '';
        if (strlen($digits) > 10) {
            $digits = substr($digits, -10);
        }

        return $digits;
    }

    public static function e164(string $phone): string
    {
        $digits = self::digits($phone);
        if ($digits === '') {
            return '';
        }

        return '+91'.$digits;
    }
}
