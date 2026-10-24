<?php

namespace App\Modules\Printing\Drivers;

use App\Modules\Printing\Contracts\PrintDriver;
use App\Modules\Printing\Data\BlockTemplate;
use App\Modules\Printing\Data\CommandPlan;
use App\Modules\Printing\Enums\PrinterType;
use App\Modules\Printing\Exceptions\TemplateCompilationException;

class SystemDriver implements PrintDriver
{
    public function compile(BlockTemplate $template, array $context): CommandPlan
    {
        $width = $template->paperWidth ?? 80;
        $maxWidthCss = $width === 58 ? '58mm' : ($width === 210 ? '210mm' : '80mm');
        $paddingCss = $width === 210 ? '15mm' : '4mm';

        $html = "<!DOCTYPE html>\n<html>\n<head>\n<meta charset=\"UTF-8\">\n";
        $html .= "<style>\n";
        $html .= "@page { size: auto; margin: 0; }\n";
        $html .= "body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, monospace; margin: 0; padding: {$paddingCss}; font-size: 12px; color: #111827; background: #fff; }\n";
        $html .= ".receipt-container { max-width: {$maxWidthCss}; margin: 0 auto; line-height: 1.35; word-wrap: break-word; }\n";
        $html .= ".text-left { text-align: left; }\n";
        $html .= ".text-center { text-align: center; }\n";
        $html .= ".text-right { text-align: right; }\n";
        $html .= ".font-bold { font-weight: bold; }\n";
        $html .= ".size-sm { font-size: 10px; }\n";
        $html .= ".size-md { font-size: 12px; }\n";
        $html .= ".size-lg { font-size: 15px; font-weight: bold; }\n";
        $html .= ".rule { border-bottom: 1px dashed #4b5563; margin: 4px 0; }\n";
        $html .= ".columns { display: flex; justify-content: space-between; gap: 8px; }\n";
        $html .= ".col-cell { flex: 1; }\n";
        $html .= ".barcode-box { text-align: center; font-family: monospace; letter-spacing: 2px; margin: 6px 0; padding: 4px; border: 1px solid #9ca3af; display: inline-block; }\n";
        $html .= ".qr-box { text-align: center; margin: 6px 0; }\n";
        $html .= ".qr-placeholder { display: inline-block; padding: 6px 12px; border: 1px dashed #6b7280; font-family: monospace; font-size: 10px; }\n";
        $html .= "</style>\n</head>\n<body>\n";
        $html .= "<div class=\"receipt-container\">\n";

        foreach ($template->blocks as $block) {
            $blockObj = is_array($block) ? (object) $block : $block;
            $type = $blockObj->type ?? 'text';

            switch ($type) {
                case 'text':
                    $align = 'text-' . ($blockObj->align ?? 'left');
                    $weight = ($blockObj->weight ?? 'regular') === 'bold' ? 'font-bold' : '';
                    $size = 'size-' . ($blockObj->size ?? 'md');
                    $text = (new EscposDriver())->substituteVariables((string) ($blockObj->content ?? ''), $context);
                    if ($blockObj->uppercase ?? false) {
                        $text = mb_strtoupper($text, 'UTF-8');
                    }
                    $html .= "<div class=\"{$align} {$weight} {$size}\">" . nl2br(htmlspecialchars($text, ENT_QUOTES, 'UTF-8')) . "</div>\n";
                    break;

                case 'spacer':
                case 'feed':
                    $lines = max(1, min(8, (int) ($blockObj->lines ?? 1)));
                    $html .= str_repeat("<div style=\"height: 8px;\"></div>\n", $lines);
                    break;

                case 'rule':
                    $html .= "<div class=\"rule\"></div>\n";
                    break;

                case 'columns':
                    $html .= "<div class=\"columns\">\n";
                    $cols = (array) ($blockObj->columns ?? []);
                    foreach ($cols as $col) {
                        $colObj = is_array($col) ? (object) $col : $col;
                        $align = 'text-' . ($colObj->align ?? 'left');
                        $weight = ($colObj->weight ?? 'regular') === 'bold' ? 'font-bold' : '';
                        $content = (new EscposDriver())->substituteVariables((string) ($colObj->content ?? ''), $context);
                        $html .= "<div class=\"col-cell {$align} {$weight}\">" . htmlspecialchars($content, ENT_QUOTES, 'UTF-8') . "</div>\n";
                    }
                    $html .= "</div>\n";
                    break;

                case 'barcode':
                    $data = (new EscposDriver())->substituteVariables((string) ($blockObj->data ?? ''), $context);
                    $html .= "<div style=\"text-align: center;\"><div class=\"barcode-box\">||| " . htmlspecialchars($data, ENT_QUOTES, 'UTF-8') . " |||</div></div>\n";
                    break;

                case 'qr':
                    $data = (new EscposDriver())->substituteVariables((string) ($blockObj->data ?? ''), $context);
                    $html .= "<div class=\"qr-box\"><div class=\"qr-placeholder\">[QR: " . htmlspecialchars($data, ENT_QUOTES, 'UTF-8') . "]</div></div>\n";
                    break;

                case 'cut':
                    $html .= "<div style=\"margin-top: 12px; border-bottom: 2px dashed #9ca3af;\"></div>\n";
                    break;
            }
        }

        $html .= "</div>\n</body>\n</html>";

        return new CommandPlan(
            format: 'html',
            data: base64_encode($html),
            metadata: [
                'paper_width_mm' => $width,
                'html_length' => strlen($html),
            ]
        );
    }

    public function supports(PrinterType $type): bool
    {
        return true;
    }

    public function getName(): string
    {
        return 'system';
    }

    public function validateTemplate(BlockTemplate $template): array
    {
        return (new EscposDriver())->validateTemplate($template);
    }
}
