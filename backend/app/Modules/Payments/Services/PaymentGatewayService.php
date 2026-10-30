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
                        if (empty($config['provider_id']) && ($keyId === 'SIRIXO01' || $keyId === 'SIRIX001')) {
                            $config['provider_id'] = 'SIRIXOPOS';
                        }
                        if (empty($config['upi_vpa']) && ($keyId === 'SIRIXO01' || $keyId === 'SIRIX001')) {
                            $config['upi_vpa'] = 'SIRIXO01@ybl';
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
                        'provider_id' => $gwConfig['provider_id'] ?? ($gwConfig['x_provider_id'] ?? ($gwConfig['store_terminal_id'] ?? 'SIRIXOPOS')),
                        'store_id' => $gwConfig['store_id'] ?? 'STORE01',
                        'terminal_id' => $gwConfig['terminal_id'] ?? 'TERM01',
                        'upi_vpa' => $gwConfig['upi_vpa'] ?? ($store->settings['online_store']['payments']['upiQr']['vpa'] ?? 'SIRIXO01@ybl'),
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
            } elseif ($provider === 'cashfree') {
                $cf = $onlinePayments['cashfree'] ?? [];
                $appId = $cf['appId'] ?? ($gwConfig['key_id'] ?? null);
                $secretKey = $cf['secretKey'] ?? ($gwConfig['key_secret'] ?? null);
                if (! empty($appId) && ! empty($secretKey)) {
                    return [
                        'key_id' => (string) $appId,
                        'key_secret' => (string) $secretKey,
                        'mode' => (string) ($cf['mode'] ?? ($gwConfig['mode'] ?? 'test')),
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

        // Fallback: check platform global gateway settings if enabled by super admin
        try {
            $platformSettings = DB::table('settings')->where('key', 'platform')->value('value');
            if ($platformSettings) {
                $parsed = json_decode($platformSettings, true);
                $platGw = $parsed['gateways'][$provider] ?? [];
                if (! empty($platGw['enabled'])) {
                    if ($provider === 'phonepe' && ! empty($platGw['merchant_id']) && ! empty($platGw['salt_key'])) {
                        return [
                            'key_id' => (string) $platGw['merchant_id'],
                            'key_secret' => (string) $platGw['salt_key'],
                            'mode' => (string) ($platGw['mode'] ?? 'test'),
                            'config' => [
                                'salt_index' => (string) ($platGw['salt_index'] ?? '1'),
                                'provider_id' => (string) ($platGw['provider_id'] ?? 'SIRIXOPOS'),
                                'store_id' => (string) ($platGw['store_id'] ?? 'STORE01'),
                                'terminal_id' => (string) ($platGw['terminal_id'] ?? 'TERM01'),
                                'upi_vpa' => (string) ($platGw['upi_vpa'] ?? 'SIRIXO01@ybl'),
                            ],
                        ];
                    }
                }
            }
        } catch (\Throwable $e) {}

        return null;

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
            $providerId = trim((string) (
                $creds['config']['provider_id']
                ?? ($creds['config']['x_provider_id']
                ?? ($creds['config']['store_terminal_id'] ?? 'SIRIXOPOS'))
            ));
            $storeDqrId = (string) ($creds['config']['store_id'] ?? 'STORE01');
            $terminalDqrId = (string) ($creds['config']['terminal_id'] ?? 'TERM01');

            if (! empty($merchantId) && ! empty($saltKey)) {
                $mercurySuccess = false;
                $mercuryBase = $mode === 'live'
                    ? 'https://mercury.phonepe.com'
                    : 'https://mercury-uat.phonepe.com/enterprise-sandbox';

                // 1. First try PhonePe Mercury POS DQR API
                $dqrPayload = [
                    'merchantId' => $merchantId,
                    'transactionId' => $txnId,
                    'merchantOrderId' => 'ORD_' . $order['number'],
                    'amount' => $amountPaise,
                    'expiresIn' => 1800,
                    'storeId' => $storeDqrId,
                    'terminalId' => $terminalDqrId,
                ];

                $encodedDqr = base64_encode(json_encode($dqrPayload));
                $checksumDqr = hash('sha256', $encodedDqr . '/v3/qr/init' . $saltKey) . '###' . $saltIndex;

                $headersDqr = [
                    'Content-Type' => 'application/json',
                    'Accept' => 'application/json',
                    'X-VERIFY' => $checksumDqr,
                ];
                if (! empty($providerId)) {
                    $headersDqr['X-PROVIDER-ID'] = $providerId;
                }

                try {
                    $dqrRes = Http::withHeaders($headersDqr)->timeout(6)->post("{$mercuryBase}/v3/qr/init", [
                        'request' => $encodedDqr,
                    ]);

                    if ($dqrRes->successful()) {
                        $dqrBody = $dqrRes->json();
                        if (! empty($dqrBody['success']) && ! empty($dqrBody['data']['qrString'])) {
                            $qrString = (string) $dqrBody['data']['qrString'];
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
                        }
                    }
                } catch (\Throwable $e) {
                    Log::warning('PhonePe Mercury DQR Init error', ['order_id' => $order['id'], 'error' => $e->getMessage()]);
                }

                // 2. If Mercury DQR did not return a qrString, fallback to Hermes Web PG API
                if (! $mercurySuccess) {
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

                    $hermesHeaders = [
                        'Content-Type' => 'application/json',
                        'Accept' => 'application/json',
                        'X-VERIFY' => $checksum,
                    ];
                    if (! empty($providerId)) {
                        $hermesHeaders['X-PROVIDER-ID'] = $providerId;
                    }

                    try {
                        $response = Http::withHeaders($hermesHeaders)->timeout(8)->post("{$phonePeBase}/pg/v1/pay", [
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
                        Log::warning('PhonePe Hermes PG API error', ['order_id' => $order['id'], 'error' => $e->getMessage()]);
                    }
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
        } elseif ($provider === 'razorpay') {
            $keyId = $creds['key_id'] ?? null;
            $keySecret = $creds['key_secret'] ?? null;
            if (! empty($keyId) && ! empty($keySecret)) {
                try {
                    $rzpRes = Http::withBasicAuth($keyId, $keySecret)->timeout(8)->post('https://api.razorpay.com/v1/orders', [
                        'amount' => $amountPaise,
                        'currency' => 'INR',
                        'receipt' => 'ORD_' . $order['number'],
                        'notes' => [
                            'order_id' => (string) $order['id'],
                            'store_id' => (string) $store->id,
                        ],
                    ]);
                    if ($rzpRes->successful()) {
                        $rzpData = $rzpRes->json();
                        $rzpOrderId = $rzpData['id'] ?? null;
                        if ($rzpOrderId) {
                            $paymentUrl = "https://api.razorpay.com/v1/checkout/hosted?order_id={$rzpOrderId}";
                        }
                    }
                } catch (\Throwable $e) {
                    Log::warning('Razorpay Order Create error', ['order_id' => $order['id'], 'error' => $e->getMessage()]);
                }
            }
        } elseif ($provider === 'cashfree') {
            $appId = $creds['key_id'] ?? null;
            $secretKey = $creds['key_secret'] ?? null;
            if (! empty($appId) && ! empty($secretKey)) {
                $cfBase = $mode === 'live' ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg';
                try {
                    $custPhone = substr(preg_replace('/\D/', '', (string) ($customerData['phone'] ?? '9999999999')), -10);
                    $cfRes = Http::withHeaders([
                        'x-client-id' => $appId,
                        'x-client-secret' => $secretKey,
                        'x-api-version' => '2023-08-01',
                        'Content-Type' => 'application/json',
                    ])->timeout(8)->post("{$cfBase}/orders", [
                        'order_id' => $txnId,
                        'order_amount' => $amountPaise / 100,
                        'order_currency' => 'INR',
                        'customer_details' => [
                            'customer_id' => 'CUST_' . $custPhone,
                            'customer_phone' => $custPhone,
                        ],
                        'order_meta' => [
                            'return_url' => $returnUrl,
                        ],
                    ]);
                    if ($cfRes->successful()) {
                        $cfData = $cfRes->json();
                        $paymentSessionId = $cfData['payment_session_id'] ?? null;
                        $paymentUrl = $cfData['payments']['url'] ?? ($paymentSessionId ? "{$cfBase}/orders/sessions/{$paymentSessionId}" : null);
                    }
                } catch (\Throwable $e) {
                    Log::warning('Cashfree Order Create error', ['order_id' => $order['id'], 'error' => $e->getMessage()]);
                }
            }
        } elseif ($provider === 'stripe') {
            $secretKey = $creds['key_secret'] ?? null;
            if (! empty($secretKey)) {
                try {
                    $stripeRes = Http::withToken($secretKey)->asForm()->timeout(8)->post('https://api.stripe.com/v1/checkout/sessions', [
                        'success_url' => $returnUrl,
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
                    }
                } catch (\Throwable $e) {
                    Log::warning('Stripe Session Create error', ['order_id' => $order['id'], 'error' => $e->getMessage()]);
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
        if ($creds && ! empty($creds['key_id']) && ! empty($creds['key_secret'])) {
            $merchantId = $creds['key_id'];
            $saltKey = $creds['key_secret'];
            $saltIndex = (string) ($creds['config']['salt_index'] ?? '1');
            $providerId = trim((string) (
                $creds['config']['provider_id']
                ?? ($creds['config']['x_provider_id']
                ?? ($creds['config']['store_terminal_id'] ?? 'SIRIXOPOS'))
            ));
            $storeDqrId = (string) ($creds['config']['store_id'] ?? 'STORE01');
            $terminalDqrId = (string) ($creds['config']['terminal_id'] ?? 'TERM01');

            $txnId = 'POS_' . preg_replace('/\W/', '', $orderRef) . '_' . time();
            $mercuryBase = ($creds['mode'] ?? 'test') === 'live'
                ? 'https://mercury.phonepe.com'
                : 'https://mercury-uat.phonepe.com/enterprise-sandbox';

            $payload = [
                'merchantId' => $merchantId,
                'transactionId' => $txnId,
                'merchantOrderId' => $orderRef,
                'amount' => $amountPaise,
                'expiresIn' => 1800,
                'storeId' => $storeDqrId,
                'terminalId' => $terminalDqrId,
            ];

            $encoded = base64_encode(json_encode($payload));
            $checksum = hash('sha256', $encoded . '/v3/qr/init' . $saltKey) . '###' . $saltIndex;

            $headers = [
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
                'X-VERIFY' => $checksum,
            ];
            if (! empty($providerId)) {
                $headers['X-PROVIDER-ID'] = $providerId;
            }

            try {
                $res = Http::withHeaders($headers)->timeout(6)->post("{$mercuryBase}/v3/qr/init", [
                    'request' => $encoded,
                ]);

                if ($res->successful()) {
                    $body = $res->json();
                    if (! empty($body['success']) && ! empty($body['data']['qrString'])) {
                        $qrString = (string) $body['data']['qrString'];
                        $vpa = 'SIRIXO01@ybl';
                        if (preg_match('/[?&]pa=([^&]+)/', $qrString, $m)) {
                            $vpa = urldecode($m[1]);
                        }

                        return [
                            'success' => true,
                            'provider' => 'phonepe',
                            'transaction_id' => $txnId,
                            'qr_string' => $qrString,
                            'vpa' => $vpa,
                            'payee_name' => 'SIRIXO',
                        ];
                    }
                }
            } catch (\Throwable $e) {
                Log::warning('POS PhonePe DQR Init error', ['error' => $e->getMessage()]);
            }
        }

        // Generic NPCI UPI fallback if direct DQR failed
        $vpa = trim((string) (
            ($creds['config']['upi_vpa'] ?? null)
            ?: ($store->settings['gateway_configs']['phonepe']['upi_vpa']
            ?? 'SIRIXO01@ybl')
        ));
        $payee = $store->name ?: 'SIRIXO';
        $formattedAmount = number_format($amountPaise / 100, 2, '.', '');
        $genericUri = "upi://pay?pa={$vpa}&pn=" . rawurlencode($payee) . "&am={$formattedAmount}&cu=INR&tn=" . rawurlencode("POS Counter Bill {$orderRef}");

        return [
            'success' => true,
            'provider' => 'upi',
            'transaction_id' => 'POS_LOCAL_' . time(),
            'qr_string' => $genericUri,
            'vpa' => $vpa,
            'payee_name' => $payee,
        ];
    }

    /**
     * Check POS dynamic QR payment status.
     *
     * @param Store $store
     * @param string $transactionId
     * @return array{paid: bool, status: string}
     */
    public function verifyPosQrStatus(Store $store, string $transactionId): array
    {
        $creds = $this->resolveCredentials($store->id, 'phonepe');
        if ($creds && ! empty($creds['key_id']) && ! empty($creds['key_secret'])) {
            $merchantId = $creds['key_id'];
            $saltKey = $creds['key_secret'];
            $saltIndex = (string) ($creds['config']['salt_index'] ?? '1');
            $providerId = trim((string) (
                $creds['config']['provider_id']
                ?? ($creds['config']['x_provider_id']
                ?? ($creds['config']['store_terminal_id'] ?? 'SIRIXOPOS'))
            ));

            $endpoint = "/v3/transaction/{$merchantId}/{$transactionId}/status";
            $checksum = hash('sha256', $endpoint . $saltKey) . '###' . $saltIndex;

            $headers = [
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
                'X-VERIFY' => $checksum,
            ];
            if (! empty($providerId)) {
                $headers['X-PROVIDER-ID'] = $providerId;
            }

            try {
                $res = Http::withHeaders($headers)->timeout(5)->get("https://mercury.phonepe.com{$endpoint}");
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
                    ?? ($creds['config']['store_terminal_id'] ?? 'SIRIXOPOS'))
                ));

                $txnId = 'TXN_' . $order->number . '_' . substr(str_replace('-', '', (string) $order->id), 0, 8);

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
                    $mRes = Http::withHeaders($mercuryHeaders)->timeout(6)->get("https://mercury.phonepe.com{$mercuryEndpoint}");
                    if ($mRes->successful()) {
                        $mBody = $mRes->json();
                        $state = $mBody['data']['paymentState'] ?? ($mBody['code'] ?? null);
                        if ($state === 'COMPLETED' || $state === 'SUCCESS' || $state === 'PAYMENT_SUCCESS') {
                            $this->capture->testCapture($payment->id, '');
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
                $phonePeBase = ($creds['mode'] ?? 'test') === 'live'
                    ? 'https://api.phonepe.com/apis/hermes'
                    : 'https://api-preprod.phonepe.com/apis/pg-sandbox';

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
        } elseif ($payment->provider === 'razorpay') {
            $creds = $this->resolveCredentials($payment->store_id, 'razorpay');
            if ($creds) {
                try {
                    $orderReceipt = 'ORD_' . $order->number;
                    $rzpRes = Http::withBasicAuth($creds['key_id'], $creds['key_secret'])->timeout(8)->get("https://api.razorpay.com/v1/orders/{$payment->id}/payments");
                    if ($rzpRes->successful()) {
                        $items = $rzpRes->json()['items'] ?? [];
                        foreach ($items as $item) {
                            if (($item['status'] ?? '') === 'captured') {
                                $this->capture->testCapture($payment->id, $item['id'] ?? '');
                                return [
                                    'paid' => true,
                                    'status' => 'captured',
                                    'method' => 'razorpay',
                                    'sale_id' => DB::table('orders')->where('id', $orderId)->value('sale_id'),
                                ];
                            }
                        }
                    }
                } catch (\Throwable $e) {}
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
