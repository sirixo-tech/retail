<?php

namespace App\Support;

class SimplePdf
{
    /**
     * @param  list<string>  $lines
     */
    public static function render(array $lines, bool $specimen): string
    {
        $commands = ['BT', '/F1 11 Tf', '50 790 Td', '16 TL'];
        foreach ($lines as $line) {
            $commands[] = '('.self::escape($line).') Tj';
            $commands[] = 'T*';
        }
        $commands[] = 'ET';
        if ($specimen) {
            $commands[] = 'BT /F1 42 Tf 0.75 g 150 420 Td (SPECIMEN) Tj ET';
        }
        $stream = implode("\n", $commands);

        $objects = [
            '<< /Type /Catalog /Pages 2 0 R >>',
            '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
            '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
            '<< /Length '.strlen($stream)." >>\nstream\n".$stream."\nendstream",
            '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
        ];

        $pdf = "%PDF-1.4\n";
        $offsets = [0];
        foreach ($objects as $index => $body) {
            $offsets[] = strlen($pdf);
            $pdf .= ($index + 1)." 0 obj\n".$body."\nendobj\n";
        }
        $xref = strlen($pdf);
        $pdf .= 'xref'."\n".'0 '.(count($objects) + 1)."\n";
        $pdf .= "0000000000 65535 f \n";
        for ($index = 1; $index <= count($objects); $index++) {
            $pdf .= sprintf("%010d 00000 n \n", $offsets[$index]);
        }
        $pdf .= 'trailer << /Size '.(count($objects) + 1).' /Root 1 0 R >>'."\n";
        $pdf .= 'startxref'."\n".$xref."\n%%EOF";

        return $pdf;
    }

    private static function escape(string $text): string
    {
        $ascii = preg_replace('/[^\x20-\x7E]/', ' ', $text) ?? $text;

        return str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $ascii);
    }
}
