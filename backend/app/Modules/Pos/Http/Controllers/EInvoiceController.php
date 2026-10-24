<?php

namespace App\Modules\Pos\Http\Controllers;

use App\Modules\Pos\Models\Sale;
use App\Services\EInvoiceService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class EInvoiceController
{
    public function __construct(private EInvoiceService $service)
    {
    }

    public function show(Request $request, string $store, string $sale): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');

        $record = DB::table('e_invoices')
            ->where('tenant_id', $tenantId)
            ->where('sale_id', $sale)
            ->first();

        if (! $record) {
            return ApiResponse::error('einvoice.not_found', 'No E-Invoice record found for this sale.', 404);
        }

        return ApiResponse::ok($record);
    }

    public function regenerate(Request $request, string $store, string $sale): JsonResponse
    {
        $saleModel = Sale::query()->findOrFail($sale);

        try {
            $result = $this->service->generateEInvoice($saleModel);
            return ApiResponse::ok($result);
        } catch (\Throwable $e) {
            return ApiResponse::error('einvoice.generation_failed', $e->getMessage(), 422);
        }
    }

    public function cancel(Request $request, string $store, string $sale): JsonResponse
    {
        $data = $request->validate([
            'reason' => ['required', 'string', 'max:255'],
        ]);

        $tenantId = (string) $request->session()->get('tenant_id');
        $record = DB::table('e_invoices')
            ->where('tenant_id', $tenantId)
            ->where('sale_id', $sale)
            ->first();

        if (! $record) {
            return ApiResponse::error('einvoice.not_found', 'No E-Invoice record found for this sale.', 404);
        }

        try {
            $result = $this->service->cancelEInvoice($record->irn, $data['reason']);
            return ApiResponse::ok($result);
        } catch (RuntimeException $e) {
            return ApiResponse::error('einvoice.cancellation_failed', $e->getMessage(), 422);
        }
    }
}
