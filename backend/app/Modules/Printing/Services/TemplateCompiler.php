<?php

namespace App\Modules\Printing\Services;

use App\Modules\Printing\Data\BlockTemplate;
use App\Modules\Printing\Data\CommandPlan;
use App\Modules\Printing\Enums\DocumentKind;
use App\Modules\Printing\Exceptions\TemplateCompilationException;
use App\Modules\Printing\Models\DocumentTemplate;

class TemplateCompiler
{
    public function __construct(
        private TemplateRepository $repository,
        private PrintDriverRegistry $driverRegistry,
    ) {}

    public function compile(
        ?string $tenantId,
        DocumentKind|string $kind,
        string $locale,
        array $context,
        string $driverName = 'escpos'
    ): CommandPlan {
        $kindStr = $kind instanceof DocumentKind ? $kind->value : $kind;
        $template = $this->repository->getActiveTemplate($tenantId, $kindStr, $locale);

        if (!$template) {
            throw new TemplateCompilationException("No template found for {$kindStr} in locale {$locale}");
        }

        $blockTemplate = $this->parseTemplate($template);

        // Validate locked blocks on tax documents
        if ($tenantId && $template->tenant_id) {
            $this->validateLockedBlocks($blockTemplate, $kindStr);
        }

        $driver = $this->driverRegistry->get($driverName);
        if (!$driver) {
            throw new TemplateCompilationException("Unknown driver: {$driverName}");
        }

        $errors = $driver->validateTemplate($blockTemplate);
        if (!empty($errors)) {
            throw new TemplateCompilationException('Template validation failed: ' . implode(', ', $errors));
        }

        return $driver->compile($blockTemplate, $context);
    }

    public function compileCustom(
        array $content,
        string $locale,
        array $context,
        string $driverName = 'escpos',
        ?string $kind = null
    ): CommandPlan {
        $blockTemplate = new BlockTemplate(
            blocks: $content['blocks'] ?? [],
            paperWidth: $content['paper_width_mm'] ?? 80,
            locale: $locale,
        );

        if ($kind && in_array($kind, ['receipt', 'invoice_pdf'])) {
            $this->validateLockedBlocks($blockTemplate, $kind);
        }

        $driver = $this->driverRegistry->get($driverName);
        if (!$driver) {
            throw new TemplateCompilationException("Unknown driver: {$driverName}");
        }

        $errors = $driver->validateTemplate($blockTemplate);
        if (!empty($errors)) {
            throw new TemplateCompilationException('Template validation failed: ' . implode(', ', $errors));
        }

        return $driver->compile($blockTemplate, $context);
    }

    public function preview(
        ?string $tenantId,
        DocumentKind|string $kind,
        string $locale = 'en',
        array|BlockTemplate|null $customContent = null,
        string $driverName = 'system'
    ): array {
        $kindStr = $kind instanceof DocumentKind ? $kind->value : $kind;
        $fixtureData = $this->repository->getFixtureData($kindStr);

        try {
            if ($customContent instanceof BlockTemplate) {
                $driver = $this->driverRegistry->get($driverName);
                $plan = $driver->compile($customContent, $fixtureData);
            } elseif (is_array($customContent)) {
                $plan = $this->compileCustom($customContent, $locale, $fixtureData, $driverName, $kindStr);
            } else {
                $plan = $this->compile($tenantId, $kindStr, $locale, $fixtureData, $driverName);
            }

            return [
                'html' => base64_decode($plan->data),
                'warnings' => [],
            ];
        } catch (TemplateCompilationException $e) {
            return [
                'html' => "<div style=\"color: #ef4444; font-family: monospace; padding: 12px; border: 1px solid #fecaca; background: #fef2f2; border-radius: 8px;\"><strong>Compilation failed:</strong> " . htmlspecialchars($e->getMessage(), ENT_QUOTES, 'UTF-8') . "</div>",
                'warnings' => [$e->getMessage()],
            ];
        }
    }

    private function parseTemplate(DocumentTemplate $template): BlockTemplate
    {
        $content = is_string($template->content) ? json_decode($template->content, false) : (object) $template->content;

        return new BlockTemplate(
            blocks: (array) ($content->blocks ?? []),
            paperWidth: (int) ($content->paper_width_mm ?? 80),
            locale: $template->locale ?? 'en',
        );
    }

    public function validateLockedBlocks(BlockTemplate $template, DocumentKind|string $kind): void
    {
        $kindStr = $kind instanceof DocumentKind ? $kind->value : $kind;
        if (!in_array($kindStr, ['receipt', 'invoice_pdf'])) {
            return;
        }

        $requiredBlocks = ['invoice_number', 'gstin', 'tax_table'];
        $foundBlocks = [];

        foreach ($template->blocks as $block) {
            $b = is_array($block) ? (object) $block : $block;
            foreach ($requiredBlocks as $req) {
                if (
                    (isset($b->id) && $b->id === $req) ||
                    (isset($b->content) && str_contains((string) $b->content, '{{' . $req . '}}'))
                ) {
                    $foundBlocks[] = $req;
                }
            }
        }

        $foundBlocks = array_unique($foundBlocks);
        $missing = array_diff($requiredBlocks, $foundBlocks);
        if (!empty($missing)) {
            throw new TemplateCompilationException(
                'Template missing required locked statutory blocks: ' . implode(', ', $missing)
            );
        }
    }

    public function getRepository(): TemplateRepository
    {
        return $this->repository;
    }
}
