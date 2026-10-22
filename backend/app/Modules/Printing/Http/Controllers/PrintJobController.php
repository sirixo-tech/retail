<?php

namespace App\Modules\Printing\Http\Controllers;

use App\Modules\Tenancy\Models\Store;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PrintJobController
{
    public function index(Request $request): JsonResponse
    {
        $storeId = $this->storeId($request);
        $rows = DB::table('print_jobs')
            ->where('store_id', $storeId)
            ->where('status', 'pending')
            ->orderBy('created_at')
            ->get(['id', 'kind', 'sale_id', 'cut', 'drawer', 'created_at'])
            ->map(fn ($row) => [
                'id' => $row->id,
                'kind' => $row->kind,
                'sale_id' => $row->sale_id,
                'cut' => $row->cut,
                'drawer' => (bool) $row->drawer,
                'created_at' => $row->created_at,
            ]);

        return ApiResponse::ok($rows);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'kind' => ['required', 'in:receipt,label'],
            'sale_id' => ['nullable', 'uuid'],
            'cut' => ['nullable', 'in:full,partial'],
            'drawer' => ['nullable', 'boolean'],
        ]);
        $storeId = $this->storeId($request);
        if (! $storeId) {
            return ApiResponse::error('resource.not_found', 'Store not found.', 404);
        }
        if (! empty($data['sale_id'])) {
            $owns = DB::table('sales')->where('id', $data['sale_id'])->where('tenant_id', $request->session()->get('tenant_id'))->exists();
            if (! $owns) {
                return ApiResponse::error('resource.not_found', 'Sale not found.', 404);
            }
        }
        $id = (string) Str::uuid7();
        DB::table('print_jobs')->insert([
            'id' => $id,
            'tenant_id' => $request->session()->get('tenant_id'),
            'store_id' => $storeId,
            'kind' => $data['kind'],
            'sale_id' => $data['sale_id'] ?? null,
            'cut' => $data['cut'] ?? 'partial',
            'drawer' => (bool) ($data['drawer'] ?? false),
            'status' => 'pending',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return ApiResponse::ok(['id' => $id, 'status' => 'pending'], 201);
    }

    public function ack(Request $request, string $job): JsonResponse
    {
        $updated = DB::table('print_jobs')
            ->where('id', $job)
            ->where('tenant_id', $request->session()->get('tenant_id'))
            ->where('status', 'pending')
            ->update(['status' => 'printed', 'updated_at' => now()]);
        if (! $updated) {
            return ApiResponse::error('resource.not_found', 'Print job not found.', 404);
        }

        return ApiResponse::ok(['id' => $job, 'status' => 'printed']);
    }

    public function preview(Request $request): JsonResponse
    {
        $data = $request->validate(['text' => ['required', 'string', 'max:2000']]);
        if (str_contains(strtolower($data['text']), '<script') || str_contains($data['text'], "\x1b")) {
            return ApiResponse::error('validation.failed', 'The preview cannot contain script or printer commands.', 422);
        }
        $before = DB::table('print_jobs')->count();
        $preview = $data['text'];
        if (DB::table('print_jobs')->count() !== $before) {
            return ApiResponse::error('validation.failed', 'Preview must not create a print job.', 500);
        }

        return ApiResponse::ok(['preview' => $preview, 'jobs' => 0]);
    }

    private function storeId(Request $request): ?string
    {
        return Store::query()
            ->where('tenant_id', $request->session()->get('tenant_id'))
            ->where('is_default', true)
            ->value('id');
    }
}
