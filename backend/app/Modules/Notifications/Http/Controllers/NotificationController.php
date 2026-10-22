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
        $rows = DB::table('notification_logs')
            ->where('tenant_id', $request->session()->get('tenant_id'))
            ->orderByDesc('created_at')
            ->limit(30)
            ->get(['id', 'channel', 'template', 'status', 'detail', 'created_at']);

        return ApiResponse::ok($rows);
    }
}
