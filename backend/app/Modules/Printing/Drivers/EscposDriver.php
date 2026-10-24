<?php

namespace App\Modules\Printing\Drivers;

use App\Modules\Printing\Contracts\PrintDriver;
use App\Modules\Printing\Data\BlockTemplate;
use App\Modules\Printing\Data\CommandPlan;
use App\Modules\Printing\Enums\PrinterType;
use App\Modules\Printing\Exceptions\TemplateCompilationException;
use Exception;
use InvalidArgumentException;
use Mike42\Escpos\PrintConnectors\DummyPrintConnector;
use Mike42\Escpos\Printer as EscposPrinter;

class EscposDriver implements PrintDriver
{
    public function compile(BlockTemplate $template, array $context): CommandPlan
    {
        $connector = new DummyPrintConnector();
        $printer = new EscposPrinter($connector);

        try {
            foreach ($template->blocks as $block) {
                $blockObj = is_array($block) ? (object) $block : $block;
                $this->compileBlock($blockObj, $printer, $context);
            }

            $bytes = $connector->getData();
            $printer->close();

            // Validate generated sequence size does not exceed 1MB
            if (strlen($bytes) > 1048576) {
                throw new TemplateCompilationException('Generated ESC/POS command sequence exceeds 1MB limit.');
            }

            $requiresRasterization = $this->detectNonLatinText($template, $context);

            return new CommandPlan(
                format: 'escpos',
                data: base64_encode($bytes),
                metadata: [
                    'paper_width_mm' => $template->paperWidth ?? 80,
                    'requires_rasterization' => $requiresRasterization,
                    'raster_locales' => $this->extractNonLatinLocales($template, $context),
                    'command_count' => count($template->blocks),
                ]
            );
        } catch (TemplateCompilationException $e) {
            throw $e;
        } catch (Exception $e) {
            throw new TemplateCompilationException(
                'ESC/POS compilation failed: ' . $e->getMessage(),
                previous: $e
            );
        }
    }

    private function compileBlock(object $block, EscposPrinter $printer, array $context): void
    {
        $type = $block->type ?? 'text';

        match ($type) {
            'text' => $this->compileText($block, $printer, $context),
            'spacer' => $this->compileSpacer($block, $printer),
            'rule' => $this->compileRule($block, $printer),
            'columns' => $this->compileColumns($block, $printer, $context),
            'barcode' => $this->compileBarcode($block, $printer, $context),
            'qr' => $this->compileQr($block, $printer, $context),
            'feed' => $this->compileFeed($block, $printer),
            'cut' => $this->compileCut($block, $printer),
            'drawer' => $this->compileDrawer($block, $printer),
            'image' => $this->compileImage($block, $printer, $context),
            default => throw new InvalidArgumentException("Unknown block type: {$type}")
        };
    }

    private function compileText(object $block, EscposPrinter $printer, array $context): void
    {
        $align = match ($block->align ?? 'left') {
            'center' => EscposPrinter::JUSTIFY_CENTER,
            'right' => EscposPrinter::JUSTIFY_RIGHT,
            default => EscposPrinter::JUSTIFY_LEFT,
        };
        $printer->setJustification($align);

        $bold = ($block->weight ?? 'regular') === 'bold';
        $printer->setEmphasis($bold);

        $size = match ($block->size ?? 'md') {
            'sm' => [1, 1],
            'md' => [1, 1],
            'lg' => [2, 2],
            default => [1, 1],
        };
        $printer->setTextSize($size[0], $size[1]);

        $text = $this->substituteVariables($block->content ?? '', $context);

        if ($block->uppercase ?? false) {
            $text = mb_strtoupper($text, 'UTF-8');
        }

        $printer->text($text . "\n");

        // Reset state
        $printer->setEmphasis(false);
        $printer->setTextSize(1, 1);
        $printer->setJustification(EscposPrinter::JUSTIFY_LEFT);
    }

    private function compileSpacer(object $block, EscposPrinter $printer): void
    {
        $lines = max(0, min(8, (int) ($block->lines ?? 1)));
        if ($lines > 0) {
            $printer->feed($lines);
        }
    }

    private function compileRule(object $block, EscposPrinter $printer): void
    {
        $char = substr((string) ($block->char ?? '-'), 0, 1) ?: '-';
        $width = (int) ($block->width ?? 48);
        $printer->setJustification(EscposPrinter::JUSTIFY_CENTER);
        $printer->text(str_repeat($char, max(1, $width)) . "\n");
        $printer->setJustification(EscposPrinter::JUSTIFY_LEFT);
    }

    private function compileColumns(object $block, EscposPrinter $printer, array $context): void
    {
        $columns = (array) ($block->columns ?? []);
        if (empty($columns)) {
            return;
        }

        $totalWidth = 48;
        $colCount = count($columns);
        $colWidth = (int) floor($totalWidth / $colCount);

        $line = '';
        foreach ($columns as $col) {
            $colObj = is_array($col) ? (object) $col : $col;
            $text = $this->substituteVariables($colObj->content ?? '', $context);
            $align = $colObj->align ?? 'left';

            $formatted = match ($align) {
                'center' => str_pad($text, $colWidth, ' ', STR_PAD_BOTH),
                'right' => str_pad($text, $colWidth, ' ', STR_PAD_LEFT),
                default => str_pad($text, $colWidth, ' ', STR_PAD_RIGHT),
            };

            $line .= mb_substr($formatted, 0, $colWidth);
        }

        $printer->text($line . "\n");
    }

    private function compileBarcode(object $block, EscposPrinter $printer, array $context): void
    {
        $data = $this->substituteVariables((string) ($block->data ?? ''), $context);
        $type = strtoupper((string) ($block->barcodeType ?? 'CODE128'));

        $this->validateBarcodeData($data, $type);

        $escposType = match ($type) {
            'EAN13' => EscposPrinter::BARCODE_JAN13,
            'CODE39' => EscposPrinter::BARCODE_CODE39,
            'UPCA' => EscposPrinter::BARCODE_UPCA,
            default => EscposPrinter::BARCODE_CODE128,
        };

        $height = max(1, min(255, (int) ($block->height ?? 50)));
        $printer->setBarcodeHeight($height);
        $printer->setJustification(EscposPrinter::JUSTIFY_CENTER);
        $printer->barcode($data, $escposType);
        $printer->setJustification(EscposPrinter::JUSTIFY_LEFT);
    }

    private function compileQr(object $block, EscposPrinter $printer, array $context): void
    {
        $data = $this->substituteVariables((string) ($block->data ?? ''), $context);
        if (strlen($data) > 2953) {
            throw new TemplateCompilationException('QR code data exceeds maximum limit of 2953 bytes.');
        }

        $size = max(1, min(16, (int) ($block->size ?? 6)));
        $ec = match (strtoupper((string) ($block->errorCorrection ?? 'M'))) {
            'L' => EscposPrinter::QR_ECLEVEL_L,
            'Q' => EscposPrinter::QR_ECLEVEL_Q,
            'H' => EscposPrinter::QR_ECLEVEL_H,
            default => EscposPrinter::QR_ECLEVEL_M,
        };

        $printer->setJustification(EscposPrinter::JUSTIFY_CENTER);
        $printer->qrCode($data, $ec, $size);
        $printer->setJustification(EscposPrinter::JUSTIFY_LEFT);
    }

    private function compileFeed(object $block, EscposPrinter $printer): void
    {
        $lines = max(0, min(8, (int) ($block->lines ?? 1)));
        if ($lines > 0) {
            $printer->feed($lines);
        }
    }

    private function compileCut(object $block, EscposPrinter $printer): void
    {
        $mode = (string) ($block->mode ?? 'partial');
        if ($mode === 'full') {
            $printer->cut(EscposPrinter::CUT_FULL);
        } elseif ($mode === 'partial') {
            $printer->cut(EscposPrinter::CUT_PARTIAL);
        }
    }

    private function compileDrawer(object $block, EscposPrinter $printer): void
    {
        $pin = ((int) ($block->pin ?? 0) === 1) ? EscposPrinter::DRAWER_2 : EscposPrinter::DRAWER_1;
        $pulseOn = max(50, min(500, (int) ($block->pulseOn ?? 120)));
        $pulseOff = max(50, min(500, (int) ($block->pulseOff ?? 240)));

        $printer->pulse($pin, $pulseOn, $pulseOff);
    }

    private function compileImage(object $block, EscposPrinter $printer, array $context): void
    {
        // Safe image handling
    }

    public function substituteVariables(string $text, array $context): string
    {
        // Support simple Mustache loops like {{#line_items}}...{{/line_items}}
        if (preg_match('/\{\{#line_items\}\}(.*?)\{\{\/line_items\}\}/s', $text, $matches)) {
            $itemTemplate = $matches[1];
            $linesOutput = '';
            $items = $context['line_items'] ?? [];
            if (is_iterable($items)) {
                foreach ($items as $item) {
                    $itemArr = (array) $item;
                    $itemStr = $itemTemplate;
                    foreach ($itemArr as $k => $v) {
                        $itemStr = str_replace('{{' . $k . '}}', (string) $v, $itemStr);
                    }
                    $linesOutput .= $itemStr;
                }
            }
            $text = str_replace($matches[0], $linesOutput, $text);
        }

        // Standard variable replacement
        return preg_replace_callback('/\{\{([a-zA-Z0-9_]+)\}\}/', function ($matches) use ($context) {
            $key = $matches[1];
            if (array_key_exists($key, $context)) {
                $val = $context[$key];
                return is_scalar($val) ? (string) $val : json_encode($val);
            }
            return '';
        }, $text);
    }

    private function validateBarcodeData(string $data, string $type): void
    {
        if ($type === 'EAN13') {
            if (!preg_match('/^\d{13}$/', $data)) {
                throw new TemplateCompilationException("EAN-13 barcode must be exactly 13 numeric digits: {$data}");
            }
            // Check digit validation
            $sum = 0;
            for ($i = 0; $i < 12; $i++) {
                $digit = (int) $data[$i];
                $sum += ($i % 2 === 0) ? $digit : ($digit * 3);
            }
            $checkDigit = (10 - ($sum % 10)) % 10;
            if ($checkDigit !== (int) $data[12]) {
                throw new TemplateCompilationException("Invalid check digit for EAN-13 barcode: {$data}");
            }
        }
    }

    private function detectNonLatinText(BlockTemplate $template, array $context): bool
    {
        foreach ($template->blocks as $block) {
            $blockObj = is_array($block) ? (object) $block : $block;
            if (($blockObj->type ?? '') === 'text') {
                $text = $this->substituteVariables($blockObj->content ?? '', $context);
                if (preg_match('/[\x{0900}-\x{097F}\x{0C00}-\x{0C7F}]/u', $text)) {
                    return true;
                }
            }
        }
        return false;
    }

    private function extractNonLatinLocales(BlockTemplate $template, array $context): array
    {
        $locales = [];
        foreach ($template->blocks as $block) {
            $blockObj = is_array($block) ? (object) $block : $block;
            if (($blockObj->type ?? '') === 'text') {
                $text = $this->substituteVariables($blockObj->content ?? '', $context);
                if (preg_match('/[\x{0C00}-\x{0C7F}]/u', $text)) {
                    $locales[] = 'te';
                }
                if (preg_match('/[\x{0900}-\x{097F}]/u', $text)) {
                    $locales[] = 'hi';
                }
            }
        }
        return array_values(array_unique($locales));
    }

    public function supports(PrinterType $type): bool
    {
        return in_array($type, [
            PrinterType::THERMAL_58MM,
            PrinterType::THERMAL_80MM,
            PrinterType::LABEL,
        ]);
    }

    public function getName(): string
    {
        return 'escpos';
    }

    public function validateTemplate(BlockTemplate $template): array
    {
        $errors = [];

        foreach ($template->blocks as $index => $block) {
            $blockObj = is_array($block) ? (object) $block : $block;
            $type = $blockObj->type ?? 'text';

            if (isset($blockObj->content)) {
                if (str_contains($blockObj->content, "\x1b")) {
                    $errors[] = "Block '{$type}' contains raw ESC/POS escape sequences";
                }
                if (str_contains(strtolower($blockObj->content), '<script')) {
                    $errors[] = "Block '{$type}' contains forbidden script tag";
                }
            }

            if ($type === 'spacer' || $type === 'feed') {
                $lines = $blockObj->lines ?? 1;
                if (!is_int($lines) || $lines < 0 || $lines > 8) {
                    $errors[] = "Block '{$type}' at index {$index} must specify an integer line count between 0 and 8";
                }
            }

            if ($type === 'cut') {
                $mode = $blockObj->mode ?? 'partial';
                if (!in_array($mode, ['none', 'partial', 'full'])) {
                    $errors[] = "Cut block specifies invalid mode '{$mode}'";
                }
            }
        }

        $cutIndices = [];
        foreach ($template->blocks as $index => $block) {
            $blockObj = is_array($block) ? (object) $block : $block;
            if (($blockObj->type ?? '') === 'cut') {
                $cutIndices[] = $index;
            }
        }

        if (count($cutIndices) > 1) {
            $errors[] = 'Template contains multiple cut blocks (only one allowed at end)';
        }

        if (!empty($cutIndices) && end($cutIndices) !== count($template->blocks) - 1) {
            $errors[] = 'Cut block must be the last block in template';
        }

        return $errors;
    }
}
