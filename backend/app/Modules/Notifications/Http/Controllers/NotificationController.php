<?php

namespace App\Modules\Notifications\Http\Controllers;

use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NotificationController
{
    public function index(Request $request): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');

        $channel = $request->query('channel');
        $status = $request->query('status');
        $search = $request->query('search');
        $limit = min(200, max(10, (int) $request->query('limit', 100)));

        $query = DB::table('notification_logs')
            ->where('tenant_id', $tenantId);

        if ($channel && $channel !== 'all') {
            $query->where('channel', $channel);
        }

        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        if ($search) {
            $searchTerm = '%'.trim($search).'%';
            $query->where(function ($q) use ($searchTerm) {
                $q->where('detail', 'like', $searchTerm)
                    ->orWhere('template', 'like', $searchTerm)
                    ->orWhere('channel', 'like', $searchTerm);
            });
        }

        $rows = $query->orderByDesc('created_at')
            ->limit($limit)
            ->get(['id', 'channel', 'template', 'status', 'reference_id', 'detail', 'created_at']);

        if ($request->query('with_summary') || $request->query('summary')) {
            // Summary counts (derived directly from real database records)
            $allBase = DB::table('notification_logs')->where('tenant_id', $tenantId);
            $totalCount = (clone $allBase)->count();
            $sentCount = (clone $allBase)->where('status', 'sent')->count();
            $unconfiguredCount = (clone $allBase)->where('status', 'not_configured')->count();
            $failedCount = (clone $allBase)->where('status', 'failed')->count();

            $smsCount = (clone $allBase)->where('channel', 'sms')->count();
            $whatsappCount = (clone $allBase)->where('channel', 'whatsapp')->count();
            $emailCount = (clone $allBase)->where('channel', 'email')->count();
            $systemCount = (clone $allBase)->where('channel', 'system')->count();

            return ApiResponse::ok([
                'items' => $rows,
                'summary' => [
                    'total' => $totalCount,
                    'sent' => $sentCount,
                    'not_configured' => $unconfiguredCount,
                    'failed' => $failedCount,
                    'channels' => [
                        'sms' => $smsCount,
                        'whatsapp' => $whatsappCount,
                        'email' => $emailCount,
                        'system' => $systemCount,
                    ],
                ],
            ]);
        }

        return ApiResponse::ok($rows);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $deleted = DB::table('notification_logs')
            ->where('tenant_id', $tenantId)
            ->where('id', $id)
            ->delete();

        if (! $deleted) {
            return ApiResponse::error('not_found', 'Notification not found.', 404);
        }

        return ApiResponse::ok(['deleted' => true]);
    }

    public function clearAll(Request $request): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $deleted = DB::table('notification_logs')
            ->where('tenant_id', $tenantId)
            ->delete();

        return ApiResponse::ok(['cleared' => true, 'count' => $deleted]);
    }
}
