<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class SendReportSchedules extends Command
{
    protected $signature = 'reports:send-schedules {--force : Send regardless of next_run_at}';

    protected $description = 'Generate and dispatch automated retail performance reports to subscribed emails';

    public function handle(): int
    {
        $query = DB::table('report_schedules');
        if (! $this->option('force')) {
            $query->where(function ($q) {
                $q->whereNull('next_run_at')->orWhere('next_run_at', '<=', now());
            });
        }
        $due = $query->get();

        if ($due->isEmpty()) {
            $this->info('No report schedules due.');
            return self::SUCCESS;
        }

        foreach ($due as $row) {
            \App\Modules\Tenancy\Models\Tenant::acting($row->tenant_id, function () use ($row) {
                $tenant = DB::table('tenants')->where('id', $row->tenant_id)->first();
                $tenantName = $tenant->name ?? 'Retail Store';

            // Calculate sales metrics for this store
            $todaySales = DB::table('sales')
                ->where('tenant_id', $row->tenant_id)
                ->whereDate('created_at', '>=', now()->subDays(1))
                ->get();

            $totalRevenuePaise = $todaySales->sum('total_paise') ?? 0;
            $orderCount = $todaySales->count();
            $cashPaise = $todaySales->where('payment_method', 'cash')->sum('total_paise') ?? 0;
            $upiPaise = $todaySales->where('payment_method', 'upi')->sum('total_paise') ?? 0;
            $cardPaise = $todaySales->where('payment_method', 'card')->sum('total_paise') ?? 0;

            $revInr = number_format($totalRevenuePaise / 100, 2);
            $cashInr = number_format($cashPaise / 100, 2);
            $upiInr = number_format($upiPaise / 100, 2);
            $cardInr = number_format($cardPaise / 100, 2);

            $reportType = isset($row->report_type) ? $row->report_type : 'sales_summary';
            $frequency = isset($row->frequency) ? $row->frequency : 'daily';

            $subject = "[{$tenantName}] Daily Retail Sales Report - " . now()->format('d M Y');
            $body = "DAILY SALES SUMMARY REPORT\n"
                  . "Store: {$tenantName}\n"
                  . "Generated: " . now()->toDayDateTimeString() . "\n"
                  . "----------------------------------------\n"
                  . "Total Invoices: {$orderCount}\n"
                  . "Gross Sales Revenue: Rs. {$revInr}\n"
                  . "Cash Collections: Rs. {$cashInr}\n"
                  . "UPI Collections: Rs. {$upiInr}\n"
                  . "Card / Gateway: Rs. {$cardInr}\n"
                  . "----------------------------------------\n"
                  . "Report Type: " . ucfirst($reportType) . "\n"
                  . "Frequency: " . ucfirst($frequency) . "\n\n"
                  . "Log in to your store console for line-item tax invoices, item ledger, and GST books.\n";

            $isConfigured = ! app()->environment('testing') && (
                config('mail.default') === 'smtp' && ! empty(config('mail.mailers.smtp.username'))
            );

            if ($isConfigured) {
                try {
                    Mail::raw($body, function ($msg) use ($row, $subject) {
                        $msg->to($row->email)->subject($subject);
                    });
                    $sentStatus = 'sent';
                    $errorDetail = null;
                } catch (\Throwable $e) {
                    $sentStatus = 'failed';
                    $errorDetail = $e->getMessage();
                }
            } else {
                $sentStatus = 'not_configured';
                $errorDetail = 'Email is not configured. The report for '.$row->email.' was not sent.';
            }

            DB::table('notification_logs')->insert([
                'id' => (string) Str::uuid7(),
                'tenant_id' => $row->tenant_id,
                'channel' => 'email',
                'template' => 'report.daily',
                'status' => $sentStatus,
                'detail' => $errorDetail ?: "Dispatched {$frequency} report to {$row->email}. Revenue: Rs. {$revInr} ({$orderCount} orders).",
                'created_at' => now(),
            ]);

            $nextRun = match ($frequency) {
                'weekly' => now()->addWeek()->startOfDay()->addHours(7),
                'monthly' => now()->addMonth()->startOfDay()->addHours(7),
                default => now()->addDay()->startOfDay()->addHours(7),
            };

            DB::table('report_schedules')->where('id', $row->id)->update([
                'next_run_at' => $nextRun,
            ]);

                $this->info("Report sent to {$row->email} for {$tenantName} (Status: {$sentStatus})");
            });
        }

        return self::SUCCESS;
    }
}
