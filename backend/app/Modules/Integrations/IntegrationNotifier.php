<?php

namespace App\Modules\Integrations;

use App\Modules\Tenancy\Models\Store;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class IntegrationNotifier
{
    public function orderPlaced(Store $store, string $number, int $totalPaise, string $customer, string $phone): void
    {
        $text = $store->name.' order '.$number.' · ₹'.number_format($totalPaise / 100, 2).' · '.$customer.' · '.$phone;
        $bundle = is_array($store->settings['integrations'] ?? null) ? $store->settings['integrations'] : [];

        $telegram = $bundle['telegram'] ?? null;
        if (is_array($telegram) && ($telegram['status'] ?? '') === 'connected') {
            $secret = $this->secret($telegram);
            $fields = is_array($telegram['fields'] ?? null) ? $telegram['fields'] : [];
            $chatId = (string) (($secret['chat_id'] ?? '') !== '' ? $secret['chat_id'] : ($fields['chat_id'] ?? ''));
            if (($secret['bot_token'] ?? '') !== '' && $chatId !== '') {
                $payload = [
                    'chat_id' => $chatId,
                    'text' => $text,
                ];
                if (! empty($fields['message_thread_id'])) {
                    $payload['message_thread_id'] = (int) $fields['message_thread_id'];
                }
                Http::timeout(8)->post('https://api.telegram.org/bot'.$secret['bot_token'].'/sendMessage', $payload);
                $this->log($store->tenant_id, $store->id, 'telegram', 'order.placed', 'ok', 'Sent order '.$number.' alert to Telegram.', 'outbound');
            }
        }

        $whatsapp = $bundle['whatsapp'] ?? null;
        if (is_array($whatsapp) && ($whatsapp['status'] ?? '') === 'connected') {
            $secret = $this->secret($whatsapp);
            $fields = is_array($whatsapp['fields'] ?? null) ? $whatsapp['fields'] : [];
            if (($secret['access_token'] ?? '') !== '' && ($fields['phone_number_id'] ?? '') !== '' && ($fields['notify_phone'] ?? '') !== '') {
                Http::timeout(8)->withToken($secret['access_token'])->post(
                    'https://graph.facebook.com/v21.0/'.$fields['phone_number_id'].'/messages',
                    [
                        'messaging_product' => 'whatsapp',
                        'to' => preg_replace('/\D+/', '', (string) $fields['notify_phone']),
                        'type' => 'text',
                        'text' => ['body' => $text],
                    ],
                );
                $this->log($store->tenant_id, $store->id, 'whatsapp', 'order.placed', 'ok', 'Sent order '.$number.' alert via WhatsApp Cloud API.', 'outbound');
            }
        }

        $hooks = $bundle['webhooks'] ?? null;
        if (is_array($hooks) && ($hooks['status'] ?? '') === 'connected') {
            $fields = is_array($hooks['fields'] ?? null) ? $hooks['fields'] : [];
            $secret = $this->secret($hooks);
            $url = (string) ($fields['url'] ?? '');
            if ($url !== '') {
                $body = json_encode([
                    'event' => 'order.placed',
                    'store_id' => $store->id,
                    'store_name' => $store->name,
                    'number' => $number,
                    'total_paise' => $totalPaise,
                    'customer' => $customer,
                    'phone' => $phone,
                    'sent_at' => now()->toIso8601String(),
                ]);
                $signature = hash_hmac('sha256', (string) $body, (string) ($secret['signing_secret'] ?? ''));
                $headerName = trim((string) ($fields['header_name'] ?? 'X-SelfX-Signature')) ?: 'X-SelfX-Signature';
                Http::timeout(8)->withHeaders([$headerName => $signature])->withBody((string) $body, 'application/json')->post($url);
                $this->log($store->tenant_id, $store->id, 'webhooks', 'order.placed', 'ok', 'Dispatched order.placed webhook for '.$number.'.', 'outbound');
            }
        }

        $sheets = $bundle['google_sheets'] ?? null;
        if (is_array($sheets) && ($sheets['status'] ?? '') === 'connected') {
            $fields = is_array($sheets['fields'] ?? null) ? $sheets['fields'] : [];
            $secret = $this->secret($sheets);
            $token = $this->googleToken((string) (($secret['client_email'] ?? '') ?: ($fields['client_email'] ?? '')), (string) ($secret['private_key'] ?? ''));
            $sheetId = (string) ($fields['spreadsheet_id'] ?? '');
            if ($token !== '' && $sheetId !== '') {
                $range = rawurlencode((string) ($fields['tab'] ?? 'Orders').'!A1');
                Http::timeout(8)->withToken($token)->post(
                    "https://sheets.googleapis.com/v4/spreadsheets/{$sheetId}/values/{$range}:append?valueInputOption=USER_ENTERED",
                    ['values' => [[now()->toDateTimeString(), $number, $customer, $phone, number_format($totalPaise / 100, 2)]]],
                );
                $this->log($store->tenant_id, $store->id, 'google_sheets', 'order.appended', 'ok', 'Appended order '.$number.' to Google Sheet.', 'outbound');
            }
        }
    }

    /** @param  array<string, mixed>  $record */
    private function secret(array $record): array
    {
        $raw = (string) ($record['secret'] ?? '');
        if ($raw === '') {
            return [];
        }
        try {
            $decoded = json_decode(decrypt($raw), true);
        } catch (\Throwable) {
            return [];
        }

        return is_array($decoded) ? $decoded : [];
    }

    public function googleToken(string $email, string $privateKey): string
    {
        if ($email === '' || $privateKey === '') {
            return '';
        }
        $privateKey = str_replace('\n', "\n", $privateKey);
        $now = time();
        $header = rtrim(strtr(base64_encode((string) json_encode(['alg' => 'RS256', 'typ' => 'JWT'])), '+/', '-_'), '=');
        $claim = rtrim(strtr(base64_encode((string) json_encode([
            'iss' => $email,
            'scope' => 'https://www.googleapis.com/auth/spreadsheets',
            'aud' => 'https://oauth2.googleapis.com/token',
            'iat' => $now,
            'exp' => $now + 3600,
        ])), '+/', '-_'), '=');
        $unsigned = $header.'.'.$claim;
        if (! @openssl_sign($unsigned, $signature, $privateKey, OPENSSL_ALGO_SHA256)) {
            return '';
        }
        $jwt = $unsigned.'.'.rtrim(strtr(base64_encode($signature), '+/', '-_'), '=');
        $response = Http::asForm()->timeout(8)->post('https://oauth2.googleapis.com/token', [
            'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion' => $jwt,
        ]);

        return (string) $response->json('access_token');
    }

    public function log(
        string $tenantId,
        string $storeId,
        string $provider,
        string $action,
        string $status,
        string $message,
        string $direction = 'outbound'
    ): void {
        DB::table('integration_logs')->insert([
            'id' => (string) Str::uuid7(),
            'tenant_id' => $tenantId,
            'store_id' => $storeId,
            'provider' => $provider,
            'action' => $action,
            'direction' => $direction,
            'status' => $status,
            'message' => $message,
            'created_at' => now(),
        ]);
    }
}
