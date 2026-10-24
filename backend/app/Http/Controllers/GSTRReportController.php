<?php

namespace App\Http\Controllers;

use App\Services\GSTRReportService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GSTRReportController
{
    public function __construct(private GSTRReportService $service)
    {
    }

    public function download(Request $request, string $month): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $report = $this->service->generateGSTR1($tenantId, $month);

        return response()->json($report, 200, [
            'Content-Disposition' => "attachment; filename=\"gstr1_{$month}.json\"",
        ]);
    }

    public function preview(Request $request, string $month): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $summary = $this->service->getSummaryMetrics($tenantId, $month);

        return ApiResponse::ok($summary);
    }
}
