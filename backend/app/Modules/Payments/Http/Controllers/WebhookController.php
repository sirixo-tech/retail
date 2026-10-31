<?php

namespace App\Modules\Payments\Http\Controllers;

use App\Modules\Payments\Actions\CapturePrepaidPayment;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class WebhookController
{
    public function __construct(private CapturePrepaidPayment $capture)
    {
    }

    public function store(Request $request, string $provider): JsonResponse|\Illuminate\Http\RedirectResponse
    {
        $native = app(\App\Modules\Payments\Services\PaymentGatewayService::class)->handleNativeWebhook(
            $provider,
            $request->getContent(),
            $request->header('X-Razorpay-Signature')
                ?? $request->header('Stripe-Signature')
                ?? $request->header('X-VERIFY'),
            $request->post()
        );
        if ($native !== null) {
            if ($provider === 'paytm' && is_string($native['redirect'] ?? null)) {
                return redirect()->away($native['redirect']);
            }
            $status = (int) ($native['status'] ?? 400);
            if ($status !== 200) {
                return ApiResponse::error('validation.failed', 'The payment notice was rejected.', 400);
            }

            return ApiResponse::ok(['received' => true]);
        }

        $status = $this->capture->fromWebhook($provider, $request->getContent(), $request->header('X-Gateway-Signature'));
        if ($status === 404) {
            return ApiResponse::error('resource.not_found', 'Unknown gateway.', 404);
        }
        if ($status !== 200) {
            return ApiResponse::error('validation.failed', 'The payment notice was rejected.', 400);
        }

        return ApiResponse::ok(['received' => true]);
    }

    public function testCapture(Request $request, string $payment): JsonResponse
    {
        if (! app()->environment('local', 'testing') && ! $request->user()) {
            return ApiResponse::error('permission.denied', 'Test capture endpoint is disabled in production.', 403);
        }

        $data = $request->validate([
            'token' => ['required', 'string'],
        ]);
        try {
            $order = $this->capture->testCapture($payment, $data['token']);
        } catch (RuntimeException $e) {
            $status = $e->getMessage() === 'auth.invalid_code' ? 401 : 404;

            return ApiResponse::error($e->getMessage(), $status === 401 ? 'That payment token is not valid.' : 'Payment not found.', $status);
        }

        return ApiResponse::ok($order);
    }
}
