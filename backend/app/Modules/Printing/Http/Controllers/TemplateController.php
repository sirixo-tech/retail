<?php

namespace App\Modules\Printing\Http\Controllers;

use App\Modules\Printing\Data\BlockTemplate;
use App\Modules\Printing\Enums\DocumentKind;
use App\Modules\Printing\Exceptions\TemplateCompilationException;
use App\Modules\Printing\Services\TemplateCompiler;
use App\Modules\Printing\Services\TemplateRepository;
use App\Support\ApiResponse;
use App\Support\Tenancy\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class TemplateController
{
    public function __construct(
        private TemplateRepository $repository,
        private TemplateCompiler $compiler,
        private TenantContext $tenantContext,
    ) {}

    /**
     * Get the active template for a document kind and locale.
     */
    public function show(Request $request, string $kind): JsonResponse
    {
        $kindEnum = DocumentKind::tryFrom($kind);
        if (!$kindEnum) {
            return ApiResponse::error('validation.failed', "Invalid document kind: {$kind}", 422);
        }

        $locale = $request->query('locale', 'en');
        $tenantId = $this->tenantContext->id() ?: $request->session()->get('tenant_id');

        $template = $this->repository->getActiveTemplate($tenantId, $kindEnum, $locale);
        if (!$template) {
            return ApiResponse::error('resource.not_found', "Template not found for {$kind} ({$locale})", 404);
        }

        return ApiResponse::ok($template);
    }

    /**
     * Save tenant override template version with locked blocks enforcement.
     */
    public function update(Request $request, string $kind): JsonResponse
    {
        $kindEnum = DocumentKind::tryFrom($kind);
        if (!$kindEnum) {
            return ApiResponse::error('validation.failed', "Invalid document kind: {$kind}", 422);
        }

        $data = $request->validate([
            'content' => ['required', 'array'],
            'locale' => ['nullable', 'string', 'in:en,te,hi'],
        ]);

        $tenantId = $this->tenantContext->id() ?: $request->session()->get('tenant_id');
        if (!$tenantId) {
            return ApiResponse::error('auth.unauthorized', 'Active tenant required to modify templates.', 401);
        }

        $locale = $data['locale'] ?? 'en';

        try {
            $blockTemplate = BlockTemplate::fromArray($data['content']);
            // Validate locked blocks on tax documents
            $this->compiler->validateLockedBlocks($blockTemplate, $kindEnum);

            $userId = $request->user()?->id;
            $saved = $this->repository->saveTenantVersion($tenantId, $kindEnum, $locale, $blockTemplate, $userId);

            return ApiResponse::ok($saved);
        } catch (TemplateCompilationException $e) {
            return ApiResponse::error('validation.locked_blocks', $e->getMessage(), 422);
        } catch (Throwable $e) {
            return ApiResponse::error('validation.failed', $e->getMessage(), 422);
        }
    }

    /**
     * Preview template compilation (strictly side-effect free, 0 database writes).
     */
    public function preview(Request $request): JsonResponse
    {
        $data = $request->validate([
            'kind' => ['required', 'string', 'in:receipt,label,pick_list,delivery_note,invoice_pdf,report_pdf'],
            'locale' => ['nullable', 'string', 'in:en,te,hi'],
            'content' => ['nullable', 'array'],
            'driver' => ['nullable', 'string', 'in:escpos,system,epson_epos,star_webprnt,sdk'],
        ]);

        $kindEnum = DocumentKind::from($data['kind']);
        $locale = $data['locale'] ?? 'en';
        $driver = $data['driver'] ?? 'system';
        $tenantId = $this->tenantContext->id() ?: $request->session()->get('tenant_id');

        try {
            $template = !empty($data['content']) ? BlockTemplate::fromArray($data['content']) : null;
            $preview = $this->compiler->preview($tenantId, $kindEnum, $locale, $template, $driver);

            return ApiResponse::ok($preview);
        } catch (Throwable $e) {
            return ApiResponse::error('preview.failed', $e->getMessage(), 422);
        }
    }
}
