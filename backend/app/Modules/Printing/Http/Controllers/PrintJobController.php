<?php

namespace App\Modules\Printing\Http\Controllers;

use App\Modules\Printing\Actions\PrintJobCreator;
use App\Modules\Printing\Enums\DocumentKind;
use App\Modules\Printing\Enums\PrintJobStatus;
use App\Modules\Printing\Models\PrintJob;
use App\Modules\Printing\Services\PrintJobFailureHandler;
use App\Modules\Printing\Services\TemplateCompiler;
use App\Modules\Tenancy\Models\Store;
use App\Support\ApiResponse;
use App\Support\Tenancy\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Throwable;

class PrintJobController
{
    public function __construct(
        private PrintJobCreator $jobCreator,
        private PrintJobFailureHandler $failureHandler,
        private TemplateCompiler $compiler,
        private TenantContext $tenantContext,
    ) {}

    /**
     * Poll print jobs for a store (status: queued/pending by default).
     */
    public function index(Request $request): JsonResponse
    {
        $storeId = $request->query('store_id') ?: $this->storeId($request);
        if (!$storeId) {
            return ApiResponse::error('validation.failed', 'store_id parameter is required.', 422);
        }

        $status = $request->query('status');
        $kind = $request->query('kind');
        $limit = min((int) ($request->query('limit', 50)), 100);

        $query = DB::table('print_jobs')
            ->where('store_id', $storeId);

        $tenantId = $this->tenantContext->id() ?: $request->session()->get('tenant_id');
        if ($tenantId) {
            $query->where('tenant_id', $tenantId);
        }

        if ($status) {
            $query->where('status', $status);
        } else {
            // Default: include queued or legacy pending
            $query->whereIn('status', ['queued', 'pending']);
        }

        if ($kind) {
            $query->where('kind', $kind);
        }

        $rows = $query->orderBy('created_at', 'asc')
            ->limit($limit)
            ->get(['id', 'kind', 'sale_id', 'command_plan', 'cut', 'drawer', 'status', 'purpose', 'failure_reason', 'created_at'])
            ->map(function ($row) {
                $commandPlan = null;
                if (!empty($row->command_plan)) {
                    $commandPlan = is_string($row->command_plan) ? json_decode($row->command_plan, true) : (array) $row->command_plan;
                }

                return [
                    'id' => $row->id,
                    'kind' => $row->kind,
                    'sale_id' => $row->sale_id,
                    'command_plan' => $commandPlan,
                    'cut' => $row->cut,
                    'drawer' => (bool) $row->drawer,
                    'status' => $row->status,
                    'purpose' => $row->purpose ?? 'sale',
                    'failure_reason' => $row->failure_reason,
                    'created_at' => $row->created_at,
                ];
            });

        return ApiResponse::ok($rows);
    }

    /**
     * Enqueue a new print job.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'kind' => ['required', 'string', 'in:receipt,label,pick_list,delivery_note,invoice_pdf,report_pdf'],
            'sale_id' => ['nullable', 'uuid'],
            'store_id' => ['nullable', 'string'],
            'cut' => ['nullable', 'in:none,full,partial'],
            'drawer' => ['nullable', 'boolean'],
            'purpose' => ['nullable', 'string', 'in:sale,reprint,test'],
        ]);

        $storeId = $data['store_id'] ?? $this->storeId($request);
        if (!$storeId) {
            return ApiResponse::error('resource.not_found', 'Store not found.', 404);
        }

        $tenantId = $this->tenantContext->id() ?: $request->session()->get('tenant_id');

        if (!empty($data['sale_id'])) {
            $saleQuery = DB::table('sales')->where('id', $data['sale_id']);
            if ($tenantId) {
                $saleQuery->where('tenant_id', $tenantId);
            }
            if (!$saleQuery->exists()) {
                return ApiResponse::error('resource.not_found', 'Sale not found.', 404);
            }

            // Generate compiled print job from sale
            $job = $this->jobCreator->createFromSale(
                $data['sale_id'],
                $storeId,
                $data['purpose'] ?? 'sale',
                $data['cut'] ?? null,
                isset($data['drawer']) ? (bool) $data['drawer'] : null
            );

            return ApiResponse::ok([
                'id' => $job->id,
                'status' => $job->status,
            ], 201);
        }

        // Generic job without sale
        $id = (string) Str::uuid7();
        DB::table('print_jobs')->insert([
            'id' => $id,
            'tenant_id' => $tenantId,
            'store_id' => $storeId,
            'kind' => $data['kind'],
            'sale_id' => null,
            'cut' => $data['cut'] ?? 'partial',
            'drawer' => (bool) ($data['drawer'] ?? false),
            'status' => PrintJobStatus::QUEUED->value,
            'purpose' => $data['purpose'] ?? 'sale',
            'retry_count' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return ApiResponse::ok(['id' => $id, 'status' => PrintJobStatus::QUEUED->value], 201);
    }

    /**
     * Acknowledge print job completion (idempotent, supports printed and failed).
     */
    public function ack(Request $request, string $job): JsonResponse
    {
        $data = $request->validate([
            'status' => ['nullable', 'string', 'in:printed,failed'],
            'failure_reason' => ['nullable', 'string', 'max:255'],
        ]);

        $status = $data['status'] ?? 'printed';
        $failureReason = $data['failure_reason'] ?? 'unknown';

        $tenantId = $this->tenantContext->id() ?: $request->session()->get('tenant_id');

        $jobModelQuery = PrintJob::query()->where('id', $job);
        if ($tenantId) {
            $jobModelQuery->where('tenant_id', $tenantId);
        }
        $jobModel = $jobModelQuery->first();

        if (!$jobModel) {
            return ApiResponse::error('resource.not_found', 'Print job not found.', 404);
        }

        // Idempotency: if already printed, return ok
        if ($jobModel->status === 'printed' && $status === 'printed') {
            return ApiResponse::ok(['id' => $job, 'status' => 'printed']);
        }

        if ($status === 'failed') {
            $this->failureHandler->handleFailure($jobModel, $failureReason);
            return ApiResponse::ok(['id' => $job, 'status' => 'failed', 'failure_reason' => $failureReason]);
        }

        // Mark as printed
        $jobModel->status = PrintJobStatus::PRINTED->value;
        $jobModel->acknowledged_at = now();
        $jobModel->save();

        return ApiResponse::ok(['id' => $job, 'status' => PrintJobStatus::PRINTED->value]);
    }

    /**
     * Preview template compilation (strictly side-effect free, 0 jobs created).
     */
    public function preview(Request $request): JsonResponse
    {
        $beforeCount = DB::table('print_jobs')->count();

        // 1. If structured block preview requested
        if ($request->has('kind')) {
            $data = $request->validate([
                'kind' => ['required', 'string', 'in:receipt,label,pick_list,delivery_note,invoice_pdf,report_pdf'],
                'locale' => ['nullable', 'string', 'in:en,te,hi'],
                'content' => ['nullable', 'array'],
                'driver' => ['nullable', 'string'],
            ]);

            $kindEnum = DocumentKind::from($data['kind']);
            $locale = $data['locale'] ?? 'en';
            $driver = $data['driver'] ?? 'system';
            $tenantId = $this->tenantContext->id() ?: $request->session()->get('tenant_id');

            try {
                $html = $this->compiler->preview($tenantId, $kindEnum, $locale, null, $driver);

                if (DB::table('print_jobs')->count() !== $beforeCount) {
                    return ApiResponse::error('validation.failed', 'Preview must not create a print job.', 500);
                }

                return ApiResponse::ok(['html' => $html, 'warnings' => [], 'jobs' => 0]);
            } catch (Throwable $e) {
                return ApiResponse::error('preview.failed', $e->getMessage(), 422);
            }
        }

        // 2. Legacy text preview validation
        $data = $request->validate(['text' => ['required', 'string', 'max:2000']]);
        if (str_contains(strtolower($data['text']), '<script') || str_contains($data['text'], "\x1b")) {
            return ApiResponse::error('validation.failed', 'The preview cannot contain script or printer commands.', 422);
        }

        $preview = $data['text'];

        if (DB::table('print_jobs')->count() !== $beforeCount) {
            return ApiResponse::error('validation.failed', 'Preview must not create a print job.', 500);
        }

        return ApiResponse::ok(['preview' => $preview, 'jobs' => 0]);
    }

    private function storeId(Request $request): ?string
    {
        $tenantId = $this->tenantContext->id() ?: $request->session()->get('tenant_id');
        if (!$tenantId) {
            return null;
        }

        return Store::query()
            ->where('tenant_id', $tenantId)
            ->where('is_default', true)
            ->value('id') ?: Store::query()->where('tenant_id', $tenantId)->value('id');
    }
}
