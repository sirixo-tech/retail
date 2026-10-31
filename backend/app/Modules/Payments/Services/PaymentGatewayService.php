<?php

namespace App\Modules\Payments\Services;

use App\Modules\Payments\Actions\CapturePrepaidPayment;
use App\Modules\Payments\Http\Controllers\GatewayController;
use App\Modules\Payments\Support\PaytmChecksum;
use App\Modules\Tenancy\Models\Store;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
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

        if (! $gateway) {
            $gateway = DB::table('payment_gateways')
                ->where('store_id', $storeId)
                ->where('provider', $provider)
                ->whereNotNull('credentials_ciphertext')
                ->orderByDesc('updated_at')
                ->first();
        }

        if ($gateway && $gateway->credentials_ciphertext) {
            try {
                $decoded = json_decode(Crypt::decryptString($gateway->credentials_ciphertext), true);
                if (is_array($decoded) && ! empty($decoded['key_id']) && ! empty($decoded['key_secret'])) {
                    $config = is_array($decoded['config'] ?? null) ? $decoded['config'] : [];
                    $storeModel = Store::query()->find($storeId);
                    $gwConfig = ($storeModel && is_array($storeModel->settings)) ? ($storeModel->settings['gateway_configs'][$provider] ?? []) : [];
                    $config = array_merge($gwConfig, $config);

                    $keyId = (string) $decoded['key_id'];

                    if ($provider === 'phonepe') {
                        if (empty($config['provider_id'])) {
                            $config['provider_id'] = $config['x_provider_id'] ?? ($config['store_terminal_id'] ?? null);
                        }
                    }

                    return [
                        'key_id' => $keyId,
                        'key_secret' => (string) $decoded['key_secret'],
                        'mode' => (string) ($gateway->mode ?? 'test'),
                        'config' => $config,
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
                    $config = array_merge($gwConfig, [
                        'salt_index' => $ph['saltIndex'] ?? ($gwConfig['salt_index'] ?? '1'),
                        'provider_id' => $gwConfig['provider_id'] ?? ($gwConfig['x_provider_id'] ?? ($gwConfig['store_terminal_id'] ?? null)),
                        'store_id' => $gwConfig['store_id'] ?? ($ph['storeId'] ?? null),
                        'terminal_id' => $gwConfig['terminal_id'] ?? ($ph['terminalId'] ?? null),
                        'upi_vpa' => $gwConfig['upi_vpa'] ?? ($store->settings['online_store']['payments']['upiQr']['vpa'] ?? null),
                    ]);
                    return [
                        'key_id' => (string) $mid,
                        'key_secret' => (string) $salt,
                        'mode' => (string) ($ph['mode'] ?? ($gwConfig['mode'] ?? 'test')),
                        'config' => $config,
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
            } elseif ($provider === 'stripe') {
                $st = $onlinePayments['stripe'] ?? [];
                $key = $st['publishableKey'] ?? ($gwConfig['key_id'] ?? null);
                $secret = $st['secretKey'] ?? ($gwConfig['key_secret'] ?? null);
                if (! empty($secret)) {
                    return [
                        'key_id' => (string) ($key ?? ''),
                        'key_secret' => (string) $secret,
                        'mode' => (string) ($st['mode'] ?? ($gwConfig['mode'] ?? 'test')),
                        'config' => $gwConfig,
                    ];
                }
            }
        }

        // Platform (Super Admin) gateway keys bill tenant subscriptions only.
        // They are never used for a store's checkout or POS.
        return null;
    }

    /**
     * @param  array{key_id?: string, mode?: string}|null  $creds
     */
    private function phonePeIsLive(?array $creds): bool
    {
        $mode = (string) ($creds['mode'] ?? 'test');
        if ($mode === 'live') {
            return true;
        }
        $merchantId = strtoupper((string) ($creds['key_id'] ?? ''));

        return $merchantId !== ''
            && ! str_contains($merchantId, 'TEST')
            && ! str_contains($merchantId, 'UAT')
            && ! str_contains($merchantId, 'SANDBOX');
    }

    /**
     * @return array{dqr: string, pg: string}
     */
    private function phonePeHosts(bool $live): array
    {
        return $live
            ? [
                'dqr' => 'https://mercury.phonepe.com/enterprise',
                'pg' => 'https://api.phonepe.com/apis/hermes',
            ]
            : [
                'dqr' => 'https://mercury-uat.phonepe.com/enterprise-sandbox',
                'pg' => 'https://api-preprod.phonepe.com/apis/pg-sandbox',
            ];
    }

    private function validVpa(string $vpa): bool
    {
        return (bool) preg_match('/^[A-Za-z0-9._-]{2,}@[A-Za-z]{2,64}$/', trim($vpa));
    }

    /** PhonePe accepts only letters and digits, 1–34 characters. */
    private function phonePeRef(string $raw): string
    {
        $clean = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $raw) ?? '');
        if ($clean === '') {
            $clean = strtoupper(bin2hex(random_bytes(8)));
        }

        return substr($clean, 0, 34);
    }

    /**
     * @param  array<string, mixed>  $body
     */
    private function phonePeFailure(array $body, int $status): string
    {
        $message = trim((string) ($body['message'] ?? $body['code'] ?? ''));
        if ($message === '' && is_array($body['data'] ?? null)) {
            $message = trim((string) ($body['data']['message'] ?? $body['data']['responseCode'] ?? ''));
        }

        return $message !== '' ? $message : 'PhonePe returned HTTP '.$status;
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

        $mode = is_array($creds) ? (string) ($creds['mode'] ?? 'test') : 'test';
        $vpa = trim((string) (
            (is_array($creds) ? ($creds['config']['upi_vpa'] ?? null) : null)
            ?? ($store->settings['online_store']['payments']['upiQr']['vpa']
            ?? ($store->settings['gateway_configs']['upi_qr']['upi_vpa']
            ?? ''))
        ));
        $payeeName = trim((string) (
            (is_array($creds) ? ($creds['config']['merchant_name'] ?? null) : null)
            ?? ($store->settings['online_store']['payments']['upiQr']['merchantName']
            ?? ($store->settings['tenant']['tradeName']
            ?? $store->name))
        ));

        $txnId = $this->phonePeRef('TXN'.(string) $order['number'].(string) $order['id']);

        $paymentUrl = null;
        $upiIntentUrl = null;
        $allUpiUris = [];

        $gatewayError = null;

        // A static UPI link is only valid when the payee is a real VPA (name@bank).
        // A Merchant ID is not a UPI ID. PhonePe shows "Invalid UPI ID" if pa= is empty or a MID.
        if (! $this->validVpa($vpa)) {
            $vpa = '';
        }

        $providerReference = null;
        $redirectForm = null;

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

        if ($provider === 'phonepe' && is_array($creds)) {
            $merchantId = $creds['key_id'] ?? null;
            $saltKey = $creds['key_secret'] ?? null;
            $saltIndex = (string) ($creds['config']['salt_index'] ?? '1');
            $providerId = trim((string) (
                $creds['config']['provider_id']
                ?? ($creds['config']['x_provider_id']
                ?? ($creds['config']['store_terminal_id'] ?? ''))
            ));
            $storeDqrId = trim((string) ($creds['config']['store_id'] ?? ''));
            $terminalDqrId = trim((string) ($creds['config']['terminal_id'] ?? ''));

            if (! empty($merchantId) && ! empty($saltKey)) {
                $mercurySuccess = false;
                $live = $this->phonePeIsLive($creds);
                $hosts = $this->phonePeHosts($live);
                $mercuryBase = $hosts['dqr'];

                // 1. First try PhonePe Mercury POS DQR API
                $dqrPayload = [
                    'merchantId' => $merchantId,
                    'transactionId' => $txnId,
                    'merchantOrderId' => $this->phonePeRef('ORD'.(string) $order['number']),
                    'amount' => $amountPaise,
                    'expiresIn' => 1800,
                ];
                if ($storeDqrId !== '') {
                    $dqrPayload['storeId'] = $storeDqrId;
                }
                if ($terminalDqrId !== '') {
                    $dqrPayload['terminalId'] = $terminalDqrId;
                }

                $encodedDqr = base64_encode(json_encode($dqrPayload));
                $checksumDqr = hash('sha256', $encodedDqr . '/v3/qr/init' . $saltKey) . '###' . $saltIndex;

                $headersDqr = [
                    'Content-Type' => 'application/json',
                    'Accept' => 'application/json',
                    'X-VERIFY' => $checksumDqr,
                    'X-CALLBACK-URL' => url('/api/v1/public/webhooks/phonepe'),
                ];
                if (! empty($providerId)) {
                    $headersDqr['X-PROVIDER-ID'] = $providerId;
                }

                try {
                    $dqrRes = Http::withHeaders($headersDqr)->timeout(6)->post("{$mercuryBase}/v3/qr/init", [
                        'request' => $encodedDqr,
                    ]);

                    $dqrBody = $dqrRes->json() ?? [];
                    $qrString = (string) ($dqrBody['data']['qrString'] ?? $dqrBody['data']['qrData'] ?? '');
                    if ($dqrRes->successful() && ! empty($dqrBody['success']) && $qrString !== '') {
                            $paymentUrl = $qrString;
                            $upiIntentUrl = $qrString;
                            $mercurySuccess = true;

                            if (preg_match('/[?&]pa=([^&]+)/', $qrString, $vpaM)) {
                                $vpa = urldecode($vpaM[1]);
                            }

                            $allUpiUris = [
                                'standard' => $qrString,
                                'phonepe' => str_starts_with($qrString, 'upi://') ? 'phonepe://' . substr($qrString, 6) : $qrString,
                                'gpay' => str_starts_with($qrString, 'upi://') ? 'tez://upi/' . substr($qrString, 6) : $qrString,
                                'paytm' => str_starts_with($qrString, 'upi://') ? 'paytmmp://' . substr($qrString, 6) : $qrString,
                                'bhim' => str_starts_with($qrString, 'upi://') ? 'bhim://' . substr($qrString, 6) : $qrString,
                            ];
                    } else {
                        $gatewayError = $this->phonePeFailure(is_array($dqrBody) ? $dqrBody : [], $dqrRes->status());
                        Log::warning('PhonePe DQR rejected', ['order_id' => $order['id'], 'status' => $dqrRes->status(), 'message' => $gatewayError]);
                    }
                } catch (\Throwable $e) {
                    $gatewayError = 'PhonePe Dynamic QR could not be reached.';
                    Log::warning('PhonePe Mercury DQR Init error', ['order_id' => $order['id'], 'error' => $e->getMessage()]);
                }

                // The storefront needs the hosted https page. A upi:// QR link does not open checkout on a computer.
                {
                    $phonePeBase = $hosts['pg'];

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

                    $hermesHeaders = [
                        'Content-Type' => 'application/json',
                        'Accept' => 'application/json',
                        'X-VERIFY' => $checksum,
                    ];

                    try {
                        $response = Http::withHeaders($hermesHeaders)->timeout(8)->post("{$phonePeBase}/pg/v1/pay", [
                            'request' => $encodedPayload,
                        ]);

                        $resData = $response->json() ?? [];
                        if ($response->successful() && ! empty($resData['success'])) {
                                $redirectInfo = $resData['data']['instrumentResponse']['redirectInfo'] ?? [];
                                if (! empty($redirectInfo['url'])) {
                                    $paymentUrl = (string) $redirectInfo['url'];
                                    $gatewayError = null;
                                }
                                if (! empty($resData['data']['instrumentResponse']['intentUrl'])) {
                                    $upiIntentUrl = (string) $resData['data']['instrumentResponse']['intentUrl'];
                                }
                        } else {
                            $gatewayError = $this->phonePeFailure(is_array($resData) ? $resData : [], $response->status());
                            Log::warning('PhonePe checkout rejected', ['order_id' => $order['id'], 'status' => $response->status(), 'message' => $gatewayError]);
                        }
                    } catch (\Throwable $e) {
                        $gatewayError = 'PhonePe checkout could not be reached.';
                        Log::warning('PhonePe Hermes PG API error', ['order_id' => $order['id'], 'error' => $e->getMessage()]);
                    }
                }
            }

            if (! $paymentUrl && $upiIntentUrl && $this->validVpa($vpa)) {
                $paymentUrl = $upiIntentUrl;
            }
            if (! $paymentUrl && $gatewayError === null) {
                $gatewayError = 'PhonePe did not return a payment page. Check the Merchant ID, salt key, salt index, and Provider ID, then turn PhonePe on.';
            }
        } elseif ($provider === 'razorpay' && is_array($creds)) {
            $started = $this->startRazorpay($creds, $amountPaise, $order, $customerData, $returnUrl);
            $paymentUrl = $started['url'];
            $providerReference = $started['reference'];
            $gatewayError = $started['error'];
        } elseif ($provider === 'stripe' && is_array($creds)) {
            $secretKey = $creds['key_secret'] ?? null;
            if (! empty($secretKey) && ! app()->environment('testing')) {
                try {
                    $stripeRes = Http::withToken($secretKey)->asForm()->timeout(8)->post('https://api.stripe.com/v1/checkout/sessions', [
                        'success_url' => $returnUrl.(str_contains($returnUrl, '?') ? '&' : '?').'session_id={CHECKOUT_SESSION_ID}',
                        'cancel_url' => $returnUrl,
                        'mode' => 'payment',
                        'line_items' => [
                            [
                                'price_data' => [
                                    'currency' => 'inr',
                                    'product_data' => [
                                        'name' => 'Order #' . $order['number'],
                                    ],
                                    'unit_amount' => $amountPaise,
                                ],
                                'quantity' => 1,
                            ],
                        ],
                        'client_reference_id' => (string) $order['id'],
                    ]);
                    if ($stripeRes->successful()) {
                        $stripeData = $stripeRes->json();
                        $paymentUrl = $stripeData['url'] ?? null;
                        $providerReference = $stripeData['id'] ?? null;
                    } else {
                        $gatewayError = (string) ($stripeRes->json('error.message') ?? 'Stripe did not open a checkout page.');
                    }
                } catch (\Throwable $e) {
                    Log::warning('Stripe Session Create error', ['order_id' => $order['id'], 'error' => $e->getMessage()]);
                }
            }
        } elseif ($provider === 'paytm' && is_array($creds)) {
            $started = $this->startPaytm($creds, $amountPaise, $order, $customerData, $returnUrl);
            $redirectForm = $started['form'];
            $providerReference = $started['reference'];
            $gatewayError = $started['error'];
            if ($redirectForm !== null) {
                $paymentUrl = $redirectForm['action'];
            }
        }

        $paymentRow = [
            'id' => $paymentId,
            'tenant_id' => $store->tenant_id,
            'store_id' => $store->id,
            'order_id' => $order['id'],
            'provider' => $provider,
            'mode' => $mode,
            'amount_paise' => $amountPaise,
            'status' => 'created',
            'provider_reference' => $providerReference,
            'capture_token_hash' => hash_hmac('sha256', $token, (string) config('app.key')),
            'created_at' => now(),
            'updated_at' => now(),
        ];
        if ($provider === 'phonepe') {
            $paymentRow['provider_reference'] = $txnId;
        }
        if (! Schema::hasColumn('payments', 'provider_reference')) {
            unset($paymentRow['provider_reference']);
        }
        DB::table('payments')->insert($paymentRow);

        $result = [
            'id' => $paymentId,
            'provider' => $provider,
            'mode' => $mode,
            'amount_paise' => $amountPaise,
            'transaction_id' => $txnId,
            'payment_url' => $paymentUrl,
            'redirect_url' => $paymentUrl,
            'redirect_form' => $redirectForm,
            'upi_intent_url' => $upiIntentUrl,
            'upi_uris' => $allUpiUris,
            'vpa' => $this->validVpa($vpa) ? $vpa : null,
            'payee_name' => $payeeName,
            'error' => $gatewayError,
        ];

        if (app()->environment('local', 'testing')) {
            $result['capture_token'] = $token;
        }

        return $result;
    }

    /**
     * Generate dynamic counter QR for POS terminals.
     *
     * @param Store $store
     * @param int $amountPaise
     * @param string $orderRef
     * @return array<string, mixed>
     */
    public function generatePosQr(Store $store, int $amountPaise, string $orderRef): array
    {
        $creds = $this->resolveCredentials($store->id, 'phonepe');
        $phonePeError = null;
        if ($creds && ! empty($creds['key_id']) && ! empty($creds['key_secret'])) {
            $merchantId = $creds['key_id'];
            $saltKey = $creds['key_secret'];
            $saltIndex = (string) ($creds['config']['salt_index'] ?? '1');
            $providerId = trim((string) (
                $creds['config']['provider_id']
                ?? ($creds['config']['x_provider_id']
                ?? ($creds['config']['store_terminal_id'] ?? ''))
            ));
            $storeDqrId = trim((string) ($creds['config']['store_id'] ?? ''));
            $terminalDqrId = trim((string) ($creds['config']['terminal_id'] ?? ''));

            $txnId = $this->phonePeRef('POS'.$orderRef.(string) time());
            $hosts = $this->phonePeHosts($this->phonePeIsLive($creds));
            $mercuryBase = $hosts['dqr'];

            $payload = [
                'merchantId' => $merchantId,
                'transactionId' => $txnId,
                'merchantOrderId' => $this->phonePeRef($orderRef),
                'amount' => $amountPaise,
                'expiresIn' => 1800,
            ];
            if ($storeDqrId !== '') {
                $payload['storeId'] = $storeDqrId;
            }
            if ($terminalDqrId !== '') {
                $payload['terminalId'] = $terminalDqrId;
            }

            $encoded = base64_encode(json_encode($payload));
            $checksum = hash('sha256', $encoded . '/v3/qr/init' . $saltKey) . '###' . $saltIndex;

            $headers = [
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
                'X-VERIFY' => $checksum,
                'X-CALLBACK-URL' => url('/api/v1/public/webhooks/phonepe'),
            ];
            if (! empty($providerId)) {
                $headers['X-PROVIDER-ID'] = $providerId;
            }

            try {
                $res = Http::withHeaders($headers)->timeout(6)->post("{$mercuryBase}/v3/qr/init", [
                    'request' => $encoded,
                ]);

                $body = $res->json() ?? [];
                $qrString = (string) ($body['data']['qrString'] ?? $body['data']['qrData'] ?? '');
                if ($res->successful() && ! empty($body['success']) && $qrString !== '') {
                        $vpa = '';
                        if (preg_match('/[?&]pa=([^&]+)/', $qrString, $m)) {
                            $vpa = urldecode($m[1]);
                        }
                        if (! $this->validVpa($vpa)) {
                            $vpa = '';
                        }
                        $payeeName = (string) ($creds['config']['merchant_name'] ?? ($store->name ?: 'Store'));
                        if (preg_match('/[?&]pn=([^&]+)/', $qrString, $m)) {
                            $payeeName = urldecode($m[1]);
                        }

                        return [
                            'success' => true,
                            'provider' => 'phonepe',
                            'transaction_id' => $txnId,
                            'qr_string' => $qrString,
                            'vpa' => $vpa,
                            'payee_name' => $payeeName,
                        ];
                }
                $phonePeError = $this->phonePeFailure(is_array($body) ? $body : [], $res->status());
            } catch (\Throwable $e) {
                $phonePeError = 'PhonePe Dynamic QR could not be reached.';
                Log::warning('POS PhonePe DQR Init error', ['error' => $e->getMessage()]);
            }
        }

        $fallbackVpa = trim((string) (
            (is_array($creds) ? ($creds['config']['upi_vpa'] ?? null) : null)
            ?: ($store->settings['gateway_configs']['phonepe']['upi_vpa']
            ?? ($store->settings['online_store']['payments']['upiQr']['vpa']
            ?? ''))
        ));
        if ($this->validVpa($fallbackVpa)) {
            $payee = (string) ((is_array($creds) ? ($creds['config']['merchant_name'] ?? null) : null) ?: ($store->name ?: 'Store'));
            $formattedAmount = number_format($amountPaise / 100, 2, '.', '');
            $genericUri = "upi://pay?pa={$fallbackVpa}&pn=" . rawurlencode($payee) . "&am={$formattedAmount}&cu=INR&tn=" . rawurlencode("POS Counter Bill {$orderRef}");

            return [
                'success' => true,
                'provider' => 'upi',
                'transaction_id' => null,
                'qr_string' => $genericUri,
                'vpa' => $fallbackVpa,
                'payee_name' => $payee,
            ];
        }

        $hosted = $this->hostedPosCheckout($store, $amountPaise, $orderRef);
        if ($hosted !== null) {
            return $hosted;
        }

        return [
            'success' => false,
            'provider' => 'phonepe',
            'transaction_id' => null,
            'qr_string' => null,
            'vpa' => null,
            'payee_name' => $store->name,
            'error' => $phonePeError ?: 'No live payment gateway returned a QR. Turn on PhonePe, Razorpay, Stripe, or Paytm and save its live keys.',
        ];
    }

    /**
     * Check POS dynamic QR payment status.
     *
     * @param Store $store
     * @param string $transactionId
     * @return array{paid: bool, status: string}
     */
    public function verifyPosQrStatus(Store $store, string $transactionId, string $provider = 'phonepe'): array
    {
        if ($provider === 'razorpay') {
            $paid = $this->razorpayLinkPaid($store->id, $transactionId);

            return ['paid' => $paid, 'status' => $paid ? 'COMPLETED' : 'PENDING'];
        }
        if ($provider === 'stripe') {
            $paid = $this->stripeSessionPaid($store->id, $transactionId);

            return ['paid' => $paid, 'status' => $paid ? 'COMPLETED' : 'PENDING'];
        }
        if ($provider === 'paytm') {
            $paid = $this->paytmOrderPaid($store->id, $transactionId);

            return ['paid' => $paid, 'status' => $paid ? 'COMPLETED' : 'PENDING'];
        }

        return $this->phonePePosStatus($store, $transactionId);
    }

    public function phonePePosStatus(Store $store, string $transactionId): array
    {
        $creds = $this->resolveCredentials($store->id, 'phonepe');
        if ($creds && ! empty($creds['key_id']) && ! empty($creds['key_secret'])) {
            $merchantId = $creds['key_id'];
            $saltKey = $creds['key_secret'];
            $saltIndex = (string) ($creds['config']['salt_index'] ?? '1');
            $providerId = trim((string) (
                $creds['config']['provider_id']
                ?? ($creds['config']['x_provider_id']
                ?? ($creds['config']['store_terminal_id'] ?? ''))
            ));

            $endpoint = "/v3/transaction/{$merchantId}/{$transactionId}/status";
            $checksum = hash('sha256', $endpoint . $saltKey) . '###' . $saltIndex;
            $mercuryBase = $this->phonePeHosts($this->phonePeIsLive($creds))['dqr'];

            $headers = [
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
                'X-VERIFY' => $checksum,
            ];
            if (! empty($providerId)) {
                $headers['X-PROVIDER-ID'] = $providerId;
            }

            try {
                $res = Http::withHeaders($headers)->timeout(5)->get("{$mercuryBase}{$endpoint}");
                if ($res->successful()) {
                    $body = $res->json();
                    $state = $body['data']['paymentState'] ?? ($body['code'] ?? null);
                    if ($state === 'COMPLETED' || $state === 'SUCCESS' || $state === 'PAYMENT_SUCCESS') {
                        return ['paid' => true, 'status' => 'COMPLETED'];
                    }
                }
            } catch (\Throwable $e) {
                // Ignore transient network errors during status poll
            }
        }

        return ['paid' => false, 'status' => 'PENDING'];
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

        // PhonePe Status Check API (Checks Mercury DQR first, then Hermes PG)
        if ($payment->provider === 'phonepe') {
            $creds = $this->resolveCredentials($payment->store_id, 'phonepe');
            if ($creds) {
                $merchantId = $creds['key_id'];
                $saltKey = $creds['key_secret'];
                $saltIndex = (string) ($creds['config']['salt_index'] ?? '1');
                $providerId = trim((string) (
                    $creds['config']['provider_id']
                    ?? ($creds['config']['x_provider_id']
                    ?? ($creds['config']['store_terminal_id'] ?? ''))
                ));

                $txnId = $this->phonePeRef('TXN'.$order->number.$order->id);

                // 1. Try Mercury DQR Status
                $mercuryEndpoint = "/v3/transaction/{$merchantId}/{$txnId}/status";
                $mercuryChecksum = hash('sha256', $mercuryEndpoint . $saltKey) . '###' . $saltIndex;
                $mercuryHeaders = [
                    'Content-Type' => 'application/json',
                    'Accept' => 'application/json',
                    'X-VERIFY' => $mercuryChecksum,
                ];
                if (! empty($providerId)) {
                    $mercuryHeaders['X-PROVIDER-ID'] = $providerId;
                }

                try {
                    $mercuryBase = $this->phonePeHosts($this->phonePeIsLive($creds))['dqr'];
                    $mRes = Http::withHeaders($mercuryHeaders)->timeout(6)->get("{$mercuryBase}{$mercuryEndpoint}");
                    if ($mRes->successful()) {
                        $mBody = $mRes->json();
                        $state = $mBody['data']['paymentState'] ?? ($mBody['code'] ?? null);
                        if ($state === 'COMPLETED' || $state === 'SUCCESS' || $state === 'PAYMENT_SUCCESS') {
                            $this->capture->captureFromProvider($payment->id);
                            return [
                                'paid' => true,
                                'status' => 'captured',
                                'method' => 'phonepe',
                                'sale_id' => DB::table('orders')->where('id', $orderId)->value('sale_id'),
                            ];
                        }
                    }
                } catch (\Throwable $e) {}

                // 2. Try Hermes PG Status
                $phonePeBase = $this->phonePeHosts($this->phonePeIsLive($creds))['pg'];

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
                            $this->capture->captureFromProvider($payment->id);
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
        } elseif (in_array($payment->provider, ['razorpay', 'stripe', 'paytm'], true)) {
            if ($this->providerPaymentCaptured($payment, $order)) {
                $this->capture->captureFromProvider($payment->id);

                return [
                    'paid' => true,
                    'status' => 'captured',
                    'method' => (string) $payment->provider,
                    'sale_id' => DB::table('orders')->where('id', $orderId)->value('sale_id'),
                ];
            }
        }

        return [
            'paid' => false,
            'status' => (string) $payment->status,
            'method' => (string) $payment->provider,
            'sale_id' => null,
        ];
    }

    /**
     * @param  array{key_id?: string, key_secret?: string, mode?: string, config?: array<string, mixed>}  $creds
     * @param  array<string, mixed>  $order
     * @param  array<string, mixed>  $customer
     * @return array{url: ?string, reference: ?string, error: ?string}
     */
    private function startRazorpay(array $creds, int $amountPaise, array $order, array $customer, string $returnUrl): array
    {
        if (app()->environment('testing') || empty($creds['key_id']) || empty($creds['key_secret'])) {
            return ['url' => null, 'reference' => null, 'error' => empty($creds['key_secret']) ? 'Save the Razorpay key id and key secret.' : null];
        }
        $phone = substr(preg_replace('/\D/', '', (string) ($customer['customer_phone'] ?? $customer['phone'] ?? '')) ?? '', -10);
        $payload = [
            'amount' => $amountPaise,
            'currency' => 'INR',
            'accept_partial' => false,
            'description' => 'Order '.$order['number'],
            'notify' => ['sms' => false, 'email' => false],
            'reminder_enable' => false,
            'callback_url' => $returnUrl,
            'callback_method' => 'get',
            'notes' => ['order_id' => (string) $order['id']],
        ];
        if ($phone !== '') {
            $payload['customer'] = array_filter([
                'name' => (string) ($customer['customer_name'] ?? $customer['name'] ?? 'Customer'),
                'contact' => $phone,
                'email' => $customer['customer_email'] ?? $customer['email'] ?? null,
            ]);
        }
        try {
            $response = Http::withBasicAuth((string) $creds['key_id'], (string) $creds['key_secret'])
                ->timeout(8)
                ->post('https://api.razorpay.com/v1/payment_links', $payload);
            if ($response->successful() && is_string($response->json('short_url'))) {
                return ['url' => $response->json('short_url'), 'reference' => $response->json('id'), 'error' => null];
            }
            $message = (string) ($response->json('error.description') ?? 'Razorpay did not open a payment page.');

            return ['url' => null, 'reference' => null, 'error' => $message];
        } catch (\Throwable $e) {
            Log::warning('Razorpay payment link error', ['error' => $e->getMessage()]);

            return ['url' => null, 'reference' => null, 'error' => 'Razorpay could not be reached.'];
        }
    }

    /**
     * @param  array{key_id?: string, key_secret?: string, mode?: string, config?: array<string, mixed>}  $creds
     * @param  array<string, mixed>  $order
     * @param  array<string, mixed>  $customer
     * @return array{form: ?array{action: string, method: string, fields: array<string, string>}, reference: ?string, error: ?string}
     */
    private function startPaytm(array $creds, int $amountPaise, array $order, array $customer, string $returnUrl): array
    {
        if (app()->environment('testing') || empty($creds['key_id']) || empty($creds['key_secret'])) {
            return ['form' => null, 'reference' => null, 'error' => empty($creds['key_secret']) ? 'Save the Paytm merchant id and merchant key.' : null];
        }
        $mid = (string) $creds['key_id'];
        $orderId = strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', 'PT'.$order['number'].$order['id']) ?? 'PT', 0, 40));
        $live = ($creds['mode'] ?? 'test') === 'live';
        $host = $live ? 'https://securegw.paytm.in' : 'https://securegw-stage.paytm.in';
        $website = (string) ($creds['config']['website'] ?? ($live ? 'DEFAULT' : 'WEBSTAGING'));
        $body = [
            'requestType' => 'Payment',
            'mid' => $mid,
            'websiteName' => $website,
            'orderId' => $orderId,
            'callbackUrl' => url('/api/v1/public/webhooks/paytm'),
            'txnAmount' => [
                'value' => number_format($amountPaise / 100, 2, '.', ''),
                'currency' => 'INR',
            ],
            'userInfo' => [
                'custId' => 'CUST'.substr(preg_replace('/\D/', '', (string) ($customer['customer_phone'] ?? '10001')) ?? '10001', -10),
            ],
        ];
        $payload = [
            'body' => $body,
            'head' => ['signature' => PaytmChecksum::signBody($body, (string) $creds['key_secret'])],
        ];
        try {
            $response = Http::timeout(8)->post($host.'/theia/api/v1/initiateTransaction?mid='.rawurlencode($mid).'&orderId='.rawurlencode($orderId), $payload);
            $token = $response->json('body.txnToken');
            if ($response->successful() && is_string($token) && $token !== '') {
                Cache::put('paytm_return_'.$orderId, $returnUrl, now()->addHours(3));

                return [
                    'form' => [
                        'action' => $host.'/theia/api/v1/showPaymentPage?mid='.rawurlencode($mid).'&orderId='.rawurlencode($orderId),
                        'method' => 'POST',
                        'fields' => [
                            'mid' => $mid,
                            'orderId' => $orderId,
                            'txnToken' => $token,
                        ],
                    ],
                    'reference' => $orderId,
                    'error' => null,
                ];
            }
            $message = (string) ($response->json('body.resultInfo.resultMsg') ?? 'Paytm did not open a payment page.');

            return ['form' => null, 'reference' => null, 'error' => $message];
        } catch (\Throwable $e) {
            Log::warning('Paytm initiate error', ['error' => $e->getMessage()]);

            return ['form' => null, 'reference' => null, 'error' => 'Paytm could not be reached.'];
        }
    }

    /**
     * @return array{success: bool, provider: string, transaction_id: ?string, qr_string: ?string, vpa: ?string, payee_name: string, error?: string}|null
     */
    private function hostedPosCheckout(Store $store, int $amountPaise, string $orderRef): ?array
    {
        if (app()->environment('testing')) {
            return null;
        }
        $returnUrl = url('/');
        $stubOrder = ['id' => (string) Str::uuid7(), 'number' => $orderRef, 'total_paise' => $amountPaise];
        $customer = ['customer_phone' => '9999999999', 'customer_name' => $store->name];
        foreach (['razorpay', 'stripe', 'paytm'] as $provider) {
            if (! $this->gatewayActive($store->id, $provider)) {
                continue;
            }
            $creds = $this->resolveCredentials($store->id, $provider);
            if (! is_array($creds)) {
                continue;
            }
            if ($provider === 'razorpay') {
                $started = $this->startRazorpay($creds, $amountPaise, $stubOrder, $customer, $returnUrl);
                if (is_string($started['url']) && $started['url'] !== '') {
                    return [
                        'success' => true,
                        'provider' => 'razorpay',
                        'transaction_id' => $started['reference'],
                        'qr_string' => $started['url'],
                        'vpa' => null,
                        'payee_name' => $store->name,
                    ];
                }
            }
            if ($provider === 'stripe' && ! empty($creds['key_secret'])) {
                try {
                    $response = Http::withToken((string) $creds['key_secret'])->asForm()->timeout(8)->post('https://api.stripe.com/v1/checkout/sessions', [
                        'success_url' => $returnUrl,
                        'cancel_url' => $returnUrl,
                        'mode' => 'payment',
                        'line_items' => [[
                            'price_data' => [
                                'currency' => 'inr',
                                'product_data' => ['name' => 'Counter '.$orderRef],
                                'unit_amount' => $amountPaise,
                            ],
                            'quantity' => 1,
                        ]],
                    ]);
                    $url = $response->json('url');
                    if (is_string($url) && $url !== '') {
                        return [
                            'success' => true,
                            'provider' => 'stripe',
                            'transaction_id' => $response->json('id'),
                            'qr_string' => $url,
                            'vpa' => null,
                            'payee_name' => $store->name,
                        ];
                    }
                } catch (\Throwable $e) {
                    Log::warning('Stripe POS session error', ['error' => $e->getMessage()]);
                }
            }
            if ($provider === 'paytm') {
                $started = $this->startPaytm($creds, $amountPaise, $stubOrder, $customer, $returnUrl);
                if (is_array($started['form'])) {
                    return [
                        'success' => true,
                        'provider' => 'paytm',
                        'transaction_id' => $started['reference'],
                        'qr_string' => $started['form']['action'],
                        'vpa' => null,
                        'payee_name' => $store->name,
                    ];
                }
            }
        }

        return null;
    }

    private function gatewayActive(string $storeId, string $provider): bool
    {
        return DB::table('payment_gateways')
            ->where('store_id', $storeId)
            ->where('provider', $provider)
            ->where('status', 'active')
            ->exists();
    }

    private function providerPaymentCaptured(object $payment, object $order): bool
    {
        $reference = (string) ($payment->provider_reference ?? '');
        if ($reference === '') {
            return false;
        }
        if ($payment->provider === 'razorpay') {
            return $this->razorpayLinkPaid((string) $payment->store_id, $reference, (int) $order->total_paise);
        }
        if ($payment->provider === 'stripe') {
            return $this->stripeSessionPaid((string) $payment->store_id, $reference, (int) $order->total_paise);
        }
        if ($payment->provider === 'paytm') {
            return $this->paytmOrderPaid((string) $payment->store_id, $reference, (int) $order->total_paise);
        }

        return false;
    }

    private function razorpayLinkPaid(string $storeId, string $linkId, ?int $amountPaise = null): bool
    {
        $creds = $this->resolveCredentials($storeId, 'razorpay');
        if (! is_array($creds) || $linkId === '') {
            return false;
        }
        try {
            $response = Http::withBasicAuth((string) $creds['key_id'], (string) $creds['key_secret'])
                ->timeout(8)
                ->get('https://api.razorpay.com/v1/payment_links/'.$linkId);
            if (! $response->successful() || $response->json('status') !== 'paid') {
                return false;
            }
            if ($amountPaise !== null && (int) $response->json('amount') !== $amountPaise) {
                return false;
            }

            return true;
        } catch (\Throwable) {
            return false;
        }
    }

    private function stripeSessionPaid(string $storeId, string $sessionId, ?int $amountPaise = null): bool
    {
        $creds = $this->resolveCredentials($storeId, 'stripe');
        if (! is_array($creds) || $sessionId === '' || empty($creds['key_secret'])) {
            return false;
        }
        try {
            $response = Http::withToken((string) $creds['key_secret'])
                ->timeout(8)
                ->get('https://api.stripe.com/v1/checkout/sessions/'.$sessionId);
            if (! $response->successful() || $response->json('payment_status') !== 'paid') {
                return false;
            }
            if ($amountPaise !== null && (int) $response->json('amount_total') !== $amountPaise) {
                return false;
            }

            return true;
        } catch (\Throwable) {
            return false;
        }
    }

    private function paytmOrderPaid(string $storeId, string $orderId, ?int $amountPaise = null): bool
    {
        $creds = $this->resolveCredentials($storeId, 'paytm');
        if (! is_array($creds) || $orderId === '' || empty($creds['key_secret'])) {
            return false;
        }
        $live = ($creds['mode'] ?? 'test') === 'live';
        $host = $live ? 'https://securegw.paytm.in' : 'https://securegw-stage.paytm.in';
        $body = ['mid' => (string) $creds['key_id'], 'orderId' => $orderId];
        try {
            $response = Http::timeout(8)->post($host.'/v3/order/status', [
                'body' => $body,
                'head' => ['signature' => PaytmChecksum::signBody($body, (string) $creds['key_secret'])],
            ]);
            $status = (string) $response->json('body.resultInfo.resultStatus');
            if ($status !== 'TXN_SUCCESS') {
                return false;
            }
            if ($amountPaise !== null) {
                $rupees = (float) $response->json('body.txnAmount');
                if ((int) round($rupees * 100) !== $amountPaise) {
                    return false;
                }
            }

            return true;
        } catch (\Throwable) {
            return false;
        }
    }

    /**
     * Provider-native webhooks. Returns null when the body is the internal test format.
     *
     * @param  array<string, mixed>  $form
     * @return array{status: int, redirect?: string}|null
     */
    public function handleNativeWebhook(string $provider, string $raw, ?string $signature, array $form = []): ?array
    {
        if ($provider === 'paytm' && isset($form['CHECKSUMHASH'], $form['ORDERID'])) {
            $paid = $this->acceptPaytmCallback($form);
            $redirect = Cache::get('paytm_return_'.(string) $form['ORDERID']);

            return [
                'status' => $paid ? 200 : 400,
                'redirect' => is_string($redirect) ? $redirect : null,
            ];
        }

        $payload = json_decode($raw, true);
        if (! is_array($payload) || isset($payload['event_id'])) {
            return null;
        }
        if ($provider === 'razorpay' && isset($payload['event'])) {
            return ['status' => $this->acceptRazorpayWebhook($raw, $signature, $payload) ? 200 : 400];
        }
        if ($provider === 'stripe' && isset($payload['type'])) {
            return ['status' => $this->acceptStripeWebhook($raw, $signature, $payload) ? 200 : 400];
        }
        if ($provider === 'phonepe' && isset($payload['response'])) {
            return ['status' => $this->acceptPhonePeWebhook((string) $payload['response'], $signature) ? 200 : 400];
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function acceptRazorpayWebhook(string $raw, ?string $signature, array $payload): bool
    {
        $notes = $payload['payload']['payment_link']['entity']['notes']
            ?? $payload['payload']['payment']['entity']['notes']
            ?? [];
        $orderId = is_array($notes) ? ($notes['order_id'] ?? null) : null;
        if (! is_string($orderId) || $orderId === '') {
            return false;
        }
        $payment = DB::table('payments')->where('order_id', $orderId)->where('provider', 'razorpay')->orderByDesc('created_at')->first();
        if (! $payment) {
            return false;
        }
        $creds = $this->resolveCredentials((string) $payment->store_id, 'razorpay');
        $secret = is_array($creds) ? (string) ($creds['config']['webhook_secret'] ?? $creds['key_secret'] ?? '') : '';
        if ($secret === '' || ! is_string($signature) || ! hash_equals(hash_hmac('sha256', $raw, $secret), $signature)) {
            return false;
        }
        $event = (string) ($payload['event'] ?? '');
        if (! in_array($event, ['payment_link.paid', 'payment.captured'], true)) {
            return true;
        }
        $this->capture->captureFromProvider((string) $payment->id);

        return true;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function acceptStripeWebhook(string $raw, ?string $signature, array $payload): bool
    {
        $session = $payload['data']['object'] ?? [];
        $orderId = is_array($session) ? ($session['client_reference_id'] ?? null) : null;
        if (! is_string($orderId) || $orderId === '') {
            return false;
        }
        $payment = DB::table('payments')->where('order_id', $orderId)->where('provider', 'stripe')->orderByDesc('created_at')->first();
        if (! $payment) {
            return false;
        }
        $creds = $this->resolveCredentials((string) $payment->store_id, 'stripe');
        $secret = is_array($creds) ? (string) ($creds['config']['webhook_secret'] ?? '') : '';
        if ($secret === '' || ! $this->stripeSignatureValid($raw, $signature, $secret)) {
            return false;
        }
        if (($payload['type'] ?? '') === 'checkout.session.completed' && ($session['payment_status'] ?? '') === 'paid') {
            $this->capture->captureFromProvider((string) $payment->id);
        }

        return true;
    }

    private function stripeSignatureValid(string $raw, ?string $header, string $secret): bool
    {
        if (! is_string($header) || ! preg_match('/t=(\d+),v1=([a-f0-9]+)/', $header, $match)) {
            return false;
        }
        $expected = hash_hmac('sha256', $match[1].'.'.$raw, $secret);

        return hash_equals($expected, $match[2]);
    }

    private function acceptPhonePeWebhook(string $encoded, ?string $signature): bool
    {
        $decoded = json_decode(base64_decode($encoded, true) ?: '', true);
        if (! is_array($decoded)) {
            return false;
        }
        $txnId = (string) ($decoded['data']['merchantTransactionId'] ?? '');
        $payment = $txnId === '' ? null : DB::table('payments')->where('provider_reference', $txnId)->where('provider', 'phonepe')->first();
        if (! $payment) {
            return false;
        }
        $creds = $this->resolveCredentials((string) $payment->store_id, 'phonepe');
        if (! is_array($creds)) {
            return false;
        }
        $saltIndex = (string) ($creds['config']['salt_index'] ?? '1');
        $expected = hash('sha256', $encoded.(string) $creds['key_secret']).'###'.$saltIndex;
        if (! is_string($signature) || ! hash_equals($expected, $signature)) {
            return false;
        }
        $code = (string) ($decoded['code'] ?? '');
        if ($code === 'PAYMENT_SUCCESS') {
            $this->capture->captureFromProvider((string) $payment->id);
        }

        return true;
    }

    /**
     * @param  array<string, mixed>  $form
     */
    private function acceptPaytmCallback(array $form): bool
    {
        $orderId = (string) ($form['ORDERID'] ?? '');
        $payment = DB::table('payments')->where('provider', 'paytm')->where('provider_reference', $orderId)->first();
        if (! $payment) {
            return false;
        }
        $creds = $this->resolveCredentials((string) $payment->store_id, 'paytm');
        if (! is_array($creds) || empty($creds['key_secret'])) {
            return false;
        }
        $checksum = (string) ($form['CHECKSUMHASH'] ?? '');
        if (! PaytmChecksum::verifyParams($form, (string) $creds['key_secret'], $checksum)) {
            return false;
        }
        if (($form['STATUS'] ?? '') === 'TXN_SUCCESS') {
            $this->capture->captureFromProvider((string) $payment->id);
        }

        return true;
    }
}
