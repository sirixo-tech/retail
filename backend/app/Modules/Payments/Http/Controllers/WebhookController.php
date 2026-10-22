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

    public function store(Request $request, string $provider): JsonResponse
    {
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
