<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;

class PlatformConfig
{
    public static function all(): array
    {
        $stored = Cache::get('selfx_platform_config_v1', []);

        return is_array($stored) ? $stored : [];
    }

    /**
     * @param  array<string, mixed>  $config
     */
    public static function put(array $config): void
    {
        Cache::forever('selfx_platform_config_v1', $config);
    }

    public static function mapsKey(): ?string
    {
        $key = self::all()['maps']['api_key'] ?? '';
        $key = is_string($key) ? trim($key) : '';

        return $key !== '' ? $key : null;
    }

    /**
     * @param  array<string, mixed>|null  $settings
     * @return array<string, mixed>|null
     */
    public static function injectMaps(?array $settings): ?array
    {
        if ($settings === null) {
            return null;
        }
        $contact = is_array($settings['contact'] ?? null) ? $settings['contact'] : [];
        unset($contact['googleMapsApiKey']);
        $basics = is_array($settings['basics'] ?? null) ? $settings['basics'] : [];
        unset($basics['googleMapsApiKey']);
        $settings['contact'] = $contact;
        $settings['basics'] = $basics;
        $key = self::mapsKey();
        if ($key) {
            $settings['contact']['googleMapsApiKey'] = $key;
        }

        return $settings;
    }

    /**
     * @param  array<string, mixed>  $online
     * @return array<string, mixed>
     */
    public static function stripTenantMaps(array $online): array
    {
        if (isset($online['contact']) && is_array($online['contact'])) {
            unset($online['contact']['googleMapsApiKey']);
        }
        if (isset($online['basics']) && is_array($online['basics'])) {
            unset($online['basics']['googleMapsApiKey']);
        }

        return $online;
    }

    /**
     * @return array{email_password: bool, phone_otp: bool}
     */
    public static function authMethods(): array
    {
        $methods = self::all()['auth_methods'] ?? [];

        return [
            'email_password' => ($methods['email_password'] ?? true) !== false,
            'phone_otp' => ($methods['phone_otp'] ?? true) !== false,
        ];
    }

    /**
     * @param  array<string, mixed>  $config
     * @return array<string, mixed>
     */
    public static function scrubDemo(array $config): array
    {
        $fakes = [
            'msg91_live_98a7bc65d43e21',
            '1201159876543210001',
            'SELFXR',
            'EAAGm0PX4ZCpsBA...',
            '109823471293841',
            '998127364518273',
            'selfx_wa_verify_prod_token',
            'pk_live_51SelfXPlatform',
            'sk_live_51SelfXPlatformSecret',
            'whsec_stripe_platform',
            'rzp_live_SelfXPlatform01',
            'rzp_sec_live_98a7bc65d43e21',
            'whsec_rzp_platform',
            'SELFXONLINE',
            'salt_key_live_phonepe',
            'SELFXR98172635',
            'paytm_sec_key_platform',
            'CF_APP_SELFX_LIVE',
            'cf_sec_key_platform',
            'PAYU_SELFX_KEY',
            'payu_salt_live_98a7bc',
            'AY_SELFX_PAYPAL_CLIENT',
            'paypal_sec_platform',
            'pk_live_paystack_selfx',
            'sk_live_paystack_selfx',
            'FLWPUBK-selfx-live',
            'FLWSECK-selfx-live',
            'flw_enc_key_98a',
            'live_mollie_selfx_platform',
            'dodo_live_selfx_key',
            'whsec_dodo_platform',
            '50200087654321',
            'HDFC0000240',
            'platform-mailer@selfx.in',
            '+91 80 4568 1200',
            'Platform Administrator',
            'Principal Infrastructure Lead',
            'Global Root Super Admin',
            'admin@selfx.in',
        ];

        foreach (['sms', 'whatsapp', 'gateways', 'mail', 'profile', 'general'] as $section) {
            if (isset($config[$section])) {
                $config[$section] = self::scrubValue($config[$section], $fakes);
            }
        }
        if (isset($config['sms']['enabled']) && ($config['sms']['api_key'] ?? '') === '') {
            $config['sms']['enabled'] = false;
        }
        if (isset($config['whatsapp']['enabled']) && ($config['whatsapp']['access_token'] ?? '') === '') {
            $config['whatsapp']['enabled'] = false;
        }

        return $config;
    }

    /**
     * @param  list<string>  $fakes
     */
    private static function scrubValue(mixed $value, array $fakes): mixed
    {
        if (is_string($value)) {
            return in_array($value, $fakes, true) ? '' : $value;
        }
        if (! is_array($value)) {
            return $value;
        }
        $clean = [];
        foreach ($value as $key => $item) {
            $clean[$key] = self::scrubValue($item, $fakes);
        }

        return $clean;
    }
}
