<?php

namespace App\Modules\Printing\Contracts;

use App\Modules\Printing\Data\BlockTemplate;
use App\Modules\Printing\Data\CommandPlan;
use App\Modules\Printing\Enums\PrinterType;

interface PrintDriver
{
    /**
     * Compile a block template into a command plan.
     *
     * @param BlockTemplate $template The template to compile
     * @param array<string, mixed> $context Variable substitution context
     * @return CommandPlan The compiled command plan
     * @throws \App\Modules\Printing\Exceptions\TemplateCompilationException
     */
    public function compile(BlockTemplate $template, array $context): CommandPlan;

    /**
     * Check if this driver supports the given printer type.
     *
     * @param PrinterType $type The printer type to check
     * @return bool True if supported
     */
    public function supports(PrinterType $type): bool;

    /**
     * Get the driver name.
     *
     * @return string Driver identifier (escpos, system, etc.)
     */
    public function getName(): string;

    /**
     * Validate that the template is compatible with this driver.
     *
     * @param BlockTemplate $template The template to validate
     * @return array<string> List of validation errors (empty if valid)
     */
    public function validateTemplate(BlockTemplate $template): array;
}
