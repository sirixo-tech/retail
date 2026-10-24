<?php

namespace App\Http\Controllers;

use App\Services\InventoryReportService;
use App\Support\ApiResponse;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InventoryReportController
{
    public function __construct(private InventoryReportService $service)
    {
    }

    public function deadStock(Request $request): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $days = (int) $request->query('days', 90);

        $report = $this->service->deadStockAnalysis($tenantId, $days);

        return ApiResponse::ok($report);
    }

    public function aging(Request $request): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');

        $report = $this->service->stockAgingReport($tenantId);

        return ApiResponse::ok($report);
    }

    public function shrinkage(Request $request): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');

        $start = $request->query('start')
            ? Carbon::parse($request->query('start'))->startOfDay()
            : now()->startOfMonth();

        $end = $request->query('end')
            ? Carbon::parse($request->query('end'))->endOfDay()
            : now()->endOfMonth();

        $report = $this->service->shrinkageReport($tenantId, $start, $end);

        return ApiResponse::ok($report);
    }

    public function fastMoving(Request $request): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $limit = min((int) $request->query('limit', 50), 100);

        $report = $this->service->fastMovingItems($tenantId, $limit);

        return ApiResponse::ok($report);
    }

    public function slowMoving(Request $request): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $limit = min((int) $request->query('limit', 50), 100);

        $report = $this->service->slowMovingItems($tenantId, $limit);

        return ApiResponse::ok($report);
    }
}
