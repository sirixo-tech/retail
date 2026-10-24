<?php

namespace App\Modules\Printing\Http\Controllers;

use App\Modules\Printing\Enums\DocumentKind;
use App\Modules\Printing\Models\PrintProfile;
use App\Modules\Printing\Services\PrintProfileService;
use App\Support\ApiResponse;
use App\Support\Tenancy\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PrintProfileController
{
    public function __construct(
        private PrintProfileService $profileService,
        private TenantContext $tenantContext,
    ) {}

    /**
     * Get print profiles for a store.
     */
    public function index(Request $request): JsonResponse
    {
        $storeId = $request->query('store_id') ?: $this->resolveStoreId($request);
        if (!$storeId) {
            return ApiResponse::error('validation.failed', 'store_id parameter is required.', 422);
        }

        $profiles = $this->profileService->getStoreProfiles($storeId);

        return ApiResponse::ok($profiles);
    }

    /**
     * Create or update a print profile routing configuration.
     */
    public function save(Request $request): JsonResponse
    {
        $data = $request->validate([
            'store_id' => ['required', 'string'],
            'document_kind' => ['required', 'string', 'in:receipt,label,pick_list,delivery_note,invoice_pdf,report_pdf'],
            'printer_id' => ['required', 'string'],
            'template_id' => ['nullable', 'string'],
            'driver_name' => ['nullable', 'string', 'in:escpos,system,epson_epos,star_webprnt,sdk'],
            'cut_mode' => ['nullable', 'string', 'in:none,partial,full'],
            'open_drawer_on' => ['nullable', 'string', 'in:never,cash,all_payments'],
            'orientation' => ['nullable', 'string', 'in:portrait,landscape'],
        ]);

        $kind = DocumentKind::from($data['document_kind']);

        $profile = $this->profileService->saveProfile(
            $data['store_id'],
            $kind,
            $data
        );

        return ApiResponse::ok($profile);
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
