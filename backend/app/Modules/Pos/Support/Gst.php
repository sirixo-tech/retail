<?php

namespace App\Modules\Pos\Support;

class Gst
{
    /**
     * @return array{taxable: int, tax: int, cgst: int, sgst: int, igst: int, total: int}
     */
    public static function split(int $amountPaise, int $gstBps, bool $inclusive, bool $interstate): array
    {
        if ($inclusive) {
            $taxable = (int) round($amountPaise * 10000 / (10000 + $gstBps));
            $tax = $amountPaise - $taxable;
            $total = $amountPaise;
        } else {
            $taxable = $amountPaise;
            $tax = (int) round($taxable * $gstBps / 10000);
            $total = $taxable + $tax;
        }

        if ($interstate) {
            return ['taxable' => $taxable, 'tax' => $tax, 'cgst' => 0, 'sgst' => 0, 'igst' => $tax, 'total' => $total];
        }

        $cgst = intdiv($tax, 2);
        $sgst = $tax - $cgst;

        return ['taxable' => $taxable, 'tax' => $tax, 'cgst' => $cgst, 'sgst' => $sgst, 'igst' => 0, 'total' => $total];
    }
}
