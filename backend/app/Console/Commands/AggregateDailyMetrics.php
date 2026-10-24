<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AggregateDailyMetrics extends Command
{
    protected $signature = 'reports:aggregate-daily';

    protected $description = 'Store today\'s bill count and sales total per store';

    public function handle(): int
    {
        $start = now()->startOfDay();
        $stores = DB::table('stores')->whereNull('deleted_at')->get(['id', 'tenant_id']);
        foreach ($stores as $store) {
            \App\Modules\Tenancy\Models\Tenant::acting($store->tenant_id, function () use ($store, $start) {
                $query = DB::table('sales')->where('tenant_id', $store->tenant_id)->where('store_id', $store->id)->where('status', '!=', 'voided')->where('created_at', '>=', $start);
                DB::table('daily_store_metrics')->updateOrInsert(
                    ['store_id' => $store->id, 'metric_date' => $start->toDateString()],
                    [
                        'id' => (string) Str::uuid7(),
                        'tenant_id' => $store->tenant_id,
                        'bills' => (clone $query)->count(),
                        'sales_paise' => (int) (clone $query)->sum('total_paise'),
                        'updated_at' => now(),
                        'created_at' => now(),
                    ],
                );
            });
        }
        $this->info('Daily metrics stored.');

        return self::SUCCESS;
    }
}
