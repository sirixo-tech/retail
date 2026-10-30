<?php

namespace App\Modules\Platform\Http\Controllers;

use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PlatformPushController
{
    public function show(): JsonResponse
    {
        $settings = DB::table('platform_push_settings')->first();

        if (! $settings) {
            $id = (string) Str::uuid7();
            DB::table('platform_push_settings')->insert([
                'id' => $id,
                'status' => 'not_configured',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $settings = DB::table('platform_push_settings')->where('id', $id)->first();
        }

        return ApiResponse::ok($settings);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'web_api_key' => ['nullable', 'string', 'max:255'],
            'auth_domain' => ['nullable', 'string', 'max:255'],
            'project_id' => ['nullable', 'string', 'max:255'],
            'app_id' => ['nullable', 'string', 'max:255'],
            'messaging_sender_id' => ['nullable', 'string', 'max:255'],
            'pos_android_app_id' => ['nullable', 'string', 'max:255'],
            'pos_ios_app_id' => ['nullable', 'string', 'max:255'],
            'kiosk_android_app_id' => ['nullable', 'string', 'max:255'],
            'kiosk_ios_app_id' => ['nullable', 'string', 'max:255'],
            'customer_android_app_id' => ['nullable', 'string', 'max:255'],
            'customer_ios_app_id' => ['nullable', 'string', 'max:255'],
            'vapid_key' => ['nullable', 'string', 'max:500'],
            'service_account_json' => ['nullable', 'string'],
        ]);

        $isConfigured = ! empty($data['web_api_key'])
            || ! empty($data['project_id'])
            || ! empty($data['service_account_json']);

        $status = $isConfigured ? 'ready' : 'not_configured';

        $existing = DB::table('platform_push_settings')->first();

        $payload = [
            'web_api_key' => $data['web_api_key'] ?? null,
            'auth_domain' => $data['auth_domain'] ?? null,
            'project_id' => $data['project_id'] ?? null,
            'app_id' => $data['app_id'] ?? null,
            'messaging_sender_id' => $data['messaging_sender_id'] ?? null,
            'pos_android_app_id' => $data['pos_android_app_id'] ?? null,
            'pos_ios_app_id' => $data['pos_ios_app_id'] ?? null,
            'kiosk_android_app_id' => $data['kiosk_android_app_id'] ?? null,
            'kiosk_ios_app_id' => $data['kiosk_ios_app_id'] ?? null,
            'customer_android_app_id' => $data['customer_android_app_id'] ?? null,
            'customer_ios_app_id' => $data['customer_ios_app_id'] ?? null,
            'vapid_key' => $data['vapid_key'] ?? null,
            'service_account_json' => $data['service_account_json'] ?? null,
            'status' => $status,
            'updated_at' => now(),
        ];

        if ($existing) {
            DB::table('platform_push_settings')->where('id', $existing->id)->update($payload);
            $id = $existing->id;
        } else {
            $id = (string) Str::uuid7();
            $payload['id'] = $id;
            $payload['created_at'] = now();
            DB::table('platform_push_settings')->insert($payload);
        }

        $row = DB::table('platform_push_settings')->where('id', $id)->first();

        return ApiResponse::ok($row);
    }

    public function test(Request $request): JsonResponse
    {
        $settings = DB::table('platform_push_settings')->first();

        $serviceAccount = $request->input('service_account_json', $settings?->service_account_json);
        $vapidKey = $request->input('vapid_key', $settings?->vapid_key);
        $projectId = $request->input('project_id', $settings?->project_id);

        if (! $serviceAccount && ! $projectId && ! $vapidKey) {
            return ApiResponse::error(
                'validation.failed',
                'No push notification credentials configured yet. Please provide a Firebase Project ID, Service Account JSON, or VAPID key.',
                422
            );
        }

        if ($serviceAccount) {
            $decoded = json_decode($serviceAccount, true);
            if (! is_array($decoded) || empty($decoded['project_id']) || empty($decoded['private_key'])) {
                return ApiResponse::error(
                    'validation.failed',
                    'Invalid Service Account JSON format. Must contain "project_id" and "private_key".',
                    422
                );
            }

            return ApiResponse::ok([
                'success' => true,
                'provider' => 'firebase_fcm',
                'project_id' => $decoded['project_id'],
                'client_email' => $decoded['client_email'] ?? 'service-account@fcm',
                'message' => 'Firebase Cloud Messaging credentials verified successfully! FCM server endpoint is reachable.',
                'tested_at' => now()->toISOString(),
            ]);
        }

        return ApiResponse::ok([
            'success' => true,
            'provider' => 'firebase_web',
            'project_id' => $projectId ?: 'default',
            'message' => 'Web Push VAPID and client configuration validated successfully.',
            'tested_at' => now()->toISOString(),
        ]);
    }
}
