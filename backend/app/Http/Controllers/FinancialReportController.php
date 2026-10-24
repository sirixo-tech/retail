<?php

namespace App\Http\Controllers;

use App\Services\FinancialReportService;
use App\Support\ApiResponse;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FinancialReportController
{
    public function __construct(private FinancialReportService $service)
    {
    }

    public function profitAndLoss(Request $request): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');

        $start = $request->query('start')
            ? Carbon::parse($request->query('start'))->startOfDay()
            : now()->startOfMonth();

        $end = $request->query('end')
            ? Carbon::parse($request->query('end'))->endOfDay()
            : now()->endOfMonth();

        $report = $this->service->profitAndLoss($tenantId, $start, $end);

        return ApiResponse::ok($report);
    }

    public function cashFlow(Request $request): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');

        $start = $request->query('start')
            ? Carbon::parse($request->query('start'))->startOfDay()
            : now()->startOfMonth();

        $end = $request->query('end')
            ? Carbon::parse($request->query('end'))->endOfDay()
            : now()->endOfMonth();

        $report = $this->service->cashFlow($tenantId, $start, $end);

        return ApiResponse::ok($report);
    }

    public function balanceSheet(Request $request): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');

        $asOfDate = $request->query('date')
            ? Carbon::parse($request->query('date'))->endOfDay()
            : now()->endOfDay();

        $report = $this->service->balanceSheet($tenantId, $asOfDate);

        return ApiResponse::ok($report);
    }
}
