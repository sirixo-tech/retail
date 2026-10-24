<?php

namespace App\Modules\Printing\Http\Controllers;

use App\Modules\Printing\Actions\PrintJobCreator;
use App\Modules\Printing\Enums\DriverType;
use App\Modules\Printing\Enums\PrinterType;
use App\Modules\Printing\Enums\TransportType;
use App\Modules\Printing\Models\Printer;
use App\Modules\Printing\Services\PairingService;
use App\Modules\Printing\Services\PrinterRegistry;
use App\Support\ApiResponse;
use App\Support\Tenancy\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class PrinterController
{
    public function __construct(
        private PrinterRegistry $printerRegistry,
        private PairingService $pairingService,
        private PrintJobCreator $jobCreator,
        private TenantContext $tenantContext,
    ) {}

    /**
     * List all printers for a store (stale offline printers marked automatically).
     */
    public function index(Request $request): JsonResponse
    {
        $storeId = $request->query('store_id') ?: $this->resolveStoreId($request);
        if (!$storeId) {
            return ApiResponse::error('validation.failed', 'store_id parameter is required.', 422);
        }

        $printers = $this->printerRegistry->listPrinters($storeId);

        return ApiResponse::ok($printers);
    }

    /**
     * Register a new printer.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'store_id' => ['required', 'string'],
            'name' => ['required', 'string', 'max:100'],
            'transport' => ['required', 'string', 'in:agent,browser_raw,browser_dialog'],
            'driver' => ['required', 'string', 'in:escpos,system,epson_epos,star_webprnt,sdk'],
            'connection_params' => ['nullable', 'array'],
        ]);

        $tenantId = $this->tenantContext->id() ?: $request->session()->get('tenant_id');
        if (!$tenantId) {
            $tenantId = DB::table('stores')->where('id', $data['store_id'])->value('tenant_id');
        }

        $printer = $this->printerRegistry->registerPrinter([
            'tenant_id' => $tenantId,
            'store_id' => $data['store_id'],
            'name' => $data['name'],
            'transport' => $data['transport'],
            'driver' => $data['driver'],
            'connection_params' => $data['connection_params'] ?? [],
        ]);

        return ApiResponse::ok($printer, 201);
    }

    /**
     * Update printer details.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:100'],
            'transport' => ['sometimes', 'string', 'in:agent,browser_raw,browser_dialog'],
            'driver' => ['sometimes', 'string', 'in:escpos,system,epson_epos,star_webprnt,sdk'],
            'connection_params' => ['nullable', 'array'],
            'status' => ['sometimes', 'string', 'in:online,offline,paper_out'],
        ]);

        $printer = Printer::query()->find($id);
        if (!$printer) {
            return ApiResponse::error('resource.not_found', 'Printer not found.', 404);
        }

        $printer->fill($data);
        $printer->save();

        return ApiResponse::ok($printer);
    }

    /**
     * Soft delete printer.
     */
    public function destroy(string $id): JsonResponse
    {
        $printer = Printer::query()->find($id);
        if (!$printer) {
            return ApiResponse::error('resource.not_found', 'Printer not found.', 404);
        }

        $this->printerRegistry->deletePrinter($id);

        return ApiResponse::ok(['message' => 'Printer deleted successfully.']);
    }

    /**
     * Generate test print job for a printer.
     */
    public function testPrint(Request $request, string $id): JsonResponse
    {
        $printer = Printer::query()->find($id);
        if (!$printer) {
            return ApiResponse::error('resource.not_found', 'Printer not found.', 404);
        }

        $job = $this->jobCreator->createTestJob($printer->store_id, $printer->id);

        return ApiResponse::ok([
            'job_id' => $job->id,
            'status' => $job->status,
        ], 201);
    }

    /**
     * Agent starts pairing session: returns 4-digit code.
     */
    public function pairInitiate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'store_id' => ['required', 'string'],
            'agent_fingerprint' => ['required', 'string'],
        ]);

        $session = $this->pairingService->initiatePairing($data['store_id'], $data['agent_fingerprint']);

        return ApiResponse::ok([
            'session_id' => $session->id,
            'code' => $session->code,
            'expires_at' => $session->expires_at->toIso8601String(),
        ], 201);
    }

    /**
     * POS submits 4-digit pairing code to authorize agent and receive device_token.
     */
    public function pairSubmit(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'regex:/^[0-9]{4}$/'],
            'store_id' => ['required', 'string'],
            'agent_fingerprint' => ['nullable', 'string'],
            'printer_id' => ['nullable', 'string'],
        ]);

        try {
            $result = $this->pairingService->submitPairingCode(
                $data['code'],
                $data['store_id'],
                $request->ip(),
                $data['printer_id'] ?? null
            );

            return ApiResponse::ok($result);
        } catch (RuntimeException $e) {
            $message = $e->getMessage();
            $status = str_contains(strtolower($message), 'too many') ? 429 : 404;
            return ApiResponse::error('pairing.failed', $message, $status);
        }
    }

    /**
     * Record printer heartbeat from Print Agent.
     */
    public function heartbeat(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'string', 'in:online,offline,paper_out'],
        ]);

        $printer = $this->printerRegistry->recordHeartbeat($id, $data['status']);
        if (!$printer) {
            return ApiResponse::error('resource.not_found', 'Printer not found.', 404);
        }

        return ApiResponse::ok([
            'id' => $printer->id,
            'status' => $printer->status,
            'last_heartbeat_at' => $printer->last_heartbeat_at,
        ]);
    }

    /**
     * Discover printers query/initiate endpoint.
     */
    public function discover(Request $request): JsonResponse
    {
        $storeId = $request->query('store_id') ?: $this->resolveStoreId($request);
        if (!$storeId) {
            return ApiResponse::error('validation.failed', 'store_id parameter is required.', 422);
        }

        $taskId = (string) Str::uuid();

        return ApiResponse::ok([
            'task_id' => $taskId,
            'store_id' => $storeId,
            'status' => 'completed',
            'discovered' => [],
        ], 202);
    }

    private function resolveStoreId(Request $request): ?string
    {
        $tenantId = $this->tenantContext->id() ?: $request->session()->get('tenant_id');
        if (!$tenantId) {
            return null;
        }

        return DB::table('stores')
            ->where('tenant_id', $tenantId)
            ->where('is_default', true)
            ->value('id') ?: DB::table('stores')->where('tenant_id', $tenantId)->value('id');
    }
}
