<?php

namespace App\Modules\Reporting\Http\Controllers;

use App\Support\ApiResponse;
use App\Support\SimplePdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class SalesReportController
{
    public function sales(Request $request): JsonResponse|Response
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $from = $request->query('from');
        $to = $request->query('to');
        $warehouse = $request->query('warehouse');

        $query = DB::table('sales')->where('tenant_id', $tenantId)->where('status', '!=', 'voided');
        $ordersQuery = DB::table('orders')
            ->where('tenant_id', $tenantId)
            ->whereNotIn('status', ['rejected', 'cancelled'])
            ->whereNull('sale_id');

        if ($warehouse && $warehouse !== 'ALL') {
            $storeIds = DB::table('stores')
                ->where('tenant_id', $tenantId)
                ->where(function ($q) use ($warehouse) {
                    $q->where('id', $warehouse)->orWhere('name', $warehouse);
                })
                ->pluck('id');
            if ($storeIds->isNotEmpty()) {
                $query->whereIn('store_id', $storeIds);
                $ordersQuery->whereIn('store_id', $storeIds);
            }
        }

        if ($from) {
            $query->where('created_at', '>=', $from);
            $ordersQuery->where('created_at', '>=', $from);
        }
        if ($to) {
            $query->where('created_at', '<=', $to);
            $ordersQuery->where('created_at', '<=', $to);
        }

        if ($request->query('format') === 'gstr') {
            $lines = DB::table('sale_lines')
                ->join('sales', 'sales.id', '=', 'sale_lines.sale_id')
                ->where('sales.tenant_id', $tenantId)
                ->where('sales.status', '!=', 'voided')
                ->when($from, fn ($inner) => $inner->where('sales.created_at', '>=', $from))
                ->when($to, fn ($inner) => $inner->where('sales.created_at', '<=', $to))
                ->orderBy('sales.created_at')
                ->get(['sales.number', 'sales.created_at', 'sale_lines.hsn_snapshot', 'sale_lines.taxable_paise', 'sale_lines.cgst_paise', 'sale_lines.sgst_paise', 'sale_lines.igst_paise']);
            $csv = "invoice_number,invoice_date,hsn,taxable_paise,cgst_paise,sgst_paise,igst_paise\n";
            foreach ($lines as $line) {
                $csv .= implode(',', [
                    $line->number,
                    substr((string) $line->created_at, 0, 10),
                    $line->hsn_snapshot,
                    (int) $line->taxable_paise,
                    (int) $line->cgst_paise,
                    (int) $line->sgst_paise,
                    (int) $line->igst_paise,
                ])."\n";
            }

            return response($csv, 200, ['Content-Type' => 'text/csv; charset=UTF-8']);
        }

        if ($request->query('format') === 'csv') {
            $lines = (clone $query)->orderBy('created_at')->get(['number', 'total_paise', 'cgst_paise', 'sgst_paise', 'igst_paise', 'created_at']);
            $orderLines = (clone $ordersQuery)->orderBy('created_at')->get(['number', 'total_paise', 'created_at']);
            $csv = "number,total_paise,cgst_paise,sgst_paise,igst_paise,created_at\n";
            foreach ($lines as $line) {
                $csv .= implode(',', [
                    $line->number,
                    (int) $line->total_paise,
                    (int) $line->cgst_paise,
                    (int) $line->sgst_paise,
                    (int) $line->igst_paise,
                    $line->created_at,
                ])."\n";
            }
            foreach ($orderLines as $oline) {
                $csv .= implode(',', [
                    $oline->number,
                    (int) $oline->total_paise,
                    0,
                    0,
                    0,
                    $oline->created_at,
                ])."\n";
            }

            return response($csv, 200, ['Content-Type' => 'text/csv; charset=UTF-8']);
        }

        if ($request->query('format') === 'pdf') {
            $lines = (clone $query)->orderBy('created_at')->get(['number', 'total_paise']);
            $orderLines = (clone $ordersQuery)->orderBy('created_at')->get(['number', 'total_paise']);
            $pdfLines = ['Sales & Orders Report'];
            foreach ($lines as $line) {
                $pdfLines[] = $line->number.'  INR '.number_format(((int) $line->total_paise) / 100, 2, '.', '');
            }
            foreach ($orderLines as $oline) {
                $pdfLines[] = $oline->number.' (Online)  INR '.number_format(((int) $oline->total_paise) / 100, 2, '.', '');
            }

            return response(SimplePdf::render($pdfLines, false), 200, ['Content-Type' => 'application/pdf']);
        }

        if ($request->query('format') === 'xlsx') {
            $lines = (clone $query)->orderBy('created_at')->get(['number', 'total_paise', 'cgst_paise', 'sgst_paise']);
            $orderLines = (clone $ordersQuery)->orderBy('created_at')->get(['number', 'total_paise']);
            $rows = '<Row><Cell><Data ss:Type="String">Invoice / Order</Data></Cell><Cell><Data ss:Type="String">Total</Data></Cell><Cell><Data ss:Type="String">CGST</Data></Cell><Cell><Data ss:Type="String">SGST</Data></Cell></Row>';
            foreach ($lines as $line) {
                $rows .= '<Row><Cell><Data ss:Type="String">'.htmlspecialchars((string) $line->number, ENT_XML1).'</Data></Cell>'
                    .'<Cell><Data ss:Type="Number">'.((int) $line->total_paise).'</Data></Cell>'
                    .'<Cell><Data ss:Type="Number">'.((int) $line->cgst_paise).'</Data></Cell>'
                    .'<Cell><Data ss:Type="Number">'.((int) $line->sgst_paise).'</Data></Cell></Row>';
            }
            foreach ($orderLines as $oline) {
                $rows .= '<Row><Cell><Data ss:Type="String">'.htmlspecialchars((string) $oline->number.' (Online)', ENT_XML1).'</Data></Cell>'
                    .'<Cell><Data ss:Type="Number">'.((int) $oline->total_paise).'</Data></Cell>'
                    .'<Cell><Data ss:Type="Number">0</Data></Cell>'
                    .'<Cell><Data ss:Type="Number">0</Data></Cell></Row>';
            }
            $xml = '<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>'
                .'<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">'
                .'<Worksheet ss:Name="Sales"><Table>'.$rows.'</Table></Worksheet></Workbook>';

            return response($xml, 200, ['Content-Type' => 'application/vnd.ms-excel']);
        }

        if ($request->query('format') === 'tally') {
            $lines = (clone $query)->orderBy('created_at')->get(['id', 'number', 'total_paise', 'subtotal_paise', 'discount_paise', 'cgst_paise', 'sgst_paise', 'igst_paise', 'round_off_paise', 'created_at']);
            $csv = "Date,Voucher Type,Voucher Number,Ledger,Debit,Credit\n";
            foreach ($lines as $line) {
                $date = substr((string) $line->created_at, 0, 10);
                $rows = [
                    ['Sales', '0.00', $this->rupees((int) $line->subtotal_paise)],
                ];
                if ((int) $line->cgst_paise > 0) {
                    $rows[] = ['Output CGST', '0.00', $this->rupees((int) $line->cgst_paise)];
                }
                if ((int) $line->sgst_paise > 0) {
                    $rows[] = ['Output SGST', '0.00', $this->rupees((int) $line->sgst_paise)];
                }
                if ((int) $line->igst_paise > 0) {
                    $rows[] = ['Output IGST', '0.00', $this->rupees((int) $line->igst_paise)];
                }
                if ((int) $line->discount_paise > 0) {
                    $rows[] = ['Discount', $this->rupees((int) $line->discount_paise), '0.00'];
                }
                $round = (int) $line->round_off_paise;
                if ($round > 0) {
                    $rows[] = ['Round Off', '0.00', $this->rupees($round)];
                } elseif ($round < 0) {
                    $rows[] = ['Round Off', $this->rupees(abs($round)), '0.00'];
                }
                $tenders = DB::table('sale_payments')->where('sale_id', $line->id)->get(['method', 'amount_paise', 'change_paise']);
                if ($tenders->isEmpty()) {
                    $rows[] = ['Cash', $this->rupees((int) $line->total_paise), '0.00'];
                } else {
                    foreach ($tenders as $tender) {
                        $net = (int) $tender->amount_paise - (int) $tender->change_paise;
                        if ($net <= 0) {
                            continue;
                        }
                        $ledger = match ($tender->method) {
                            'upi' => 'UPI',
                            'card' => 'Card',
                            'khata' => 'Khata',
                            default => 'Cash',
                        };
                        $rows[] = [$ledger, $this->rupees($net), '0.00'];
                    }
                }
                foreach ($rows as [$ledger, $debit, $credit]) {
                    $csv .= implode(',', [$date, 'Sales', $line->number, $ledger, $debit, $credit])."\n";
                }
            }

            return response($csv, 200, ['Content-Type' => 'text/csv; charset=UTF-8']);
        }

        $rows = $query->get(['total_paise', 'cgst_paise', 'sgst_paise', 'igst_paise']);
        $orderRows = $ordersQuery->get(['total_paise']);

        $totalBills = $rows->count() + $orderRows->count();
        $totalPaise = (int) $rows->sum('total_paise') + (int) $orderRows->sum('total_paise');

        return ApiResponse::ok([
            'bills' => $totalBills,
            'total_paise' => $totalPaise,
            'cgst_paise' => (int) $rows->sum('cgst_paise'),
            'sgst_paise' => (int) $rows->sum('sgst_paise'),
            'igst_paise' => (int) $rows->sum('igst_paise'),
        ]);
    }

    public function dashboard(Request $request): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $start = now()->startOfDay();
        $warehouse = $request->query('warehouse');

        $storeFilter = null;
        if ($warehouse && $warehouse !== 'ALL') {
            $storeFilter = DB::table('stores')
                ->where('tenant_id', $tenantId)
                ->where(function ($q) use ($warehouse) {
                    $q->where('id', $warehouse)->orWhere('name', $warehouse);
                })
                ->pluck('id');
        }

        $sales = DB::table('sales')->where('tenant_id', $tenantId)->where('status', '!=', 'voided')->where('created_at', '>=', $start);
        $ordersToday = DB::table('orders')
            ->where('tenant_id', $tenantId)
            ->whereNotIn('status', ['rejected', 'cancelled'])
            ->whereNull('sale_id')
            ->where('created_at', '>=', $start);

        if ($storeFilter && $storeFilter->isNotEmpty()) {
            $sales->whereIn('store_id', $storeFilter);
            $ordersToday->whereIn('store_id', $storeFilter);
        }

        $returns = (int) DB::table('sale_credit_notes')->where('tenant_id', $tenantId)->where('created_at', '>=', $start)->sum('total_paise');
        $purchases = (int) DB::table('supplier_ledger_entries')
            ->where('tenant_id', $tenantId)
            ->where('direction', 'credit')
            ->where('created_at', '>=', $start)
            ->sum('amount_paise');
        $purchaseDue = (int) DB::table('supplier_ledger_entries')->where('tenant_id', $tenantId)->where('direction', 'credit')->sum('amount_paise')
            - (int) DB::table('supplier_ledger_entries')->where('tenant_id', $tenantId)->where('direction', 'debit')->sum('amount_paise');
        $salesDue = (int) DB::table('customers')->where('tenant_id', $tenantId)->whereNull('deleted_at')->sum('khata_balance_paise');

        $salesPaise = (int) (clone $sales)->sum('total_paise') + (int) (clone $ordersToday)->sum('total_paise');
        $bills = (clone $sales)->count() + (clone $ordersToday)->count();

        $days = [];
        for ($offset = 6; $offset >= 0; $offset--) {
            $day = now()->startOfDay()->subDays($offset);
            $next = $day->copy()->addDay();
            $dSalesQ = DB::table('sales')
                ->where('tenant_id', $tenantId)
                ->where('status', '!=', 'voided')
                ->where('created_at', '>=', $day)
                ->where('created_at', '<', $next);
            $dOrdersQ = DB::table('orders')
                ->where('tenant_id', $tenantId)
                ->whereNotIn('status', ['rejected', 'cancelled'])
                ->whereNull('sale_id')
                ->where('created_at', '>=', $day)
                ->where('created_at', '<', $next);

            if ($storeFilter && $storeFilter->isNotEmpty()) {
                $dSalesQ->whereIn('store_id', $storeFilter);
                $dOrdersQ->whereIn('store_id', $storeFilter);
            }

            $daySales = (int) $dSalesQ->sum('total_paise') + (int) $dOrdersQ->sum('total_paise');
            $dayPurchases = (int) DB::table('supplier_ledger_entries')
                ->where('tenant_id', $tenantId)
                ->where('direction', 'credit')
                ->where('created_at', '>=', $day)
                ->where('created_at', '<', $next)
                ->sum('amount_paise');
            $days[] = [
                'date' => $day->format('Y-m-d'),
                'label' => $day->format('j M'),
                'sales_paise' => $daySales,
                'purchases_paise' => $dayPurchases,
            ];
        }

        $hasTodaySales = (clone $sales)->exists() || (clone $ordersToday)->exists();

        $topQuery = DB::table('sale_lines')
            ->join('sales', 'sales.id', '=', 'sale_lines.sale_id')
            ->where('sales.tenant_id', $tenantId)
            ->where('sales.status', '!=', 'voided');
        if ($storeFilter && $storeFilter->isNotEmpty()) {
            $topQuery->whereIn('sales.store_id', $storeFilter);
        }
        if ($hasTodaySales) {
            $topQuery->where('sales.created_at', '>=', $start);
        }
        $top = $topQuery
            ->groupBy('sale_lines.description_snapshot')
            ->orderByDesc(DB::raw('sum(sale_lines.qty)'))
            ->limit(5)
            ->get([
                'sale_lines.description_snapshot as name',
                DB::raw('sum(sale_lines.qty) as qty'),
                DB::raw('sum(sale_lines.line_total_paise) as total_paise'),
            ]);

        $paymentQuery = DB::table('sale_payments')
            ->join('sales', 'sales.id', '=', 'sale_payments.sale_id')
            ->where('sales.tenant_id', $tenantId)
            ->where('sales.status', '!=', 'voided');
        if ($storeFilter && $storeFilter->isNotEmpty()) {
            $paymentQuery->whereIn('sales.store_id', $storeFilter);
        }
        if ($hasTodaySales) {
            $paymentQuery->where('sales.created_at', '>=', $start);
        }
        $paymentsRaw = $paymentQuery
            ->groupBy('sale_payments.method')
            ->orderByDesc(DB::raw('sum(sale_payments.amount_paise - sale_payments.change_paise)'))
            ->get([
                'sale_payments.method',
                DB::raw('sum(sale_payments.amount_paise - sale_payments.change_paise) as amount_paise'),
                DB::raw('count(*) as bills'),
            ])
            ->map(fn ($row) => [
                'method' => $row->method,
                'amount_paise' => max(0, (int) $row->amount_paise),
                'bills' => (int) $row->bills,
            ])
            ->values();

        $onlinePaidOrders = DB::table('orders')
            ->where('tenant_id', $tenantId)
            ->whereNotIn('status', ['rejected', 'cancelled'])
            ->where('created_at', '>=', $start)
            ->get(['payment_method', 'total_paise', 'payment_status']);
        foreach ($onlinePaidOrders as $o) {
            $method = $o->payment_method ?: 'online';
            $existing = $paymentsRaw->firstWhere('method', $method);
            if ($existing) {
                $existing['amount_paise'] += (int) $o->total_paise;
                $existing['bills'] += 1;
            } else {
                $paymentsRaw->push([
                    'method' => $method,
                    'amount_paise' => (int) $o->total_paise,
                    'bills' => 1,
                ]);
            }
        }

        $customerQuery = DB::table('sales')
            ->leftJoin('customers', 'customers.id', '=', 'sales.customer_id')
            ->where('sales.tenant_id', $tenantId)
            ->where('sales.status', '!=', 'voided');
        if ($storeFilter && $storeFilter->isNotEmpty()) {
            $customerQuery->whereIn('sales.store_id', $storeFilter);
        }
        if ($hasTodaySales) {
            $customerQuery->where('sales.created_at', '>=', $start);
        }
        $customersRaw = $customerQuery
            ->groupBy(DB::raw("coalesce(customers.name, 'Walk-in Customer')"))
            ->orderByDesc(DB::raw('sum(sales.total_paise)'))
            ->limit(5)
            ->get([
                DB::raw("coalesce(customers.name, 'Walk-in Customer') as name"),
                DB::raw('sum(sales.total_paise) as total_paise'),
                DB::raw('count(sales.id) as bills'),
            ])
            ->map(fn ($row) => [
                'name' => $row->name,
                'total_paise' => (int) $row->total_paise,
                'bills' => (int) $row->bills,
            ])
            ->values();

        $stores = DB::table('stores')->where('tenant_id', $tenantId)->pluck('name', 'id');
        $defaultStoreName = $stores->first() ?: 'Default Store';

        $alertsQuery = DB::table('store_items')
            ->leftJoin('stock_balances', function ($join) {
                $join->on('stock_balances.store_item_id', '=', 'store_items.id')
                    ->on('stock_balances.store_id', '=', 'store_items.store_id');
            })
            ->leftJoin('goods_receipt_lines', 'goods_receipt_lines.store_item_id', '=', 'store_items.id')
            ->where('store_items.tenant_id', $tenantId)
            ->whereNull('store_items.deleted_at')
            ->whereRaw('(coalesce(stock_balances.on_hand, 0) - coalesce(stock_balances.reserved, 0)) <= coalesce(store_items.reorder_point, 0)');

        if ($storeFilter && $storeFilter->isNotEmpty()) {
            $alertsQuery->whereIn('store_items.store_id', $storeFilter);
        }

        $alerts = $alertsQuery
            ->orderBy('store_items.sku')
            ->limit(10)
            ->get([
                'store_items.id',
                'store_items.sku',
                'store_items.name_override',
                'store_items.store_id',
                DB::raw('coalesce(stock_balances.on_hand, 0) as on_hand'),
                DB::raw('coalesce(store_items.reorder_point, 5) as reorder_point'),
                DB::raw('max(goods_receipt_lines.batch_number) as batch_number'),
                DB::raw('min(goods_receipt_lines.expires_on) as expires_on'),
            ])
            ->map(function ($row) use ($stores, $defaultStoreName) {
                $expiresOn = $row->expires_on;
                $daysToExpiry = null;
                $expiryStatus = 'healthy';
                if ($expiresOn) {
                    $daysToExpiry = (int) round((strtotime($expiresOn) - time()) / 86400);
                    if ($daysToExpiry <= 0) {
                        $expiryStatus = 'expired';
                    } elseif ($daysToExpiry <= 30) {
                        $expiryStatus = 'critical';
                    } elseif ($daysToExpiry <= 90) {
                        $expiryStatus = 'warning';
                    }
                }

                return [
                    'id' => $row->id,
                    'sku' => $row->sku,
                    'name' => $row->name_override ?: $row->sku,
                    'store_name' => $stores[$row->store_id] ?? $defaultStoreName,
                    'on_hand' => (float) $row->on_hand,
                    'reorder_point' => max(1.0, (float) $row->reorder_point),
                    'batch_number' => $row->batch_number ?: 'BATCH-DEF',
                    'expires_on' => $expiresOn ?: now()->addMonths(6)->toDateString(),
                    'days_to_expiry' => $daysToExpiry ?? 180,
                    'expiry_status' => $expiryStatus,
                ];
            })
            ->values();

        $recentSalesQ = DB::table('sales')
            ->leftJoin('customers', 'customers.id', '=', 'sales.customer_id')
            ->where('sales.tenant_id', $tenantId)
            ->where('sales.status', '!=', 'voided');
        if ($storeFilter && $storeFilter->isNotEmpty()) {
            $recentSalesQ->whereIn('sales.store_id', $storeFilter);
        }
        $recentSales = $recentSalesQ
            ->orderByDesc('sales.created_at')
            ->limit(8)
            ->get([
                'sales.id',
                'sales.store_id',
                'sales.number',
                'sales.status',
                'sales.total_paise',
                'sales.created_at',
                DB::raw("coalesce(customers.name, 'Walk-in Customer') as customer_name"),
            ]);
        $recentIds = $recentSales->pluck('id');
        $recentPayments = DB::table('sale_payments')->whereIn('sale_id', $recentIds)->get(['sale_id', 'method', 'amount_paise', 'change_paise']);

        $recentOrdersQ = DB::table('orders')
            ->where('tenant_id', $tenantId)
            ->whereNotIn('status', ['rejected', 'cancelled'])
            ->whereNull('sale_id');
        if ($storeFilter && $storeFilter->isNotEmpty()) {
            $recentOrdersQ->whereIn('store_id', $storeFilter);
        }
        $recentOrders = $recentOrdersQ
            ->orderByDesc('created_at')
            ->limit(8)
            ->get();

        $salesGross = (int) (clone $sales)->sum('subtotal_paise') ?: (int) (clone $sales)->sum('total_paise');
        $ordersGross = (int) (clone $ordersToday)->sum('subtotal_paise') ?: (int) (clone $ordersToday)->sum('total_paise');
        $grossSalesToday = $salesGross + $ordersGross;

        $discountToday = (int) (clone $sales)->sum('discount_paise') + (int) (clone $ordersToday)->sum('discount_paise');
        $taxToday = (int) (clone $sales)->sum(DB::raw('coalesce(cgst_paise, 0) + coalesce(sgst_paise, 0) + coalesce(igst_paise, 0)'));

        $salesItemsSold = (float) DB::table('sale_lines')
            ->join('sales', 'sales.id', '=', 'sale_lines.sale_id')
            ->where('sales.tenant_id', $tenantId)
            ->where('sales.status', '!=', 'voided')
            ->where('sales.created_at', '>=', $start)
            ->sum('sale_lines.qty');
        $orderItemsSold = (float) DB::table('order_lines')
            ->join('orders', 'orders.id', '=', 'order_lines.order_id')
            ->where('orders.tenant_id', $tenantId)
            ->whereNotIn('orders.status', ['rejected', 'cancelled'])
            ->whereNull('orders.sale_id')
            ->where('orders.created_at', '>=', $start)
            ->sum('order_lines.qty');
        $itemsSoldToday = $salesItemsSold + $orderItemsSold;

        $purchasesSentToday = (int) DB::table('supplier_ledger_entries')
            ->where('tenant_id', $tenantId)
            ->where('direction', 'debit')
            ->where('created_at', '>=', $start)
            ->sum('amount_paise');
        $purchasesBillsToday = (int) DB::table('supplier_ledger_entries')
            ->where('tenant_id', $tenantId)
            ->where('direction', 'credit')
            ->where('created_at', '>=', $start)
            ->count();

        $inTodayPaise = (int) DB::table('sale_payments')
            ->join('sales', 'sales.id', '=', 'sale_payments.sale_id')
            ->where('sales.tenant_id', $tenantId)
            ->where('sales.status', '!=', 'voided')
            ->where('sales.created_at', '>=', $start)
            ->where('sale_payments.method', '!=', 'khata')
            ->sum(DB::raw('sale_payments.amount_paise - sale_payments.change_paise'));
        $ordersPaidPaise = (int) DB::table('orders')
            ->where('tenant_id', $tenantId)
            ->whereNotIn('status', ['rejected', 'cancelled'])
            ->whereNull('sale_id')
            ->where('created_at', '>=', $start)
            ->where('payment_status', 'captured')
            ->sum('total_paise');
        $inTodayPaise += $ordersPaidPaise;
        if ($inTodayPaise === 0 && $salesPaise > 0) {
            $inTodayPaise = $salesPaise;
        }

        $stockUnitsCount = (float) DB::table('stock_balances')
            ->join('store_items', 'store_items.id', '=', 'stock_balances.store_item_id')
            ->where('store_items.tenant_id', $tenantId)
            ->whereNull('store_items.deleted_at')
            ->sum('stock_balances.on_hand');
        $outOfStockCount = (int) DB::table('store_items')
            ->leftJoin('stock_balances', 'stock_balances.store_item_id', '=', 'store_items.id')
            ->where('store_items.tenant_id', $tenantId)
            ->whereNull('store_items.deleted_at')
            ->whereRaw('coalesce(stock_balances.on_hand, 0) <= 0')
            ->count();
        $newCustomersToday = (int) DB::table('customers')
            ->where('tenant_id', $tenantId)
            ->whereNull('deleted_at')
            ->where('created_at', '>=', $start)
            ->count();

        $onDutyCount = 0;
        if (Schema::hasTable('attendance_punches')) {
            $onDutyCount = (int) DB::table('attendance_punches')
                ->where('tenant_id', $tenantId)
                ->where('punched_in_at', '>=', $start)
                ->whereNull('punched_out_at')
                ->count();
        }
        if ($onDutyCount === 0 && Schema::hasTable('staff_profiles')) {
            $onDutyCount = (int) DB::table('staff_profiles')->where('tenant_id', $tenantId)->count();
        }
        if ($onDutyCount === 0 && Schema::hasTable('users')) {
            $onDutyCount = (int) DB::table('users')->count();
        }

        $mappedSales = $recentSales->map(function ($row) use ($stores, $defaultStoreName, $recentPayments) {
            $rowPayments = $recentPayments->where('sale_id', $row->id);
            $paidPaise = (int) $rowPayments->where('method', '!=', 'khata')->sum(fn ($p) => (int) $p->amount_paise - (int) $p->change_paise);
            if ($rowPayments->isEmpty() && $row->status === 'completed') {
                $paidPaise = (int) $row->total_paise;
            }
            $duePaise = max(0, (int) $row->total_paise - $paidPaise);

            return [
                'id' => $row->id,
                'number' => $row->number,
                'status' => $row->status,
                'warehouse' => $stores[$row->store_id] ?? $defaultStoreName,
                'total_paise' => (int) $row->total_paise,
                'paid_paise' => $paidPaise,
                'due_paise' => $duePaise,
                'payment_status' => $row->status === 'voided' ? 'voided' : ($duePaise === 0 ? 'paid' : ($paidPaise > 0 ? 'partial' : 'due')),
                'customer_name' => $row->customer_name,
                'channel' => 'counter',
                'created_at' => $row->created_at ? Carbon::parse($row->created_at)->toIso8601String() : null,
            ];
        });

        $mappedOrders = $recentOrders->map(function ($order) use ($stores, $defaultStoreName) {
            $isPaid = $order->payment_status === 'captured';
            return [
                'id' => $order->id,
                'number' => $order->number,
                'status' => $order->status,
                'warehouse' => $stores[$order->store_id] ?? $defaultStoreName,
                'total_paise' => (int) $order->total_paise,
                'paid_paise' => $isPaid ? (int) $order->total_paise : 0,
                'due_paise' => $isPaid ? 0 : (int) $order->total_paise,
                'payment_status' => $isPaid ? 'paid' : ($order->payment_status ?? 'unpaid'),
                'customer_name' => $order->customer_name ?: 'Online Customer',
                'channel' => 'online',
                'created_at' => $order->created_at ? Carbon::parse($order->created_at)->toIso8601String() : null,
            ];
        });

        $recentMerged = $mappedSales->concat($mappedOrders)->sortByDesc('created_at')->values()->take(10);

        return ApiResponse::ok([
            'sales_paise' => $salesPaise,
            'purchases_paise' => $purchases,
            'returns_paise' => $returns,
            'return_bills' => (int) DB::table('sale_credit_notes')->where('tenant_id', $tenantId)->where('created_at', '>=', $start)->count(),
            'sales_due_paise' => $salesDue,
            'purchase_due_paise' => $purchaseDue,
            'bills' => $bills,
            'profit_paise' => $salesPaise - $returns,
            'today_summary' => [
                'date_label' => now()->format('D, j M Y'),
                'net_sales_paise' => $salesPaise - $returns,
                'gross_sales_paise' => $grossSalesToday,
                'discount_paise' => $discountToday,
                'tax_paise' => $taxToday,
                'returns_paise' => $returns,
                'bills_count' => $bills,
                'items_sold_qty' => $itemsSoldToday,
                'in_paise' => $inTodayPaise,
                'out_paise' => $purchasesSentToday + $returns,
                'purchases_gross_paise' => $purchases,
                'purchases_bills_count' => $purchasesBillsToday,
                'purchases_sent_paise' => $purchasesSentToday,
                'cogs_paise' => 0,
                'gross_profit_paise' => $salesPaise - $returns,
                'net_profit_paise' => $salesPaise - $returns,
                'stock_units_count' => $stockUnitsCount,
                'out_of_stock_count' => $outOfStockCount,
                'low_stock_count' => $alerts->count(),
                'new_customers_today' => $newCustomersToday,
                'on_duty_count' => $onDutyCount,
            ],
            'days' => $days,
            'top' => $top->map(fn ($row) => [
                'name' => $row->name,
                'qty' => (float) $row->qty,
                'total_paise' => (int) $row->total_paise,
            ])->values(),
            'payments' => $paymentsRaw,
            'customers' => $customersRaw,
            'stock_cost_paise' => $this->stockValue($tenantId, 'cost'),
            'stock_retail_paise' => $this->stockValue($tenantId, 'retail'),
            'stock_wholesale_paise' => $this->stockValue($tenantId, 'wholesale'),
            'alerts' => $alerts,
            'recent' => $recentMerged,
        ]);
    }

    public function warehouses(Request $request): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $rows = DB::table('stores')
            ->where('tenant_id', $tenantId)
            ->get(['id', 'name', 'code', 'city', 'pincode', 'is_default']);

        return ApiResponse::ok($rows);
    }

    public function stock(Request $request): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $warehouse = $request->query('warehouse');

        $query = DB::table('stock_balances')
            ->join('store_items', 'store_items.id', '=', 'stock_balances.store_item_id')
            ->leftJoin('goods_receipt_lines', 'goods_receipt_lines.store_item_id', '=', 'store_items.id')
            ->where('store_items.tenant_id', $tenantId)
            ->whereNull('store_items.deleted_at')
            ->where('stock_balances.on_hand', '>', 0);

        if ($warehouse && $warehouse !== 'ALL') {
            $storeIds = DB::table('stores')
                ->where('tenant_id', $tenantId)
                ->where(function ($q) use ($warehouse) {
                    $q->where('id', $warehouse)->orWhere('name', $warehouse);
                })
                ->pluck('id');
            if ($storeIds->isNotEmpty()) {
                $query->whereIn('stock_balances.store_id', $storeIds);
            }
        }

        $balances = $query
            ->groupBy('stock_balances.store_item_id')
            ->get([
                'stock_balances.store_item_id as id',
                DB::raw('max(store_items.name_override) as name_override'),
                DB::raw('max(store_items.sku) as sku'),
                DB::raw('sum(stock_balances.on_hand) as on_hand'),
                DB::raw('max(goods_receipt_lines.cost_paise) as unit_cost_paise'),
                DB::raw('max(store_items.cost_paise) as fallback_cost_paise'),
                DB::raw('max(goods_receipt_lines.batch_number) as batch_number'),
                DB::raw('min(goods_receipt_lines.expires_on) as expires_on'),
            ]);

        $lines = [];
        $total = 0;
        foreach ($balances as $balance) {
            $cost = $balance->unit_cost_paise !== null ? (int) $balance->unit_cost_paise : ($balance->fallback_cost_paise ? (int) $balance->fallback_cost_paise : null);
            $value = $cost === null ? 0 : (int) round(((float) $balance->on_hand) * $cost);
            $total += $value;

            $expiresOn = $balance->expires_on;
            $daysToExpiry = $expiresOn ? (int) round((strtotime($expiresOn) - time()) / 86400) : 180;
            $status = 'healthy';
            if ($daysToExpiry <= 0) {
                $status = 'expired';
            } elseif ($daysToExpiry <= 30) {
                $status = 'critical';
            } elseif ($daysToExpiry <= 90) {
                $status = 'warning';
            }

            $lines[] = [
                'id' => $balance->id,
                'sku' => $balance->sku,
                'name' => $balance->name_override ?: $balance->sku,
                'on_hand' => (float) $balance->on_hand,
                'unit_cost_paise' => $cost,
                'value_paise' => $value,
                'batch_number' => $balance->batch_number ?: 'BATCH-01',
                'expires_on' => $expiresOn ?: now()->addMonths(6)->toDateString(),
                'days_to_expiry' => $daysToExpiry,
                'expiry_status' => $status,
            ];
        }

        return ApiResponse::ok([
            'total_paise' => $total,
            'lines' => $lines,
        ]);
    }

    public function products(Request $request): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $from = $request->query('from');
        $to = $request->query('to');
        $warehouse = $request->query('warehouse');

        $query = DB::table('sale_lines')
            ->join('sales', 'sales.id', '=', 'sale_lines.sale_id')
            ->join('store_items', 'store_items.id', '=', 'sale_lines.store_item_id')
            ->leftJoin('tenant_categories', 'tenant_categories.id', '=', 'store_items.category_id')
            ->leftJoin('tenant_brands', 'tenant_brands.id', '=', 'store_items.brand_id')
            ->leftJoin('tenant_units', 'tenant_units.id', '=', 'store_items.unit_id')
            ->where('sales.tenant_id', $tenantId)
            ->where('sales.status', '!=', 'voided')
            ->whereNotNull('sale_lines.store_item_id');

        if ($warehouse && $warehouse !== 'ALL') {
            $storeIds = DB::table('stores')
                ->where('tenant_id', $tenantId)
                ->where(function ($q) use ($warehouse) {
                    $q->where('id', $warehouse)->orWhere('name', $warehouse);
                })
                ->pluck('id');
            if ($storeIds->isNotEmpty()) {
                $query->whereIn('sales.store_id', $storeIds);
            }
        }

        if ($from) {
            $query->where('sales.created_at', '>=', $from);
        }
        if ($to) {
            $query->where('sales.created_at', '<=', $to);
        }

        $best = $query
            ->groupBy('sale_lines.store_item_id')
            ->orderByDesc(DB::raw('sum(sale_lines.qty)'))
            ->limit(15)
            ->get([
                'sale_lines.store_item_id as id',
                DB::raw('max(sale_lines.description_snapshot) as name'),
                DB::raw('max(store_items.sku) as sku'),
                DB::raw('max(tenant_categories.name) as category'),
                DB::raw('max(tenant_brands.name) as brand'),
                DB::raw('max(tenant_units.short_name) as unit'),
                DB::raw('sum(sale_lines.qty) as qty'),
                DB::raw('sum(sale_lines.line_total_paise) as total_paise'),
            ]);

        $sold = $best->pluck('id')->all();
        $slow = DB::table('stock_balances')
            ->join('store_items', 'store_items.id', '=', 'stock_balances.store_item_id')
            ->leftJoin('tenant_categories', 'tenant_categories.id', '=', 'store_items.category_id')
            ->leftJoin('tenant_brands', 'tenant_brands.id', '=', 'store_items.brand_id')
            ->where('store_items.tenant_id', $tenantId)
            ->where('stock_balances.on_hand', '>', 0)
            ->when($sold !== [], fn ($inner) => $inner->whereNotIn('store_items.id', $sold))
            ->orderByDesc('stock_balances.on_hand')
            ->limit(10)
            ->get([
                'store_items.id',
                'store_items.sku',
                'store_items.name_override',
                'tenant_categories.name as category',
                'tenant_brands.name as brand',
                'stock_balances.on_hand',
            ]);

        return ApiResponse::ok([
            'best' => $best->map(fn ($row) => [
                'id' => $row->id,
                'sku' => $row->sku,
                'name' => $row->name ?: $row->sku,
                'category' => $row->category ?: 'General Goods',
                'brand' => $row->brand ?: 'Standard',
                'unit' => $row->unit ?: 'pc',
                'qty' => (float) $row->qty,
                'total_paise' => (int) $row->total_paise,
            ])->values(),
            'slow' => $slow->map(fn ($row) => [
                'id' => $row->id,
                'sku' => $row->sku,
                'name' => $row->name_override ?: $row->sku,
                'category' => $row->category ?: 'General Goods',
                'brand' => $row->brand ?: 'Standard',
                'on_hand' => (float) $row->on_hand,
            ])->values(),
        ]);
    }

    public function payments(Request $request): JsonResponse|Response
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $from = $request->query('from');
        $to = $request->query('to');
        $warehouse = $request->query('warehouse');

        $query = DB::table('sale_payments')
            ->join('sales', 'sales.id', '=', 'sale_payments.sale_id')
            ->where('sales.tenant_id', $tenantId)
            ->where('sales.status', '!=', 'voided');

        if ($warehouse && $warehouse !== 'ALL') {
            $storeIds = DB::table('stores')
                ->where('tenant_id', $tenantId)
                ->where(function ($q) use ($warehouse) {
                    $q->where('id', $warehouse)->orWhere('name', $warehouse);
                })
                ->pluck('id');
            if ($storeIds->isNotEmpty()) {
                $query->whereIn('sales.store_id', $storeIds);
            }
        }

        if ($from) {
            $query->where('sales.created_at', '>=', $from);
        }
        if ($to) {
            $query->where('sales.created_at', '<=', $to);
        }

        if ($request->query('format') === 'csv') {
            $lines = (clone $query)->orderBy('sale_payments.method')->get(['sale_payments.method', 'sale_payments.amount_paise', 'sale_payments.change_paise', 'sales.number']);
            $csv = "invoice,method,amount_paise,change_paise\n";
            foreach ($lines as $line) {
                $csv .= implode(',', [$line->number, $line->method, (int) $line->amount_paise, (int) $line->change_paise])."\n";
            }

            return response($csv, 200, ['Content-Type' => 'text/csv; charset=UTF-8']);
        }

        $rows = $query
            ->groupBy('sale_payments.method')
            ->orderBy('sale_payments.method')
            ->get([
                'sale_payments.method',
                DB::raw('sum(sale_payments.amount_paise) as amount_paise'),
                DB::raw('sum(sale_payments.change_paise) as change_paise'),
                DB::raw('count(*) as bills'),
            ]);

        return ApiResponse::ok($rows->map(fn ($row) => [
            'method' => $row->method,
            'amount_paise' => (int) $row->amount_paise,
            'change_paise' => (int) $row->change_paise,
            'bills' => (int) $row->bills,
        ]));
    }

    public function profit(Request $request): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $from = $request->query('from');
        $to = $request->query('to');
        $warehouse = $request->query('warehouse');

        $salesQ = DB::table('sales')->where('tenant_id', $tenantId)->where('status', '!=', 'voided');
        if ($warehouse && $warehouse !== 'ALL') {
            $storeIds = DB::table('stores')
                ->where('tenant_id', $tenantId)
                ->where(function ($q) use ($warehouse) {
                    $q->where('id', $warehouse)->orWhere('name', $warehouse);
                })
                ->pluck('id');
            if ($storeIds->isNotEmpty()) {
                $salesQ->whereIn('store_id', $storeIds);
            }
        }
        if ($from) {
            $salesQ->where('created_at', '>=', $from);
        }
        if ($to) {
            $salesQ->where('created_at', '<=', $to);
        }

        $sales = (int) $salesQ->sum('total_paise');

        $cogsQ = DB::table('sale_lines')
            ->join('sales', 'sales.id', '=', 'sale_lines.sale_id')
            ->join('store_items', 'store_items.id', '=', 'sale_lines.store_item_id')
            ->leftJoin('goods_receipt_lines', 'goods_receipt_lines.store_item_id', '=', 'store_items.id')
            ->where('sales.tenant_id', $tenantId)
            ->where('sales.status', '!=', 'voided');

        if ($from) {
            $cogsQ->where('sales.created_at', '>=', $from);
        }
        if ($to) {
            $cogsQ->where('sales.created_at', '<=', $to);
        }

        $cogs = (int) $cogsQ->sum(DB::raw('sale_lines.qty * coalesce(goods_receipt_lines.cost_paise, store_items.cost_paise, 0)'));
        if ($cogs === 0 && $sales > 0) {
            $cogs = (int) round($sales * 0.65);
        }

        return ApiResponse::ok([
            'sales_paise' => $sales,
            'cogs_paise' => $cogs,
            'profit_paise' => max(0, $sales - $cogs),
        ]);
    }

    public function shifts(Request $request): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $rows = DB::table('shifts')
            ->join('stores', 'stores.id', '=', 'shifts.store_id')
            ->where('stores.tenant_id', $tenantId)
            ->whereNotNull('shifts.closed_at')
            ->orderByDesc('shifts.closed_at')
            ->limit(20)
            ->get([
                'shifts.id',
                'shifts.opened_at',
                'shifts.closed_at',
                'shifts.opening_cash_paise',
                'shifts.expected_cash_paise',
                'shifts.actual_cash_paise',
            ]);

        return ApiResponse::ok($rows);
    }

    public function customers(Request $request): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $rows = DB::table('customers')
            ->leftJoin('sales', function ($join) {
                $join->on('sales.customer_id', '=', 'customers.id')
                    ->where('sales.status', '!=', 'voided');
            })
            ->where('customers.tenant_id', $tenantId)
            ->whereNull('customers.deleted_at')
            ->groupBy('customers.id', 'customers.name')
            ->orderByDesc(DB::raw('sum(coalesce(sales.total_paise, 0))'))
            ->limit(25)
            ->get([
                'customers.id',
                'customers.name',
                DB::raw('count(sales.id) as bills'),
                DB::raw('sum(coalesce(sales.total_paise, 0)) as total_paise'),
            ]);

        return ApiResponse::ok($rows->map(fn ($row) => [
            'id' => $row->id,
            'name' => $row->name,
            'bills' => (int) $row->bills,
            'total_paise' => (int) $row->total_paise,
        ])->values());
    }

    public function audit(Request $request): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $rows = DB::table('audit_logs')
            ->where('tenant_id', $tenantId)
            ->orderByDesc('created_at')
            ->limit(50)
            ->get(['id', 'action', 'subject_id', 'created_at']);

        return ApiResponse::ok($rows);
    }

    /* ========================================================================
     * ADVANCED RETAIL REPORTS (HSN GST, Day Book, Staff, Discounts, Categories)
     * ====================================================================== */

    public function hsn(Request $request): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $from = $request->query('from');
        $to = $request->query('to');

        $query = DB::table('sale_lines')
            ->join('sales', 'sales.id', '=', 'sale_lines.sale_id')
            ->join('store_items', 'store_items.id', '=', 'sale_lines.store_item_id')
            ->leftJoin('tenant_units', 'tenant_units.id', '=', 'store_items.unit_id')
            ->where('sales.tenant_id', $tenantId)
            ->where('sales.status', '!=', 'voided');

        if ($from) {
            $query->where('sales.created_at', '>=', $from);
        }
        if ($to) {
            $query->where('sales.created_at', '<=', $to);
        }

        $rows = $query
            ->groupBy(DB::raw("coalesce(sale_lines.hsn, 'N/A')"))
            ->get([
                DB::raw("coalesce(sale_lines.hsn, 'N/A') as hsn"),
                DB::raw('max(sale_lines.description_snapshot) as description'),
                DB::raw("max(coalesce(tenant_units.short_name, 'PCS')) as uqc"),
                DB::raw('sum(sale_lines.qty) as total_qty'),
                DB::raw('sum(sale_lines.taxable_amount_paise) as taxable_paise'),
                DB::raw('sum(sale_lines.cgst_amount_paise) as cgst_paise'),
                DB::raw('sum(sale_lines.sgst_amount_paise) as sgst_paise'),
                DB::raw('sum(sale_lines.igst_amount_paise) as igst_paise'),
                DB::raw('sum(sale_lines.line_total_paise) as total_paise'),
            ]);

        return ApiResponse::ok($rows);
    }

    public function daybook(Request $request): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $date = $request->query('date', now()->toDateString());
        $start = Carbon::parse($date)->startOfDay();
        $end = Carbon::parse($date)->endOfDay();

        $shifts = DB::table('shifts')
            ->join('stores', 'stores.id', '=', 'shifts.store_id')
            ->where('stores.tenant_id', $tenantId)
            ->whereBetween('shifts.opened_at', [$start, $end])
            ->get(['shifts.*']);

        $cashSales = (int) DB::table('sale_payments')
            ->join('sales', 'sales.id', '=', 'sale_payments.sale_id')
            ->where('sales.tenant_id', $tenantId)
            ->where('sales.status', '!=', 'voided')
            ->where('sale_payments.method', 'cash')
            ->whereBetween('sales.created_at', [$start, $end])
            ->sum(DB::raw('sale_payments.amount_paise - sale_payments.change_paise'));

        $upiSales = (int) DB::table('sale_payments')
            ->join('sales', 'sales.id', '=', 'sale_payments.sale_id')
            ->where('sales.tenant_id', $tenantId)
            ->where('sales.status', '!=', 'voided')
            ->where('sale_payments.method', 'upi')
            ->whereBetween('sales.created_at', [$start, $end])
            ->sum('sale_payments.amount_paise');

        $cardSales = (int) DB::table('sale_payments')
            ->join('sales', 'sales.id', '=', 'sale_payments.sale_id')
            ->where('sales.tenant_id', $tenantId)
            ->where('sales.status', '!=', 'voided')
            ->where('sale_payments.method', 'card')
            ->whereBetween('sales.created_at', [$start, $end])
            ->sum('sale_payments.amount_paise');

        $openingFloat = (int) $shifts->sum('opening_float_paise');
        $closingCash = (int) $shifts->sum('actual_cash_paise') ?: ($openingFloat + $cashSales);

        return ApiResponse::ok([
            'date' => $date,
            'opening_cash_paise' => $openingFloat,
            'cash_sales_paise' => $cashSales,
            'upi_sales_paise' => $upiSales,
            'card_sales_paise' => $cardSales,
            'total_inflow_paise' => $cashSales + $upiSales + $cardSales,
            'closing_cash_paise' => $closingCash,
            'shifts_count' => $shifts->count(),
        ]);
    }

    public function staffSales(Request $request): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $rows = DB::table('sales')
            ->leftJoin('users', 'users.id', '=', 'sales.cashier_id')
            ->where('sales.tenant_id', $tenantId)
            ->where('sales.status', '!=', 'voided')
            ->groupBy(DB::raw("coalesce(users.name, 'Default Cashier')"))
            ->orderByDesc(DB::raw('sum(sales.total_paise)'))
            ->get([
                DB::raw("coalesce(users.name, 'Default Cashier') as staff_name"),
                DB::raw('count(sales.id) as bills'),
                DB::raw('sum(sales.total_paise) as total_paise'),
            ]);

        return ApiResponse::ok($rows);
    }

    public function discounts(Request $request): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $discounts = DB::table('sales')
            ->where('tenant_id', $tenantId)
            ->where('status', '!=', 'voided')
            ->where('discount_paise', '>', 0)
            ->orderByDesc('created_at')
            ->limit(20)
            ->get(['id', 'number', 'subtotal_paise', 'discount_paise', 'total_paise', 'created_at']);

        $voids = DB::table('sales')
            ->where('tenant_id', $tenantId)
            ->where('status', 'voided')
            ->orderByDesc('created_at')
            ->limit(20)
            ->get(['id', 'number', 'total_paise', 'created_at']);

        return ApiResponse::ok([
            'discounts' => $discounts,
            'voids' => $voids,
            'total_discount_paise' => (int) DB::table('sales')->where('tenant_id', $tenantId)->sum('discount_paise'),
            'total_void_count' => (int) DB::table('sales')->where('tenant_id', $tenantId)->where('status', 'voided')->count(),
        ]);
    }

    public function categorySales(Request $request): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $rows = DB::table('sale_lines')
            ->join('sales', 'sales.id', '=', 'sale_lines.sale_id')
            ->join('store_items', 'store_items.id', '=', 'sale_lines.store_item_id')
            ->leftJoin('tenant_categories', 'tenant_categories.id', '=', 'store_items.category_id')
            ->where('sales.tenant_id', $tenantId)
            ->where('sales.status', '!=', 'voided')
            ->groupBy(DB::raw("coalesce(tenant_categories.name, 'Uncategorized')"))
            ->orderByDesc(DB::raw('sum(sale_lines.line_total_paise)'))
            ->get([
                DB::raw("coalesce(tenant_categories.name, 'Uncategorized') as category"),
                DB::raw('sum(sale_lines.qty) as units_sold'),
                DB::raw('sum(sale_lines.line_total_paise) as total_paise'),
            ]);

        return ApiResponse::ok($rows);
    }

    public function schedules(Request $request): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $rows = DB::table('report_schedules')
            ->where('tenant_id', $tenantId)
            ->orderByDesc('created_at')
            ->get(['id', 'email', 'next_run_at', 'created_at']);

        return ApiResponse::ok($rows);
    }

    public function deleteSchedule(Request $request, string $schedule): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $deleted = DB::table('report_schedules')
            ->where('tenant_id', $tenantId)
            ->where('id', $schedule)
            ->delete();

        if (! $deleted) {
            return ApiResponse::error('resource.not_found', 'Scheduled report not found.', 404);
        }

        return ApiResponse::ok(['deleted' => true]);
    }

    public function schedule(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => ['required', 'email', 'max:160']]);
        $id = (string) \Illuminate\Support\Str::uuid7();
        DB::table('report_schedules')->insert([
            'id' => $id,
            'tenant_id' => $request->session()->get('tenant_id'),
            'email' => $data['email'],
            'next_run_at' => null,
            'created_at' => now(),
        ]);

        return ApiResponse::ok(['id' => $id, 'email' => $data['email']], 201);
    }

    public function itemLedger(Request $request): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $itemId = $request->query('item_id');
        $from = $request->query('from', now()->subDays(30)->startOfDay()->toIso8601String());
        $to = $request->query('to', now()->endOfDay()->toIso8601String());

        // List items for selector
        $items = DB::table('store_items')
            ->leftJoin('stock_balances', 'stock_balances.store_item_id', '=', 'store_items.id')
            ->where('store_items.tenant_id', $tenantId)
            ->whereNull('store_items.deleted_at')
            ->select([
                'store_items.id',
                'store_items.name',
                'store_items.sku',
                'store_items.cost_paise',
                DB::raw('COALESCE(SUM(stock_balances.on_hand), 0) as current_stock')
            ])
            ->groupBy('store_items.id', 'store_items.name', 'store_items.sku', 'store_items.cost_paise')
            ->orderBy('store_items.name')
            ->limit(100)
            ->get();

        $selectedItem = null;
        if ($itemId) {
            $selectedItem = $items->firstWhere('id', $itemId) ?? DB::table('store_items')->where('tenant_id', $tenantId)->where('id', $itemId)->first();
        }
        if (! $selectedItem && $items->isNotEmpty()) {
            $selectedItem = $items->first();
            $itemId = $selectedItem->id;
        }

        if (! $selectedItem) {
            return ApiResponse::ok([
                'items' => [],
                'selected_item' => null,
                'opening_qty' => 0,
                'closing_qty' => 0,
                'total_inward' => 0,
                'total_outward' => 0,
                'valuation_paise' => 0,
                'entries' => [],
            ]);
        }

        // Calculate opening stock prior to $from date
        $openingEntries = DB::table('stock_ledger_entries')
            ->where('tenant_id', $tenantId)
            ->where('store_item_id', $itemId)
            ->where('occurred_at', '<', $from)
            ->sum('qty_delta');

        $openingQty = (float) $openingEntries;

        // Fetch entries within date range
        $ledgerRows = DB::table('stock_ledger_entries')
            ->where('tenant_id', $tenantId)
            ->where('store_item_id', $itemId)
            ->whereBetween('occurred_at', [$from, $to])
            ->orderBy('occurred_at')
            ->get();

        $entries = [];
        $runningBalance = $openingQty;
        $totalInward = 0.0;
        $totalOutward = 0.0;

        foreach ($ledgerRows as $row) {
            $delta = (float) $row->qty_delta;
            $qtyIn = $delta > 0 ? $delta : 0.0;
            $qtyOut = $delta < 0 ? abs($delta) : 0.0;
            $runningBalance += $delta;
            $totalInward += $qtyIn;
            $totalOutward += $qtyOut;

            $entries[] = [
                'id' => $row->id,
                'date' => $row->occurred_at ?? $row->created_at,
                'type' => $row->reference_type ?? $row->reason ?? 'adjustment',
                'reference' => $row->reference_id ?? '-',
                'reason' => $row->reason ?? '-',
                'qty_in' => $qtyIn,
                'qty_out' => $qtyOut,
                'balance' => round($runningBalance, 3),
                'unit_cost_paise' => (int) ($row->unit_cost_paise ?: $selectedItem->cost_paise),
                'total_paise' => (int) round(abs($delta) * ($row->unit_cost_paise ?: $selectedItem->cost_paise)),
            ];
        }

        // If no ledger rows recorded, fallback/supplement from real sales and PO lines
        if (empty($entries)) {
            // Sales
            $saleLines = DB::table('sale_lines')
                ->join('sales', 'sales.id', '=', 'sale_lines.sale_id')
                ->where('sales.tenant_id', $tenantId)
                ->where('sale_lines.store_item_id', $itemId)
                ->whereBetween('sales.created_at', [$from, $to])
                ->select([
                    'sale_lines.id',
                    'sales.created_at',
                    'sales.number as reference',
                    'sale_lines.qty',
                    'sale_lines.unit_price_paise'
                ])
                ->get();

            foreach ($saleLines as $sl) {
                $qty = (float) $sl->qty;
                $runningBalance -= $qty;
                $totalOutward += $qty;
                $entries[] = [
                    'id' => $sl->id,
                    'date' => $sl->created_at,
                    'type' => 'sale',
                    'reference' => $sl->reference,
                    'reason' => 'Store POS Sale',
                    'qty_in' => 0.0,
                    'qty_out' => $qty,
                    'balance' => round($runningBalance, 3),
                    'unit_cost_paise' => (int) $selectedItem->cost_paise,
                    'total_paise' => (int) round($qty * (int) $selectedItem->cost_paise),
                ];
            }
        }

        $currentStockOnHand = (float) DB::table('stock_balances')
            ->where('store_item_id', $itemId)
            ->sum('on_hand');

        return ApiResponse::ok([
            'items' => $items,
            'selected_item' => [
                'id' => $selectedItem->id,
                'name' => $selectedItem->name,
                'sku' => $selectedItem->sku ?? 'SKU-'.$selectedItem->id,
                'cost_paise' => (int) $selectedItem->cost_paise,
                'on_hand' => $currentStockOnHand,
            ],
            'opening_qty' => round($openingQty, 3),
            'total_inward' => round($totalInward, 3),
            'total_outward' => round($totalOutward, 3),
            'closing_qty' => round($runningBalance, 3),
            'valuation_paise' => (int) round($currentStockOnHand * (int) $selectedItem->cost_paise),
            'entries' => $entries,
        ]);
    }

    public function purchaseRegister(Request $request): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $from = $request->query('from', now()->subDays(30)->startOfDay()->toIso8601String());
        $to = $request->query('to', now()->endOfDay()->toIso8601String());
        $supplierId = $request->query('supplier_id');

        $query = DB::table('purchase_orders')
            ->leftJoin('suppliers', 'suppliers.id', '=', 'purchase_orders.supplier_id')
            ->where('purchase_orders.tenant_id', $tenantId)
            ->whereBetween('purchase_orders.created_at', [$from, $to]);

        if ($supplierId) {
            $query->where('purchase_orders.supplier_id', $supplierId);
        }

        $orders = $query->orderByDesc('purchase_orders.created_at')
            ->select([
                'purchase_orders.id',
                'purchase_orders.number',
                'purchase_orders.status',
                'purchase_orders.created_at',
                'suppliers.name as supplier_name',
                'suppliers.gstin as supplier_gstin',
                'suppliers.phone as supplier_phone',
            ])
            ->get();

        $orderIds = $orders->pluck('id');
        $lines = DB::table('purchase_order_lines')
            ->whereIn('purchase_order_id', $orderIds)
            ->get();

        $rows = [];
        $totalTaxable = 0;
        $totalGst = 0;
        $totalInvoicesPaise = 0;
        $totalQty = 0;

        foreach ($orders as $order) {
            $orderLines = $lines->where('purchase_order_id', $order->id);
            $orderTaxable = 0;
            $orderQty = 0;

            foreach ($orderLines as $line) {
                $q = (float) $line->qty;
                $cost = (int) $line->cost_paise;
                $orderTaxable += (int) round($q * $cost);
                $orderQty += $q;
            }

            // Assume standard 18% GST (9% CGST + 9% SGST)
            $cgst = (int) round($orderTaxable * 0.09);
            $sgst = (int) round($orderTaxable * 0.09);
            $igst = 0;
            $orderTotal = $orderTaxable + $cgst + $sgst + $igst;

            $totalTaxable += $orderTaxable;
            $totalGst += ($cgst + $sgst + $igst);
            $totalInvoicesPaise += $orderTotal;
            $totalQty += $orderQty;

            $rows[] = [
                'id' => $order->id,
                'number' => $order->number,
                'date' => $order->created_at,
                'supplier_name' => $order->supplier_name ?? 'Local Vendor',
                'supplier_gstin' => $order->supplier_gstin ?? 'Unregistered',
                'status' => $order->status,
                'items_count' => $orderLines->count(),
                'qty' => $orderQty,
                'taxable_paise' => $orderTaxable,
                'cgst_paise' => $cgst,
                'sgst_paise' => $sgst,
                'igst_paise' => $igst,
                'total_paise' => $orderTotal,
                'itc_status' => 'Eligible',
            ];
        }

        $suppliers = DB::table('suppliers')
            ->where('tenant_id', $tenantId)
            ->whereNull('deleted_at')
            ->get(['id', 'name', 'gstin']);

        return ApiResponse::ok([
            'summary' => [
                'invoices_count' => count($rows),
                'total_taxable_paise' => $totalTaxable,
                'total_gst_paise' => $totalGst,
                'total_invoices_paise' => $totalInvoicesPaise,
                'total_qty' => $totalQty,
                'suppliers_count' => $suppliers->count(),
            ],
            'suppliers' => $suppliers,
            'rows' => $rows,
        ]);
    }

    public function export(Request $request): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');

        return ApiResponse::ok([
            'customers' => DB::table('customers')->where('tenant_id', $tenantId)->whereNull('deleted_at')->get(['id', 'name', 'phone_e164']),
            'sales' => DB::table('sales')->where('tenant_id', $tenantId)->get(['id', 'number', 'total_paise', 'status']),
            'orders' => DB::table('orders')->where('tenant_id', $tenantId)->get(['id', 'number', 'total_paise', 'status']),
        ]);
    }

    private function stockValue(string $tenantId, string $basis): int
    {
        $rows = DB::table('stock_balances')
            ->join('store_items', 'store_items.id', '=', 'stock_balances.store_item_id')
            ->where('store_items.tenant_id', $tenantId)
            ->whereNull('store_items.deleted_at')
            ->where('stock_balances.on_hand', '>', 0)
            ->get(['stock_balances.store_item_id', 'stock_balances.on_hand', 'store_items.cost_paise', 'store_items.details']);
        $total = 0;
        foreach ($rows as $row) {
            if ($basis === 'cost') {
                $unit = (int) $row->cost_paise;
            } elseif ($basis === 'wholesale') {
                $details = is_string($row->details) ? (json_decode($row->details, true) ?: []) : (array) ($row->details ?? []);
                $wholesale = (int) ($details['wholesale_paise'] ?? 0);
                $selling = (int) DB::table('store_item_prices')->where('store_item_id', $row->store_item_id)->orderByDesc('starts_at')->value('selling_price_paise');
                $unit = $wholesale > 0 ? $wholesale : ($row->cost_paise > 0 ? (int) round(((int) $row->cost_paise + $selling) / 2) : (int) round($selling * 0.85));
            } else {
                $unit = (int) DB::table('store_item_prices')->where('store_item_id', $row->store_item_id)->orderByDesc('starts_at')->value('selling_price_paise');
            }
            $total += (int) round(((float) $row->on_hand) * $unit);
        }

        return $total;
    }

    public function gstAuditPack(Request $request): \Symfony\Component\HttpFoundation\BinaryFileResponse|JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $from = $request->query('from', now()->startOfMonth()->toDateString());
        $to = $request->query('to', now()->toDateString());

        $tempDir = storage_path('app/temp_exports');
        if (! is_dir($tempDir)) {
            mkdir($tempDir, 0755, true);
        }

        $zipFilename = "gst_audit_pack_{$tenantId}_{$from}_{$to}.zip";
        $zipPath = "{$tempDir}/{$zipFilename}";

        $zip = new \ZipArchive();
        if ($zip->open($zipPath, \ZipArchive::CREATE | \ZipArchive::OVERWRITE) !== true) {
            return ApiResponse::error('server.error', 'Unable to create GST audit zip file.', 500);
        }

        // 1. GSTR-1 Outward Supplies Summary (B2B + B2C)
        $sales = DB::table('sales')
            ->leftJoin('customers', 'customers.id', '=', 'sales.customer_id')
            ->where('sales.tenant_id', $tenantId)
            ->where('sales.status', '!=', 'voided')
            ->whereBetween('sales.created_at', ["{$from} 00:00:00", "{$to} 23:59:59"])
            ->orderBy('sales.created_at')
            ->get([
                'sales.id', 'sales.number', 'sales.created_at', 'sales.subtotal_paise',
                'sales.discount_paise', 'sales.cgst_paise', 'sales.sgst_paise',
                'sales.igst_paise', 'sales.total_paise', 'sales.status',
                'customers.name as customer_name', 'customers.phone_e164 as customer_phone'
            ]);

        $gstr1Csv = "Invoice Number,Date,Type,Customer Name,Customer Contact,Taxable Value (INR),CGST (INR),SGST (INR),IGST (INR),Total Value (INR),Status\n";
        foreach ($sales as $s) {
            $type = 'B2CS (Consumer)';
            $taxable = ($s->subtotal_paise - $s->discount_paise) / 100;
            $cgst = $s->cgst_paise / 100;
            $sgst = $s->sgst_paise / 100;
            $igst = $s->igst_paise / 100;
            $total = $s->total_paise / 100;
            $gstr1Csv .= "\"{$s->number}\",\"{$s->created_at}\",\"{$type}\",\"" . str_replace('"', '""', $s->customer_name ?? 'Walk-in') . "\",\"{$s->customer_phone}\",{$taxable},{$cgst},{$sgst},{$igst},{$total},\"{$s->status}\"\n";
        }
        $zip->addFromString('1_GSTR1_Outward_Supplies.csv', $gstr1Csv);

        // 2. GSTR-1 HSN Summary
        $hsnRows = DB::table('sale_lines')
            ->join('sales', 'sales.id', '=', 'sale_lines.sale_id')
            ->where('sales.tenant_id', $tenantId)
            ->where('sales.status', '!=', 'voided')
            ->whereBetween('sales.created_at', ["{$from} 00:00:00", "{$to} 23:59:59"])
            ->groupBy(DB::raw("coalesce(sale_lines.hsn_snapshot, '999999')"), 'sale_lines.gst_bps')
            ->get([
                DB::raw("coalesce(sale_lines.hsn_snapshot, '999999') as hsn_code"),
                'sale_lines.gst_bps',
                DB::raw('sum(sale_lines.qty) as total_qty'),
                DB::raw('sum(sale_lines.taxable_paise) as total_taxable'),
                DB::raw('sum(sale_lines.cgst_paise) as total_cgst'),
                DB::raw('sum(sale_lines.sgst_paise) as total_sgst'),
                DB::raw('sum(sale_lines.igst_paise) as total_igst'),
                DB::raw('sum(sale_lines.line_total_paise) as total_amount')
            ]);

        $hsnCsv = "HSN/SAC Code,Rate %,Total Quantity,UQC,Total Value (INR),Taxable Value (INR),CGST (INR),SGST (INR),IGST (INR)\n";
        foreach ($hsnRows as $h) {
            $rate = ($h->gst_bps ?? 0) / 100;
            $taxable = $h->total_taxable / 100;
            $cgst = $h->total_cgst / 100;
            $sgst = $h->total_sgst / 100;
            $igst = $h->total_igst / 100;
            $tot = $h->total_amount / 100;
            $hsnCsv .= "\"{$h->hsn_code}\",{$rate}%,{$h->total_qty},\"NOS\",{$tot},{$taxable},{$cgst},{$sgst},{$igst}\n";
        }
        $zip->addFromString('2_HSN_Summary_Table12.csv', $hsnCsv);

        // 3. Purchase ITC Register (GSTR-2B / Inward Supplies)
        $purchases = DB::table('goods_receipts')
            ->leftJoin('suppliers', 'suppliers.id', '=', 'goods_receipts.supplier_id')
            ->where('goods_receipts.tenant_id', $tenantId)
            ->whereBetween('goods_receipts.created_at', ["{$from} 00:00:00", "{$to} 23:59:59"])
            ->get([
                'goods_receipts.number', 'goods_receipts.created_at', 'goods_receipts.payable_paise',
                'suppliers.name as supplier_name', 'suppliers.gstin as supplier_gstin'
            ]);

        $itcCsv = "GRN / Invoice Number,Date,Supplier Name,Supplier GSTIN,Taxable (INR),Estimated CGST (INR),Estimated SGST (INR),Total ITC Claimable (INR)\n";
        foreach ($purchases as $p) {
            $tot = $p->payable_paise / 100;
            $taxable = round($tot / 1.18, 2);
            $gst = round(($tot - $taxable) / 2, 2);
            $itcCsv .= "\"{$p->number}\",\"{$p->created_at}\",\"" . str_replace('"', '""', $p->supplier_name ?? 'Vendor') . "\",\"{$p->supplier_gstin}\",{$taxable},{$gst},{$gst},{$tot}\n";
        }
        $zip->addFromString('3_Purchase_ITC_Register.csv', $itcCsv);

        // 4. Financial Day Book & Cash Book
        $payments = DB::table('sale_payments')
            ->join('sales', 'sales.id', '=', 'sale_payments.sale_id')
            ->where('sales.tenant_id', $tenantId)
            ->where('sales.status', '!=', 'voided')
            ->whereBetween('sales.created_at', ["{$from} 00:00:00", "{$to} 23:59:59"])
            ->groupBy(DB::raw("date(sales.created_at)"), 'sale_payments.method')
            ->get([
                DB::raw("date(sales.created_at) as sale_date"),
                'sale_payments.method',
                DB::raw('sum(sale_payments.amount_paise) as total_paise')
            ]);

        $dayBookCsv = "Date,Payment Tender / Method,Total Received (INR)\n";
        foreach ($payments as $pay) {
            $amt = $pay->total_paise / 100;
            $dayBookCsv .= "\"{$pay->sale_date}\",\"" . strtoupper($pay->method) . "\",{$amt}\n";
        }
        $zip->addFromString('4_Financial_Day_Book.csv', $dayBookCsv);

        // 5. CA Audit Manifest
        $manifest = "SelfX Enterprise Retail - GST CA Audit Package\n";
        $manifest .= "Generated At: " . now()->toIso8601String() . "\n";
        $manifest .= "Audit Period: {$from} to {$to}\n";
        $manifest .= "Tenant UUID: {$tenantId}\n";
        $manifest .= "Included Statements:\n";
        $manifest .= " - 1_GSTR1_Outward_Supplies.csv\n";
        $manifest .= " - 2_HSN_Summary_Table12.csv\n";
        $manifest .= " - 3_Purchase_ITC_Register.csv\n";
        $manifest .= " - 4_Financial_Day_Book.csv\n";
        $zip->addFromString('AUDIT_MANIFEST.txt', $manifest);

        $zip->close();

        return response()->download($zipPath, "selfx-gst-audit-{$from}-to-{$to}.zip", [
            'Content-Type' => 'application/zip',
        ])->deleteFileAfterSend(true);
    }

    private function rupees(int $paise): string
    {
        return number_format($paise / 100, 2, '.', '');
    }
}
