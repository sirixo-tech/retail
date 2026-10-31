<?php

namespace App\Modules\Payments\Actions;

use App\Modules\Orders\Actions\InvoiceOrder;
use App\Modules\Payments\Http\Controllers\GatewayController;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class CapturePrepaidPayment
{
    /** @var list<string> */
    private const INVOICE_STATUSES = [
        'accepted',
        'packing',
        'ready',
        'out_for_delivery',
        'ready_for_pickup',
        'delivered',
        'picked_up',
    ];

    public function __construct(private InvoiceOrder $invoices)
    {
    }

    public function fromWebhook(string $provider, string $raw, ?string $signature): int
    {
        if (! in_array($provider, GatewayController::PREPAID, true)) {
            return 404;
        }
        $payload = json_decode($raw, true);
        if (! is_array($payload)) {
            return 400;
        }
        $eventId = $payload['event_id'] ?? null;
        $orderId = $payload['order_id'] ?? null;
        $type = $payload['type'] ?? null;
        if (! is_string($eventId) || $eventId === '' || ! is_string($orderId) || $orderId === '') {
            return 400;
        }

        $order = DB::table('orders')->where('id', $orderId)->first();
        if (! $order || (string) $order->payment_method !== $provider) {
            return 400;
        }
        $secret = $this->secret($order->store_id, $provider);
        if ($secret === null) {
            return 400;
        }
        $expected = hash_hmac('sha256', $raw, $secret);
        if (! is_string($signature) || ! hash_equals($expected, $signature)) {
            return 400;
        }

        try {
            return DB::transaction(function () use ($provider, $eventId, $payload, $type, $order) {
                $existing = DB::table('webhook_receipts')
                    ->where('provider', $provider)
                    ->where('provider_event_id', $eventId)
                    ->lockForUpdate()
                    ->first();
                if ($existing) {
                    return 200;
                }
                DB::table('webhook_receipts')->insert([
                    'id' => (string) Str::uuid7(),
                    'provider' => $provider,
                    'provider_event_id' => $eventId,
                    'signature_ok' => true,
                    'payload' => json_encode($payload),
                    'processed_at' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                if ($type === 'payment.captured') {
                    $amount = $payload['amount_paise'] ?? null;
                    if (! is_numeric($amount) || (int) $amount !== (int) $order->total_paise) {
                        throw new RuntimeException('amount');
                    }
                    $this->markCaptured($order->id, $provider);
                }
                DB::table('webhook_receipts')
                    ->where('provider', $provider)
                    ->where('provider_event_id', $eventId)
                    ->update(['processed_at' => now(), 'updated_at' => now()]);

                return 200;
            });
        } catch (RuntimeException $e) {
            if ($e->getMessage() === 'amount') {
                return 400;
            }
            throw $e;
        } catch (QueryException) {
            return 200;
        }
    }

    /**
     * Mark a payment captured after the provider status API confirms it.
     * Works for test and live. Does not accept a browser token.
     *
     * @return array<string, mixed>
     */
    public function captureFromProvider(string $paymentId): array
    {
        return DB::transaction(function () use ($paymentId) {
            $payment = DB::table('payments')->where('id', $paymentId)->lockForUpdate()->first();
            if (! $payment) {
                throw new RuntimeException('resource.not_found');
            }
            if ((string) $payment->status !== 'captured') {
                $this->markCaptured((string) $payment->order_id, (string) $payment->provider);
                DB::table('payments')->where('id', $payment->id)->update([
                    'status' => 'captured',
                    'capture_token_hash' => null,
                    'updated_at' => now(),
                ]);
            }
            $order = DB::table('orders')->where('id', $payment->order_id)->first();

            return [
                'id' => $order->id,
                'number' => $order->number,
                'payment_status' => $order->payment_status,
                'sale_id' => $order->sale_id,
            ];
        });
    }

    /**
     * @return array<string, mixed>
     */
    public function testCapture(string $paymentId, string $token): array
    {
        return DB::transaction(function () use ($paymentId, $token) {
            $payment = DB::table('payments')->where('id', $paymentId)->lockForUpdate()->first();
            if (! $payment || $payment->mode !== 'test') {
                throw new RuntimeException('resource.not_found');
            }
            $hash = hash_hmac('sha256', $token, (string) config('app.key'));
            if (! is_string($payment->capture_token_hash) || ! hash_equals($payment->capture_token_hash, $hash)) {
                throw new RuntimeException('auth.invalid_code');
            }
            $this->markCaptured($payment->order_id, $payment->provider);
            DB::table('payments')->where('id', $payment->id)->update([
                'status' => 'captured',
                'capture_token_hash' => null,
                'updated_at' => now(),
            ]);
            $order = DB::table('orders')->where('id', $payment->order_id)->first();

            return [
                'id' => $order->id,
                'number' => $order->number,
                'payment_status' => $order->payment_status,
                'sale_id' => $order->sale_id,
            ];
        });
    }

    private function markCaptured(string $orderId, string $provider): void
    {
        $order = DB::table('orders')->where('id', $orderId)->lockForUpdate()->first();
        if (! $order || (string) $order->payment_method !== $provider) {
            throw new RuntimeException('resource.not_found');
        }
        if ((string) $order->payment_status !== 'captured') {
            $orderUpdate = [
                'payment_status' => 'captured',
                'updated_at' => now(),
            ];
            if ((string) $order->status === 'awaiting_payment') {
                $orderUpdate['status'] = 'placed';
            }
            DB::table('orders')->where('id', $order->id)->update($orderUpdate);
            DB::table('payments')->where('order_id', $order->id)->where('status', 'created')->update([
                'status' => 'captured',
                'capture_token_hash' => null,
                'updated_at' => now(),
            ]);
            $order = DB::table('orders')->where('id', $order->id)->first();
        }
        if ($order->sale_id) {
            return;
        }
        if (! in_array((string) $order->status, self::INVOICE_STATUSES, true)) {
            return;
        }
        $this->invoices->create($order);
    }

    private function secret(string $storeId, string $provider): ?string
    {
        $gateway = DB::table('payment_gateways')
            ->where('store_id', $storeId)
            ->where('provider', $provider)
            ->where('status', 'active')
            ->whereNotNull('credentials_ciphertext')
            ->orderByDesc('updated_at')
            ->first();
        if (! $gateway || ! $gateway->credentials_ciphertext) {
            return null;
        }
        try {
            $decoded = json_decode(Crypt::decryptString($gateway->credentials_ciphertext), true);
        } catch (\Throwable) {
            return null;
        }
        $secret = is_array($decoded) ? ($decoded['key_secret'] ?? null) : null;

        return is_string($secret) && $secret !== '' ? $secret : null;
    }
}
