<?php

namespace App\Modules\Plans\Support;

use App\Modules\Plans\Models\PlanFeature;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class Entitlement
{
    public function assertOrders(string $tenantId): void
    {
        $limit = $this->value($tenantId, 'limit.orders_per_month');
        if ($limit < 0) {
            return;
        }
        $start = now()->startOfMonth();
        $orders = DB::table('orders')->where('tenant_id', $tenantId)->where('created_at', '>=', $start)->count();
        $counter = DB::table('sales')
            ->where('tenant_id', $tenantId)
            ->whereNull('order_id')
            ->where('created_at', '>=', $start)
            ->count();
        if ($orders + $counter >= $limit) {
            throw new RuntimeException('entitlement.limit_exceeded');
        }
    }

    public function allows(string $tenantId, string $feature): bool
    {
        return $this->value($tenantId, $feature) > 0;
    }

    public function value(string $tenantId, string $feature): int
    {
        $planId = DB::table('subscriptions')->where('tenant_id', $tenantId)->value('plan_id');
        if (! $planId) {
            return 0;
        }
        $featureId = DB::table('features')->where('key', $feature)->value('id');
        if ($featureId) {
            $override = DB::table('tenant_feature_overrides')
                ->where('tenant_id', $tenantId)
                ->where('feature_id', $featureId)
                ->value('value');
            if ($override !== null) {
                return (int) $override;
            }
        }
        $value = PlanFeature::query()
            ->where('plan_id', $planId)
            ->whereHas('feature', fn ($query) => $query->where('key', $feature))
            ->value('value');

        return $value === null ? 0 : (int) $value;
    }
}
