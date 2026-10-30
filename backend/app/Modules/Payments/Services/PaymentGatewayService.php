<?php

namespace App\Modules\Payments\Services;

use App\Modules\Payments\Actions\CapturePrepaidPayment;
use App\Modules\Payments\Http\Controllers\GatewayController;
use App\Modules\Tenancy\Models\Store;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class PaymentGatewayService
{
    public function __construct(private CapturePrepaidPayment $capture)
    {
    }

    /**
     * Resolve decrypted credentials for a given store and payment provider.
     * Checks payment_gateways table first, then store settings fallback.
     *
     * @return array{key_id: string, key_secret: string, mode: string, config: array<string, mixed>}|null
     */
    public function resolveCredentials(string $storeId, string $provider): ?array
    {
        $gateway = DB::table('payment_gateways')
            ->where('store_id', $storeId)
            ->where('provider', $provider)
            ->where('status', 'active')
            ->whereNotNull('credentials_ciphertext')
            ->first();

        if ($gateway && $gateway->credentials_ciphertext) {
            try {
                $decoded = json_decode(Crypt::decryptString($gateway->credentials_ciphertext), true);
                if (is_array($decoded) && ! empty($decoded['key_id']) && ! empty($decoded['key_secret'])) {
                    return [
                        'key_id' => (string) $decoded['key_id'],
                        'key_secret' => (string) $decoded['key_secret'],
                        'mode' => (string) ($gateway->mode ?? 'test'),
                        'config' => is_array($decoded['config'] ?? null) ? $decoded['config'] : [],
                    ];
                }
            } catch (\Throwable $e) {
                Log::warning('Failed decrypting payment credentials', ['store_id' => $storeId, 'provider' => $provider, 'error' => $e->getMessage()]);
            }
        }

        // Fallback: check store settings online_store.payments or gateway_configs
        $store = Store::query()->find($storeId);
        if ($store && is_array($store->settings)) {
            $onlinePayments = $store->settings['online_store']['payments'] ?? [];
            $gwConfig = $store->settings['gateway_configs'][$provider] ?? [];

            if ($provider === 'phonepe') {
                $ph = $onlinePayments['phonepe'] ?? [];
                $mid = $ph['merchantId'] ?? ($gwConfig['key_id'] ?? null);
                $salt = $ph['saltKey'] ?? ($gwConfig['key_secret'] ?? null);
                if (! empty($mid) && ! empty($salt)) {
                    return [
                        'key_id' => (string) $mid,
                        'key_secret' => (string) $salt,
                        'mode' => (string) ($ph['mode'] ?? ($gwConfig['mode'] ?? 'test')),
                        'config' => array_merge($gwConfig, [
                            'salt_index' => $ph['saltIndex'] ?? ($gwConfig['salt_index'] ?? '1'),
                            'upi_vpa' => $gwConfig['upi_vpa'] ?? ($store->settings['online_store']['payments']['upiQr']['vpa'] ?? ''),
                        ]),
                    ];
                }
            } elseif ($provider === 'paytm') {
                $ptm = $onlinePayments['paytm'] ?? [];
                $mid = $ptm['merchantId'] ?? ($gwConfig['key_id'] ?? null);
                $mkey = $ptm['merchantKey'] ?? ($gwConfig['key_secret'] ?? null);
                if (! empty($mid) && ! empty($mkey)) {
                    return [
                        'key_id' => (string) $mid,
                        'key_secret' => (string) $mkey,
                        'mode' => (string) ($ptm['mode'] ?? ($gwConfig['mode'] ?? 'test')),
                        'config' => $gwConfig,
                    ];
                }
            } elseif ($provider === 'razorpay') {
                $rzp = $onlinePayments['razorpay'] ?? [];
                $key = $rzp['keyId'] ?? ($gwConfig['key_id'] ?? null);
                $secret = $rzp['keySecret'] ?? ($gwConfig['key_secret'] ?? null);
                if (! empty($key) && ! empty($secret)) {
                    return [
                        'key_id' => (string) $key,
                        'key_secret' => (string) $secret,
                        'mode' => (string) ($rzp['mode'] ?? ($gwConfig['mode'] ?? 'test')),
                        'config' => $gwConfig,
                    ];
                }
            }
        }

        return null;
    }

    /**
     * Initiate prepaid payment session and generate redirect / UPI intent URLs.
     *
     * @param array<string, mixed> $order
     * @param array<string, mixed> $customerData
     * @return array<string, mixed>
     */
    public function initiate(Store $store, array $order, string $provider, array $customerData, string $returnUrl): array
    {
        $paymentId = (string) Str::uuid7();
        $token = Str::random(40);
        $amountPaise = (int) $order['total_paise'];
        $creds = $this->resolveCredentials($store->id, $provider);

        $mode = $creds['mode'] ?? 'test';
        $vpa = trim((string) (
            $creds['config']['upi_vpa']
            ?? ($store->settings['online_store']['payments']['upiQr']['vpa']
            ?? ($store->settings['gateway_configs']['upi_qr']['upi_vpa']
            ?? ''))
        ));
        $payeeName = trim((string) (
            $creds['config']['merchant_name']
            ?? ($store->settings['online_store']['payments']['upiQr']['merchantName']
            ?? ($store->settings['tenant']['tradeName']
            ?? $store->name))
        ));

        $txnId = 'TXN_' . $order['number'] . '_' . substr(str_replace('-', '', (string) $order['id']), 0, 8);

        $paymentUrl = null;
        $upiIntentUrl = null;
        $allUpiUris = [];

        // Build generic NPCI UPI URIs if VPA is available
        if ($vpa !== '') {
            $formattedAmount = number_format($amountPaise / 100, 2, '.', '');
            $encodedPayee = rawurlencode($payeeName);
            $encodedNote = rawurlencode('Order #' . $order['number']);
            $baseUpi = "upi://pay?pa={$vpa}&pn={$encodedPayee}&am={$formattedAmount}&cu=INR&tn={$encodedNote}&tr={$txnId}";
            $upiIntentUrl = $baseUpi;

            $allUpiUris = [
                'standard' => $baseUpi,
                'gpay' => "tez://upi/pay?pa={$vpa}&pn={$encodedPayee}&am={$formattedAmount}&cu=INR&tn={$encodedNote}&tr={$txnId}",
                'phonepe' => "phonepe://pay?pa={$vpa}&pn={$encodedPayee}&am={$formattedAmount}&cu=INR&tn={$encodedNote}&tr={$txnId}",
                'paytm' => "paytmmp://pay?pa={$vpa}&pn={$encodedPayee}&am={$formattedAmount}&cu=INR&tn={$encodedNote}&tr={$txnId}",
                'bhim' => "bhim://pay?pa={$vpa}&pn={$encodedPayee}&am={$formattedAmount}&cu=INR&tn={$encodedNote}&tr={$txnId}",
            ];
        }

        if ($provider === 'phonepe') {
            $merchantId = $creds['key_id'] ?? null;
            $saltKey = $creds['key_secret'] ?? null;
            $saltIndex = (string) ($creds['config']['salt_index'] ?? '1');

            if (! empty($merchantId) && ! empty($saltKey)) {
                $phonePeBase = $mode === 'live'
                    ? 'https://api.phonepe.com/apis/hermes'
                    : 'https://api-preprod.phonepe.com/apis/pg-sandbox';

                $custPhone = substr(preg_replace('/\D/', '', (string) ($customerData['phone'] ?? '9999999999')), -10);

                $payload = [
                    'merchantId' => $merchantId,
                    'merchantTransactionId' => $txnId,
                    'merchantUserId' => 'CUST_' . $custPhone,
                    'amount' => $amountPaise,
                    'redirectUrl' => $returnUrl,
                    'redirectMode' => 'REDIRECT',
                    'callbackUrl' => url('/api/v1/public/webhooks/phonepe'),
                    'mobileNumber' => $custPhone,
                    'paymentInstrument' => [
                        'type' => 'PAY_PAGE',
                    ],
                ];

                $encodedPayload = base64_encode(json_encode($payload));
                $checksum = hash('sha256', $encodedPayload . '/pg/v1/pay' . $saltKey) . '###' . $saltIndex;

                try {
                    $response = Http::withHeaders([
                        'Content-Type' => 'application/json',
                        'Accept' => 'application/json',
                        'X-VERIFY' => $checksum,
                    ])->timeout(8)->post("{$phonePeBase}/pg/v1/pay", [
                        'request' => $encodedPayload,
                    ]);

                    if ($response->successful()) {
                        $resData = $response->json();
                        if (! empty($resData['success'])) {
                            $redirectInfo = $resData['data']['instrumentResponse']['redirectInfo'] ?? [];
                            if (! empty($redirectInfo['url'])) {
                                $paymentUrl = (string) $redirectInfo['url'];
                            }
                            if (! empty($resData['data']['instrumentResponse']['intentUrl'])) {
                                $upiIntentUrl = (string) $resData['data']['instrumentResponse']['intentUrl'];
                            }
                        }
                    }
                } catch (\Throwable $e) {
                    Log::warning('PhonePe PG API call error', ['order_id' => $order['id'], 'error' => $e->getMessage()]);
                }
            }

            // Fallback for PhonePe: If direct PG API didn't return a URL (e.g. sandbox credentials or app intent)
            if (! $paymentUrl) {
                if ($upiIntentUrl) {
                    $paymentUrl = $upiIntentUrl;
                } elseif (! empty($allUpiUris['phonepe'])) {
                    $paymentUrl = $allUpiUris['phonepe'];
                }
            }
        } elseif ($provider === 'paytm') {
            if (! empty($allUpiUris['paytm'])) {
                $paymentUrl = $allUpiUris['paytm'];
            }
        }

        // Store payment row in DB
        DB::table('payments')->insert([
            'id' => $paymentId,
            'tenant_id' => $store->tenant_id,
            'store_id' => $store->id,
            'order_id' => $order['id'],
            'provider' => $provider,
            'mode' => $mode,
            'amount_paise' => $amountPaise,
            'status' => 'created',
            'capture_token_hash' => hash_hmac('sha256', $token, (string) config('app.key')),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $result = [
            'id' => $paymentId,
            'provider' => $provider,
            'mode' => $mode,
            'amount_paise' => $amountPaise,
            'transaction_id' => $txnId,
            'payment_url' => $paymentUrl,
            'redirect_url' => $paymentUrl,
            'upi_intent_url' => $upiIntentUrl,
            'upi_uris' => $allUpiUris,
            'vpa' => $vpa,
            'payee_name' => $payeeName,
        ];

        if (app()->environment('local', 'testing')) {
            $result['capture_token'] = $token;
        }

        return $result;
    }

    /**
     * Check and verify order payment status with gateway provider.
     *
     * @return array{paid: bool, status: string, method?: string, sale_id?: string|null}
     */
    public function verifyStatus(string $orderId): array
    {
        $order = DB::table('orders')->where('id', $orderId)->first();
        if (! $order) {
            return ['paid' => false, 'status' => 'not_found'];
        }

        if ($order->payment_status === 'captured') {
            return [
                'paid' => true,
                'status' => 'captured',
                'method' => (string) $order->payment_method,
                'sale_id' => $order->sale_id,
            ];
        }

        $payment = DB::table('payments')
            ->where('order_id', $orderId)
            ->orderByDesc('created_at')
            ->first();

        if (! $payment) {
            return ['paid' => false, 'status' => (string) $order->payment_status];
        }

        if ($payment->status === 'captured') {
            return [
                'paid' => true,
                'status' => 'captured',
                'method' => (string) $payment->provider,
                'sale_id' => $order->sale_id,
            ];
        }

        // PhonePe Status Check API
        if ($payment->provider === 'phonepe') {
            $creds = $this->resolveCredentials($payment->store_id, 'phonepe');
            if ($creds) {
                $merchantId = $creds['key_id'];
                $saltKey = $creds['key_secret'];
                $saltIndex = (string) ($creds['config']['salt_index'] ?? '1');
                $phonePeBase = ($creds['mode'] ?? 'test') === 'live'
                    ? 'https://api.phonepe.com/apis/hermes'
                    : 'https://api-preprod.phonepe.com/apis/pg-sandbox';

                $txnId = 'TXN_' . $order->number . '_' . substr(str_replace('-', '', (string) $order->id), 0, 8);
                $endpoint = "/pg/v1/status/{$merchantId}/{$txnId}";
                $checksum = hash('sha256', $endpoint . $saltKey) . '###' . $saltIndex;

                try {
                    $response = Http::withHeaders([
                        'Content-Type' => 'application/json',
                        'Accept' => 'application/json',
                        'X-VERIFY' => $checksum,
                        'X-MERCHANT-ID' => $merchantId,
                    ])->timeout(8)->get("{$phonePeBase}{$endpoint}");

                    if ($response->successful()) {
                        $resData = $response->json();
                        $code = $resData['code'] ?? null;
                        $state = $resData['data']['state'] ?? null;

                        if ($code === 'PAYMENT_SUCCESS' || $state === 'COMPLETED') {
                            $this->capture->testCapture($payment->id, '');
                            return [
                                'paid' => true,
                                'status' => 'captured',
                                'method' => 'phonepe',
                                'sale_id' => DB::table('orders')->where('id', $orderId)->value('sale_id'),
                            ];
                        }
                    }
                } catch (\Throwable $e) {
                    Log::warning('PhonePe Status Check API error', ['order_id' => $orderId, 'error' => $e->getMessage()]);
                }
            }
        }

        return [
            'paid' => false,
            'status' => (string) $payment->status,
            'method' => (string) $payment->provider,
            'sale_id' => null,
        ];
    }
}
