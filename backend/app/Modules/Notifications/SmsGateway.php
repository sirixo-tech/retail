<?php

namespace App\Modules\Notifications;

use App\Support\PhoneNumber;
use App\Support\PlatformConfig;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class SmsGateway
{
    /**
     * @return array<string, mixed>
     */
    public function providers(): array
    {
        $stored = PlatformConfig::all()['sms_providers'] ?? [];

        return is_array($stored) ? $stored : [];
    }

    /**
     * @return array{key: string, config: array<string, mixed>}|null
     */
    public function active(): ?array
    {
        foreach ($this->providers() as $key => $config) {
            if (! is_array($config)) {
                continue;
            }
            if (! empty($config['enabled']) && ! empty($config['active'])) {
                return ['key' => (string) $key, 'config' => $config];
            }
        }

        return null;
    }

    public function canSendArbitrary(): bool
    {
        $active = $this->active();
        if (! $active) {
            return false;
        }
        if ($active['key'] === 'firebase') {
            return false;
        }

        return $this->credentialsReady($active['key'], $active['config']);
    }

    /**
     * @param  array<string, mixed>  $config
     */
    public function credentialsReady(string $key, array $config): bool
    {
        return match ($key) {
            'log' => true,
            'twilio' => $this->filled($config, 'account_sid', 'auth_token', 'from'),
            'msg91' => $this->filled($config, 'auth_key', 'sender_id', 'template_id'),
            'fast2sms' => $this->filled($config, 'api_key'),
            'sns' => $this->filled($config, 'access_key', 'secret', 'region'),
            'firebase' => $this->filled($config, 'api_key', 'auth_domain', 'project_id', 'app_id'),
            default => false,
        };
    }

    /**
     * @return array{status: string, detail: string}
     */
    public function send(?string $phone, string $message): array
    {
        $active = $this->active();
        if (! $active) {
            return ['status' => 'not_configured', 'detail' => 'No SMS provider is active.'];
        }
        if (! $this->credentialsReady($active['key'], $active['config'])) {
            return ['status' => 'not_configured', 'detail' => 'The active SMS provider is missing credentials.'];
        }
        if ($active['key'] === 'firebase') {
            return ['status' => 'firebase', 'detail' => 'Firebase Phone Auth sends the login code from the sign-in page.'];
        }

        $to = PhoneNumber::e164((string) $phone);
        if ($to === '') {
            return ['status' => 'failed', 'detail' => 'A mobile number is required.'];
        }

        try {
            return match ($active['key']) {
                'log' => $this->sendLog($to, $message),
                'twilio' => $this->sendTwilio($active['config'], $to, $message),
                'msg91' => $this->sendMsg91($active['config'], $to, $message),
                'fast2sms' => $this->sendFast2Sms($active['config'], $to, $message),
                'sns' => $this->sendSns($active['config'], $to, $message),
                default => ['status' => 'not_configured', 'detail' => 'This provider cannot send SMS.'],
            };
        } catch (\Throwable $e) {
            Log::warning('SMS send failed', ['provider' => $active['key'], 'error' => $e->getMessage()]);

            return ['status' => 'failed', 'detail' => 'The SMS provider rejected the message.'];
        }
    }

    public function record(?string $tenantId, string $template, string $detail, ?string $phone = null, ?string $message = null, ?string $referenceId = null): string
    {
        $status = 'not_configured';
        $storedDetail = $detail;
        if ($phone && $message && $this->canSendArbitrary()) {
            $result = $this->send($phone, $message);
            $status = $result['status'] === 'firebase' ? 'not_configured' : $result['status'];
            if (! in_array($status, ['sent', 'logged'], true)) {
                $storedDetail = $detail;
            }
        }

        if ($tenantId) {
            \Illuminate\Support\Facades\DB::table('notification_logs')->insert([
                'id' => (string) Str::uuid7(),
                'tenant_id' => $tenantId,
                'channel' => 'sms',
                'template' => $template,
                'status' => $status,
                'reference_id' => $referenceId,
                'detail' => mb_substr($storedDetail, 0, 240),
                'created_at' => now(),
            ]);
        }

        return $status;
    }

    /**
     * @return array<string, mixed>
     */
    public function publicFirebase(): array
    {
        $active = $this->active();
        if (! $active || $active['key'] !== 'firebase' || ! $this->credentialsReady('firebase', $active['config'])) {
            return ['active' => false];
        }
        $config = $active['config'];

        return [
            'active' => true,
            'api_key' => (string) ($config['api_key'] ?? ''),
            'auth_domain' => (string) ($config['auth_domain'] ?? ''),
            'project_id' => (string) ($config['project_id'] ?? ''),
            'app_id' => (string) ($config['app_id'] ?? ''),
            'messaging_sender_id' => (string) ($config['messaging_sender_id'] ?? ''),
        ];
    }

    /**
     * @param  array<string, mixed>  $config
     * @return array{status: string, detail: string}
     */
    private function sendLog(string $to, string $message): array
    {
        Log::info('SMS log provider', ['to' => $to, 'message' => $message]);

        return ['status' => 'logged', 'detail' => 'Written to the application log. No SMS was sent.'];
    }

    /**
     * @param  array<string, mixed>  $config
     * @return array{status: string, detail: string}
     */
    private function sendTwilio(array $config, string $to, string $message): array
    {
        $sid = (string) $config['account_sid'];
        $response = Http::withBasicAuth($sid, (string) $config['auth_token'])
            ->asForm()
            ->timeout(12)
            ->post("https://api.twilio.com/2010-04-01/Accounts/{$sid}/Messages.json", [
                'From' => (string) $config['from'],
                'To' => $to,
                'Body' => $message,
            ]);
        if ($response->successful()) {
            return ['status' => 'sent', 'detail' => 'Twilio accepted the message.'];
        }

        return ['status' => 'failed', 'detail' => 'Twilio returned '.$response->status().'.'];
    }

    /**
     * @param  array<string, mixed>  $config
     * @return array{status: string, detail: string}
     */
    private function sendMsg91(array $config, string $to, string $message): array
    {
        $mobile = ltrim($to, '+');
        $response = Http::withHeaders(['authkey' => (string) $config['auth_key']])
            ->timeout(12)
            ->post('https://control.msg91.com/api/v5/flow', [
                'template_id' => (string) $config['template_id'],
                'short_url' => '0',
                'recipients' => [[
                    'mobiles' => $mobile,
                    'VAR1' => $message,
                ]],
            ]);
        if ($response->successful()) {
            return ['status' => 'sent', 'detail' => 'MSG91 accepted the message.'];
        }

        return ['status' => 'failed', 'detail' => 'MSG91 returned '.$response->status().'.'];
    }

    /**
     * @param  array<string, mixed>  $config
     * @return array{status: string, detail: string}
     */
    private function sendFast2Sms(array $config, string $to, string $message): array
    {
        $route = (string) ($config['route'] ?? 'q');
        $numbers = PhoneNumber::digits($to);
        $payload = [
            'route' => $route,
            'numbers' => $numbers,
            'flash' => '0',
        ];
        if ($route === 'dlt') {
            $payload['sender_id'] = (string) ($config['sender_id'] ?? '');
            $payload['message'] = (string) ($config['template_id'] ?? '');
            $payload['variables_values'] = $message;
        } else {
            $payload['message'] = $message;
            if (! empty($config['sender_id'])) {
                $payload['sender_id'] = (string) $config['sender_id'];
            }
        }
        $response = Http::withHeaders(['authorization' => (string) $config['api_key']])
            ->timeout(12)
            ->post('https://www.fast2sms.com/dev/bulkV2', $payload);
        if ($response->successful() && $response->json('return') !== false) {
            return ['status' => 'sent', 'detail' => 'Fast2SMS accepted the message.'];
        }

        return ['status' => 'failed', 'detail' => 'Fast2SMS returned '.$response->status().'.'];
    }

    /**
     * @param  array<string, mixed>  $config
     * @return array{status: string, detail: string}
     */
    private function sendSns(array $config, string $to, string $message): array
    {
        $region = (string) $config['region'];
        $host = 'sns.'.$region.'.amazonaws.com';
        $amzDate = gmdate('Ymd\THis\Z');
        $date = gmdate('Ymd');
        $payload = [
            'Action' => 'Publish',
            'Message' => $message,
            'PhoneNumber' => $to,
            'Version' => '2010-03-31',
        ];
        $sender = trim((string) ($config['sender_id'] ?? ''));
        if ($sender !== '') {
            $payload['MessageAttributes.entry.1.Name'] = 'AWS.SNS.SMS.SenderID';
            $payload['MessageAttributes.entry.1.Value.DataType'] = 'String';
            $payload['MessageAttributes.entry.1.Value.StringValue'] = $sender;
        }
        ksort($payload);
        $body = http_build_query($payload, '', '&', PHP_QUERY_RFC3986);
        $payloadHash = hash('sha256', $body);
        $canonicalHeaders = "content-type:application/x-www-form-urlencoded\nhost:{$host}\nx-amz-date:{$amzDate}\n";
        $signedHeaders = 'content-type;host;x-amz-date';
        $canonical = "POST\n/\n\n{$canonicalHeaders}\n{$signedHeaders}\n{$payloadHash}";
        $scope = "{$date}/{$region}/sns/aws4_request";
        $stringToSign = "AWS4-HMAC-SHA256\n{$amzDate}\n{$scope}\n".hash('sha256', $canonical);
        $secret = (string) $config['secret'];
        $kDate = hash_hmac('sha256', $date, 'AWS4'.$secret, true);
        $kRegion = hash_hmac('sha256', $region, $kDate, true);
        $kService = hash_hmac('sha256', 'sns', $kRegion, true);
        $signing = hash_hmac('sha256', 'aws4_request', $kService, true);
        $signature = hash_hmac('sha256', $stringToSign, $signing);
        $key = (string) $config['access_key'];
        $authorization = "AWS4-HMAC-SHA256 Credential={$key}/{$scope}, SignedHeaders={$signedHeaders}, Signature={$signature}";
        $response = Http::withHeaders([
            'Content-Type' => 'application/x-www-form-urlencoded',
            'Host' => $host,
            'X-Amz-Date' => $amzDate,
            'Authorization' => $authorization,
        ])->withBody($body, 'application/x-www-form-urlencoded')->timeout(12)->post("https://{$host}/");
        if ($response->successful() && str_contains($response->body(), 'PublishResponse')) {
            return ['status' => 'sent', 'detail' => 'Amazon SNS accepted the message.'];
        }

        return ['status' => 'failed', 'detail' => 'Amazon SNS returned '.$response->status().'.'];
    }

    /**
     * @param  array<string, mixed>  $config
     */
    private function filled(array $config, string ...$keys): bool
    {
        foreach ($keys as $key) {
            if (trim((string) ($config[$key] ?? '')) === '') {
                return false;
            }
        }

        return true;
    }
}
