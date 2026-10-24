<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class FinancialReportService
{
    /**
     * Generate Profit and Loss statement for the tenant within the given period.
     */
    public function profitAndLoss(string $tenantId, Carbon $start, Carbon $end): array
    {
        // 1. Revenue
        $salesQuery = DB::table('sales')
            ->where('tenant_id', $tenantId)
            ->where('status', '!=', 'voided')
            ->whereBetween('created_at', [$start, $end]);

        $revenue = (int) $salesQuery->sum('total_paise');
        $salesCount = (int) $salesQuery->count();
        $totalDiscount = (int) $salesQuery->sum('discount_paise');
        $totalTax = (int) ($salesQuery->sum('cgst_paise') + $salesQuery->sum('sgst_paise') + $salesQuery->sum('igst_paise') + $salesQuery->sum('cess_paise'));

        // 2. Cost of Goods Sold (COGS)
        $cogs = (int) DB::table('sale_lines')
            ->join('sales', 'sale_lines.sale_id', '=', 'sales.id')
            ->join('store_items', 'sale_lines.store_item_id', '=', 'store_items.id')
            ->where('sales.tenant_id', $tenantId)
            ->where('sales.status', '!=', 'voided')
            ->whereBetween('sales.created_at', [$start, $end])
            ->selectRaw('COALESCE(SUM(sale_lines.qty * store_items.cost_paise), 0) as total')
            ->value('total');

        // 3. Operating Expenses
        $expenses = 0;
        if (Schema::hasTable('expenses')) {
            $expenses = (int) DB::table('expenses')
                ->where('tenant_id', $tenantId)
                ->whereBetween('expense_date', [$start, $end])
                ->sum('amount_paise');
        }

        // 4. Staff Salaries / Payroll
        $salaries = 0;
        if (Schema::hasTable('staff_salaries')) {
            $salaries = (int) DB::table('staff_salaries')
                ->where('tenant_id', $tenantId)
                ->whereBetween('salary_month', [$start, $end])
                ->sum('amount_paise');
        }

        $grossProfit = $revenue - $cogs;
        $netProfit = $grossProfit - $expenses - $salaries;

        $grossMarginPercent = $revenue > 0 ? round(($grossProfit / $revenue) * 100, 2) : 0.0;
        $netMarginPercent = $revenue > 0 ? round(($netProfit / $revenue) * 100, 2) : 0.0;

        return [
            'period' => [
                'start' => $start->toIso8601String(),
                'end' => $end->toIso8601String(),
            ],
            'sales_count' => $salesCount,
            'revenue_paise' => $revenue,
            'total_discount_paise' => $totalDiscount,
            'total_tax_paise' => $totalTax,
            'cogs_paise' => $cogs,
            'gross_profit_paise' => $grossProfit,
            'gross_margin_percent' => $grossMarginPercent,
            'operating_expenses_paise' => $expenses,
            'staff_costs_paise' => $salaries,
            'net_profit_paise' => $netProfit,
            'net_margin_percent' => $netMarginPercent,
        ];
    }

    /**
     * Generate Cash Flow statement.
     */
    public function cashFlow(string $tenantId, Carbon $start, Carbon $end): array
    {
        // 1. Inflows from sales payments
        $cashInflow = 0;
        $digitalInflow = 0;

        if (Schema::hasTable('sale_payments')) {
            $cashPayments = DB::table('sale_payments')
                ->join('sales', 'sale_payments.sale_id', '=', 'sales.id')
                ->where('sales.tenant_id', $tenantId)
                ->where('sales.status', '!=', 'voided')
                ->whereBetween('sale_payments.created_at', [$start, $end])
                ->where('sale_payments.method', 'cash')
                ->selectRaw('COALESCE(SUM(sale_payments.amount_paise - sale_payments.change_paise), 0) as total')
                ->value('total');

            $cashInflow = (int) $cashPayments;

            $digitalPayments = DB::table('sale_payments')
                ->join('sales', 'sale_payments.sale_id', '=', 'sales.id')
                ->where('sales.tenant_id', $tenantId)
                ->where('sales.status', '!=', 'voided')
                ->whereBetween('sale_payments.created_at', [$start, $end])
                ->where('sale_payments.method', '!=', 'cash')
                ->selectRaw('COALESCE(SUM(sale_payments.amount_paise), 0) as total')
                ->value('total');

            $digitalInflow = (int) $digitalPayments;
        }

        $totalInflows = $cashInflow + $digitalInflow;

        // 2. Outflows
        $purchasesOutflow = 0;
        if (Schema::hasTable('goods_receipt_lines') && Schema::hasTable('goods_receipts')) {
            $purchasesOutflow = (int) DB::table('goods_receipt_lines')
                ->join('goods_receipts', 'goods_receipt_lines.goods_receipt_id', '=', 'goods_receipts.id')
                ->join('purchase_orders', 'goods_receipts.purchase_order_id', '=', 'purchase_orders.id')
                ->where('purchase_orders.tenant_id', $tenantId)
                ->whereBetween('goods_receipts.created_at', [$start, $end])
                ->selectRaw('COALESCE(SUM(goods_receipt_lines.qty * goods_receipt_lines.cost_paise), 0) as total')
                ->value('total');
        } elseif (Schema::hasTable('supplier_ledger_entries')) {
            $purchasesOutflow = (int) DB::table('supplier_ledger_entries')
                ->where('tenant_id', $tenantId)
                ->where('direction', 'debit')
                ->whereBetween('created_at', [$start, $end])
                ->sum('amount_paise');
        }

        $expenses = 0;
        if (Schema::hasTable('expenses')) {
            $expenses = (int) DB::table('expenses')
                ->where('tenant_id', $tenantId)
                ->whereBetween('expense_date', [$start, $end])
                ->sum('amount_paise');
        }

        $salaries = 0;
        if (Schema::hasTable('staff_salaries')) {
            $salaries = (int) DB::table('staff_salaries')
                ->where('tenant_id', $tenantId)
                ->whereBetween('salary_month', [$start, $end])
                ->sum('amount_paise');
        }

        $totalOutflows = $purchasesOutflow + $expenses + $salaries;
        $netCashFlow = $totalInflows - $totalOutflows;

        return [
            'period' => [
                'start' => $start->toIso8601String(),
                'end' => $end->toIso8601String(),
            ],
            'inflows' => [
                'cash_sales_paise' => $cashInflow,
                'digital_sales_paise' => $digitalInflow,
                'total_paise' => $totalInflows,
            ],
            'outflows' => [
                'purchases_paise' => $purchasesOutflow,
                'operating_expenses_paise' => $expenses,
                'staff_salaries_paise' => $salaries,
                'total_paise' => $totalOutflows,
            ],
            'net_cash_flow_paise' => $netCashFlow,
        ];
    }

    /**
     * Generate Balance Sheet snapshot.
     */
    public function balanceSheet(string $tenantId, Carbon $asOfDate): array
    {
        // 1. Assets: Inventory Value
        $inventoryValue = 0;
        if (Schema::hasTable('stock_balances')) {
            $inventoryValue = (int) DB::table('stock_balances')
                ->join('store_items', 'stock_balances.store_item_id', '=', 'store_items.id')
                ->where('store_items.tenant_id', $tenantId)
                ->where('stock_balances.on_hand', '>', 0)
                ->selectRaw('COALESCE(SUM(stock_balances.on_hand * store_items.cost_paise), 0) as total')
                ->value('total');
        }

        // 2. Accounts Receivable (Khata outstanding)
        $receivables = 0;
        if (Schema::hasTable('customer_ledger_entries')) {
            $debits = (int) DB::table('customer_ledger_entries')
                ->where('tenant_id', $tenantId)
                ->where('created_at', '<=', $asOfDate)
                ->where('direction', 'debit')
                ->sum('amount_paise');
            $credits = (int) DB::table('customer_ledger_entries')
                ->where('tenant_id', $tenantId)
                ->where('created_at', '<=', $asOfDate)
                ->where('direction', 'credit')
                ->sum('amount_paise');
            $receivables = max(0, $debits - $credits);
        }

        // 3. Accounts Payable (Suppliers)
        $payables = 0;
        if (Schema::hasTable('supplier_ledger_entries')) {
            $credits = (int) DB::table('supplier_ledger_entries')
                ->where('tenant_id', $tenantId)
                ->where('created_at', '<=', $asOfDate)
                ->where('direction', 'credit')
                ->sum('amount_paise');
            $debits = (int) DB::table('supplier_ledger_entries')
                ->where('tenant_id', $tenantId)
                ->where('created_at', '<=', $asOfDate)
                ->where('direction', 'debit')
                ->sum('amount_paise');
            $payables = max(0, $credits - $debits);
        }

        $totalAssets = $inventoryValue + $receivables;
        $totalLiabilities = $payables;
        $equity = $totalAssets - $totalLiabilities;

        return [
            'as_of_date' => $asOfDate->toIso8601String(),
            'assets' => [
                'inventory_value_paise' => $inventoryValue,
                'accounts_receivable_paise' => $receivables,
                'total_assets_paise' => $totalAssets,
            ],
            'liabilities' => [
                'accounts_payable_paise' => $payables,
                'total_liabilities_paise' => $totalLiabilities,
            ],
            'equity_paise' => $equity,
        ];
    }
}
