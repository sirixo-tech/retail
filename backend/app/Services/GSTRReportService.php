<?php

namespace App\Services;

use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class GSTRReportService
{
    /**
     * Generate complete GSTR-1 JSON compliant with GST Portal schema.
     */
    public function generateGSTR1(string $tenantId, string $month): array
    {
        return Tenant::acting($tenantId, function () use ($tenantId, $month) {
            $date = Carbon::parse($month . '-01');
            $start = (clone $date)->startOfMonth();
            $end = (clone $date)->endOfMonth();

            $tenant = DB::table('tenants')->where('id', $tenantId)->first();
            $gstin = $tenant->gstin ?? '29ABCDE1234F1Z5';

            return [
                'gstin' => $gstin,
                'fp' => $date->format('mY'), // e.g., "102024"
                'cur_gt' => 0.0,
                'b2b' => $this->getB2BInvoices($tenantId, $start, $end),
                'b2cl' => $this->getB2CLargeInvoices($tenantId, $start, $end),
                'b2cs' => $this->getB2CSmallSummary($tenantId, $start, $end),
                'hsn' => $this->getHSNSummary($tenantId, $start, $end),
            ];
        });
    }

    /**
     * B2B Invoices (registered customers with GSTIN).
     */
    public function getB2BInvoices(string $tenantId, Carbon $start, Carbon $end): array
    {
        $sales = DB::table('sales')
            ->join('customers', 'customers.id', '=', 'sales.customer_id')
            ->where('sales.tenant_id', $tenantId)
            ->whereBetween('sales.created_at', [$start, $end])
            ->where('sales.status', '!=', 'voided')
            ->whereNotNull('customers.gstin')
            ->select([
                'sales.*',
                'customers.gstin as ctin',
                'customers.name as customer_name',
            ])
            ->get();

        $grouped = [];

        foreach ($sales as $sale) {
            $ctin = $sale->ctin;
            if (! isset($grouped[$ctin])) {
                $grouped[$ctin] = [
                    'ctin' => $ctin,
                    'inv' => [],
                ];
            }

            $lines = DB::table('sale_lines')->where('sale_id', $sale->id)->get();
            $items = [];
            $num = 1;
            foreach ($lines as $line) {
                $taxable = ($line->taxable_paise ?? 0) / 100;
                $cgst = ($line->cgst_paise ?? 0) / 100;
                $sgst = ($line->sgst_paise ?? 0) / 100;
                $igst = ($line->igst_paise ?? 0) / 100;
                $rate = ($line->gst_bps ?? 0) / 100;

                $items[] = [
                    'num' => $num++,
                    'itm_det' => [
                        'rt' => $rate,
                        'txval' => $taxable,
                        'iamt' => $igst,
                        'camt' => $cgst,
                        'samt' => $sgst,
                        'csamt' => 0.0,
                    ],
                ];
            }

            $grouped[$ctin]['inv'][] = [
                'inum' => $sale->number,
                'idt' => Carbon::parse($sale->created_at)->format('d-m-Y'),
                'val' => $sale->total_paise / 100,
                'pos' => substr($ctin, 0, 2),
                'rchrg' => 'N',
                'inv_typ' => 'R',
                'itms' => $items,
            ];
        }

        return array_values($grouped);
    }

    /**
     * B2C Large Invoices (Inter-state unregistered with invoice value > Rs. 2.5 Lakh).
     */
    public function getB2CLargeInvoices(string $tenantId, Carbon $start, Carbon $end): array
    {
        $tenant = DB::table('tenants')->where('id', $tenantId)->first();
        $homeState = substr($tenant->gstin ?? '29', 0, 2);

        $sales = DB::table('sales')
            ->leftJoin('customers', 'customers.id', '=', 'sales.customer_id')
            ->where('sales.tenant_id', $tenantId)
            ->whereBetween('sales.created_at', [$start, $end])
            ->where('sales.status', '!=', 'voided')
            ->where(function ($q) {
                $q->whereNull('sales.customer_id')
                  ->orWhereNull('customers.gstin');
            })
            ->where('sales.total_paise', '>', 25000000) // > 2.5 Lakh
            ->where('sales.igst_paise', '>', 0) // Inter-state
            ->get();

        $rows = [];
        foreach ($sales as $sale) {
            $lines = DB::table('sale_lines')->where('sale_id', $sale->id)->get();
            $items = [];
            foreach ($lines as $line) {
                $items[] = [
                    'rt' => ($line->gst_bps ?? 0) / 100,
                    'txval' => ($line->taxable_paise ?? 0) / 100,
                    'iamt' => ($line->igst_paise ?? 0) / 100,
                    'csamt' => 0.0,
                ];
            }

            $rows[] = [
                'pos' => '33', // Other state code
                'inum' => $sale->number,
                'idt' => Carbon::parse($sale->created_at)->format('d-m-Y'),
                'val' => $sale->total_paise / 100,
                'itms' => $items,
            ];
        }

        return $rows;
    }

    /**
     * B2C Small Summary (all other retail consumer invoices grouped by rate).
     */
    public function getB2CSmallSummary(string $tenantId, Carbon $start, Carbon $end): array
    {
        $lines = DB::table('sale_lines')
            ->join('sales', 'sales.id', '=', 'sale_lines.sale_id')
            ->leftJoin('customers', 'customers.id', '=', 'sales.customer_id')
            ->where('sales.tenant_id', $tenantId)
            ->whereBetween('sales.created_at', [$start, $end])
            ->where('sales.status', '!=', 'voided')
            ->where(function ($q) {
                $q->whereNull('sales.customer_id')
                  ->orWhereNull('customers.gstin');
            })
            ->selectRaw('
                sale_lines.gst_bps,
                SUM(sale_lines.taxable_paise) as total_taxable,
                SUM(sale_lines.cgst_paise) as total_cgst,
                SUM(sale_lines.sgst_paise) as total_sgst,
                SUM(sale_lines.igst_paise) as total_igst
            ')
            ->groupBy('sale_lines.gst_bps')
            ->get();

        $summary = [];
        foreach ($lines as $line) {
            $summary[] = [
                'sply_ty' => 'INTRA',
                'rt' => ($line->gst_bps ?? 0) / 100,
                'typ' => 'OE',
                'txval' => round(($line->total_taxable ?? 0) / 100, 2),
                'camt' => round(($line->total_cgst ?? 0) / 100, 2),
                'samt' => round(($line->total_sgst ?? 0) / 100, 2),
                'iamt' => round(($line->total_igst ?? 0) / 100, 2),
                'csamt' => 0.0,
            ];
        }

        return $summary;
    }

    /**
     * HSN Summary of outward supplies.
     */
    public function getHSNSummary(string $tenantId, Carbon $start, Carbon $end): array
    {
        $records = DB::table('sale_lines')
            ->join('sales', 'sales.id', '=', 'sale_lines.sale_id')
            ->where('sales.tenant_id', $tenantId)
            ->whereBetween('sales.created_at', [$start, $end])
            ->where('sales.status', '!=', 'voided')
            ->selectRaw('
                COALESCE(sale_lines.hsn_snapshot, \'9999\') as hsn_sc,
                MAX(sale_lines.description_snapshot) as descr,
                SUM(sale_lines.qty) as total_qty,
                sale_lines.gst_bps,
                SUM(sale_lines.taxable_paise) as total_txval,
                SUM(sale_lines.cgst_paise) as total_camt,
                SUM(sale_lines.sgst_paise) as total_samt,
                SUM(sale_lines.igst_paise) as total_iamt,
                SUM(sale_lines.line_total_paise) as total_val
            ')
            ->groupBy(['sale_lines.hsn_snapshot', 'sale_lines.gst_bps'])
            ->get();

        $data = [];
        $num = 1;
        foreach ($records as $r) {
            $data[] = [
                'num' => $num++,
                'hsn_sc' => (string) $r->hsn_sc,
                'desc' => $r->descr ?: 'General goods',
                'uqc' => 'NOS',
                'qty' => (float) $r->total_qty,
                'val' => round(($r->total_val ?? 0) / 100, 2),
                'txval' => round(($r->total_txval ?? 0) / 100, 2),
                'iamt' => round(($r->total_iamt ?? 0) / 100, 2),
                'camt' => round(($r->total_camt ?? 0) / 100, 2),
                'samt' => round(($r->total_samt ?? 0) / 100, 2),
                'csamt' => 0.0,
            ];
        }

        return ['data' => $data];
    }

    /**
     * Quick summary metrics for preview page.
     */
    public function getSummaryMetrics(string $tenantId, string $month): array
    {
        $gstr = $this->generateGSTR1($tenantId, $month);

        $b2bInvoicesCount = 0;
        $b2bTotalVal = 0.0;
        foreach ($gstr['b2b'] as $party) {
            foreach ($party['inv'] as $inv) {
                $b2bInvoicesCount++;
                $b2bTotalVal += $inv['val'];
            }
        }

        $b2cTotalVal = 0.0;
        $b2cTotalTax = 0.0;
        foreach ($gstr['b2cs'] as $item) {
            $b2cTotalVal += $item['txval'] + $item['camt'] + $item['samt'] + $item['iamt'];
            $b2cTotalTax += $item['camt'] + $item['samt'] + $item['iamt'];
        }

        $hsnCount = count($gstr['hsn']['data'] ?? []);

        return [
            'month' => $month,
            'gstin' => $gstr['gstin'],
            'b2b_count' => $b2bInvoicesCount,
            'b2b_total' => round($b2bTotalVal, 2),
            'b2c_total' => round($b2cTotalVal, 2),
            'b2c_tax' => round($b2cTotalTax, 2),
            'hsn_count' => $hsnCount,
            'total_turnover' => round($b2bTotalVal + $b2cTotalVal, 2),
            'details' => $gstr,
        ];
    }
}
