<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class InventoryReportService
{
    /**
     * Dead Stock Analysis: items with positive balance but no sales in $days.
     */
    public function deadStockAnalysis(string $tenantId, int $days = 90): array
    {
        $cutoff = now()->subDays($days);

        $deadStock = DB::table('store_items')
            ->leftJoin('sale_lines', 'store_items.id', '=', 'sale_lines.store_item_id')
            ->leftJoin('sales', function ($join) use ($cutoff) {
                $join->on('sale_lines.sale_id', '=', 'sales.id')
                    ->where('sales.created_at', '>=', $cutoff)
                    ->where('sales.status', '!=', 'voided');
            })
            ->join('stock_balances', 'store_items.id', '=', 'stock_balances.store_item_id')
            ->where('store_items.tenant_id', $tenantId)
            ->whereNull('sales.id')
            ->where('stock_balances.on_hand', '>', 0)
            ->select([
                'store_items.id',
                'store_items.sku',
                'store_items.name_override',
                'store_items.cost_paise',
                'stock_balances.on_hand',
                DB::raw('stock_balances.on_hand * store_items.cost_paise as blocked_value_paise'),
            ])
            ->orderByDesc('blocked_value_paise')
            ->get();

        $totalBlockedValue = (int) $deadStock->sum('blocked_value_paise');

        return [
            'days_threshold' => $days,
            'item_count' => $deadStock->count(),
            'total_blocked_value_paise' => $totalBlockedValue,
            'items' => $deadStock,
        ];
    }

    /**
     * Stock Aging Report: items grouped into age buckets (0-30, 31-60, 61-90, 90+ days).
     */
    public function stockAgingReport(string $tenantId): array
    {
        $now = now();
        $items = DB::table('store_items')
            ->join('stock_balances', 'store_items.id', '=', 'stock_balances.store_item_id')
            ->where('store_items.tenant_id', $tenantId)
            ->where('stock_balances.on_hand', '>', 0)
            ->select([
                'store_items.id',
                'store_items.sku',
                'store_items.name_override',
                'store_items.cost_paise',
                'store_items.created_at',
                'stock_balances.on_hand',
                DB::raw('stock_balances.on_hand * store_items.cost_paise as value_paise'),
            ])
            ->get();

        $buckets = [
            '0_30' => ['label' => '0 - 30 days', 'count' => 0, 'value_paise' => 0, 'items' => []],
            '31_60' => ['label' => '31 - 60 days', 'count' => 0, 'value_paise' => 0, 'items' => []],
            '61_90' => ['label' => '61 - 90 days', 'count' => 0, 'value_paise' => 0, 'items' => []],
            '90_plus' => ['label' => '90+ days', 'count' => 0, 'value_paise' => 0, 'items' => []],
        ];

        foreach ($items as $item) {
            $ageDays = Carbon::parse($item->created_at)->diffInDays($now);
            $val = (int) $item->value_paise;

            if ($ageDays <= 30) {
                $bucket = '0_30';
            } elseif ($ageDays <= 60) {
                $bucket = '31_60';
            } elseif ($ageDays <= 90) {
                $bucket = '61_90';
            } else {
                $bucket = '90_plus';
            }

            $buckets[$bucket]['count']++;
            $buckets[$bucket]['value_paise'] += $val;
            if (count($buckets[$bucket]['items']) < 15) {
                $buckets[$bucket]['items'][] = [
                    'sku' => $item->sku,
                    'name' => $item->name_override,
                    'qty' => (float) $item->qty,
                    'age_days' => $ageDays,
                    'value_paise' => $val,
                ];
            }
        }

        return [
            'total_items' => $items->count(),
            'total_value_paise' => (int) $items->sum('value_paise'),
            'buckets' => $buckets,
        ];
    }

    /**
     * Shrinkage Report: stock adjustments due to damage, shrinkage, theft, expiration.
     */
    public function shrinkageReport(string $tenantId, Carbon $start, Carbon $end): array
    {
        $records = [];
        $totalLostValue = 0;
        $totalLostQty = 0;

        if (Schema::hasTable('stock_adjustments')) {
            $adjustments = DB::table('stock_adjustments')
                ->join('store_items', 'stock_adjustments.store_item_id', '=', 'store_items.id')
                ->where('stock_adjustments.tenant_id', $tenantId)
                ->whereBetween('stock_adjustments.created_at', [$start, $end])
                ->where('stock_adjustments.delta_qty', '<', 0)
                ->select([
                    'stock_adjustments.id',
                    'stock_adjustments.reason',
                    'stock_adjustments.delta_qty',
                    'stock_adjustments.created_at',
                    'store_items.sku',
                    'store_items.name_override',
                    'store_items.cost_paise',
                    DB::raw('ABS(stock_adjustments.delta_qty) * store_items.cost_paise as lost_value_paise'),
                ])
                ->orderByDesc('stock_adjustments.created_at')
                ->get();

            foreach ($adjustments as $adj) {
                $lostQty = abs((float) $adj->delta_qty);
                $lostVal = (int) $adj->lost_value_paise;
                $totalLostQty += $lostQty;
                $totalLostValue += $lostVal;

                $records[] = [
                    'id' => $adj->id,
                    'sku' => $adj->sku,
                    'name' => $adj->name_override,
                    'reason' => $adj->reason,
                    'qty_lost' => $lostQty,
                    'cost_paise' => $adj->cost_paise,
                    'lost_value_paise' => $lostVal,
                    'date' => $adj->created_at,
                ];
            }
        }

        return [
            'period' => [
                'start' => $start->toIso8601String(),
                'end' => $end->toIso8601String(),
            ],
            'total_incidents' => count($records),
            'total_lost_qty' => $totalLostQty,
            'total_lost_value_paise' => $totalLostValue,
            'records' => $records,
        ];
    }

    /**
     * Fast-Moving Items: top items by quantity and revenue over the last 30 days.
     */
    public function fastMovingItems(string $tenantId, int $limit = 50): array
    {
        $since = now()->subDays(30);

        $items = DB::table('sale_lines')
            ->join('sales', 'sale_lines.sale_id', '=', 'sales.id')
            ->join('store_items', 'sale_lines.store_item_id', '=', 'store_items.id')
            ->leftJoin('stock_balances', 'store_items.id', '=', 'stock_balances.store_item_id')
            ->where('sales.tenant_id', $tenantId)
            ->where('sales.status', '!=', 'voided')
            ->where('sales.created_at', '>=', $since)
            ->groupBy('store_items.id', 'store_items.sku', 'store_items.name_override', 'stock_balances.on_hand')
            ->select([
                'store_items.id',
                'store_items.sku',
                'store_items.name_override',
                DB::raw('COALESCE(stock_balances.on_hand, 0) as current_stock'),
                DB::raw('SUM(sale_lines.qty) as total_qty_sold'),
                DB::raw('SUM(sale_lines.line_total_paise) as total_revenue_paise'),
            ])
            ->orderByDesc('total_qty_sold')
            ->limit($limit)
            ->get();

        return [
            'period_days' => 30,
            'count' => $items->count(),
            'items' => $items,
        ];
    }

    /**
     * Slow-Moving Items: items sold at low velocity over the last 30 days.
     */
    public function slowMovingItems(string $tenantId, int $limit = 50): array
    {
        $since = now()->subDays(30);

        $items = DB::table('sale_lines')
            ->join('sales', 'sale_lines.sale_id', '=', 'sales.id')
            ->join('store_items', 'sale_lines.store_item_id', '=', 'store_items.id')
            ->leftJoin('stock_balances', 'store_items.id', '=', 'stock_balances.store_item_id')
            ->where('sales.tenant_id', $tenantId)
            ->where('sales.status', '!=', 'voided')
            ->where('sales.created_at', '>=', $since)
            ->groupBy('store_items.id', 'store_items.sku', 'store_items.name_override', 'stock_balances.on_hand')
            ->select([
                'store_items.id',
                'store_items.sku',
                'store_items.name_override',
                DB::raw('COALESCE(stock_balances.on_hand, 0) as current_stock'),
                DB::raw('SUM(sale_lines.qty) as total_qty_sold'),
                DB::raw('SUM(sale_lines.line_total_paise) as total_revenue_paise'),
            ])
            ->havingRaw('SUM(sale_lines.qty) > 0')
            ->orderBy('total_qty_sold', 'asc')
            ->limit($limit)
            ->get();

        return [
            'period_days' => 30,
            'count' => $items->count(),
            'items' => $items,
        ];
    }
}
