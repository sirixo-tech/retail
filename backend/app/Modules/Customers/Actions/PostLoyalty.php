<?php

namespace App\Modules\Customers\Actions;

use App\Modules\Plans\Support\Entitlement;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class PostLoyalty
{
    public function __construct(private Entitlement $entitlements)
    {
    }

    public function earn(string $tenantId, ?string $customerId, string $saleId, int $totalPaise): int
    {
        if ($customerId === null || ! $this->entitlements->allows($tenantId, 'module.loyalty')) {
            return 0;
        }
        $points = intdiv(max(0, $totalPaise), 100);
        if ($points === 0) {
            return 0;
        }
        $already = DB::table('loyalty_entries')->where('sale_id', $saleId)->where('direction', 'earn')->exists();
        if ($already) {
            return 0;
        }
        $this->write($tenantId, $customerId, $saleId, 'earn', $points);

        return $points;
    }

    public function redeem(string $tenantId, string $customerId, string $saleId, int $points, int $billPaise): int
    {
        if ($points <= 0) {
            return 0;
        }
        if (! $this->entitlements->allows($tenantId, 'module.loyalty')) {
            throw new RuntimeException('entitlement.module_disabled');
        }
        $customer = DB::table('customers')->where('id', $customerId)->where('tenant_id', $tenantId)->lockForUpdate()->first();
        if (! $customer) {
            throw new RuntimeException('resource.not_found');
        }
        if ($points > (int) $customer->loyalty_points) {
            throw new RuntimeException('loyalty.short');
        }
        $discount = $points * 100;
        if ($discount > $billPaise) {
            throw new RuntimeException('loyalty.too_large');
        }
        $this->write($tenantId, $customerId, $saleId, 'redeem', $points);

        return $discount;
    }

    public function reverseSale(string $saleId): void
    {
        $entries = DB::table('loyalty_entries')->where('sale_id', $saleId)->whereIn('direction', ['earn', 'redeem'])->get();
        if ($entries->isEmpty()) {
            return;
        }
        $customer = DB::table('customers')->where('id', $entries->first()->customer_id)->lockForUpdate()->first();
        if (! $customer) {
            return;
        }
        $delta = 0;
        foreach ($entries as $entry) {
            $delta += $entry->direction === 'earn' ? -1 * (int) $entry->points : (int) $entry->points;
        }
        $next = (int) $customer->loyalty_points + $delta;
        if ($next < 0) {
            throw new RuntimeException('loyalty.short');
        }
        DB::table('customers')->where('id', $customer->id)->update([
            'loyalty_points' => $next,
            'updated_at' => now(),
        ]);
        DB::table('loyalty_entries')->insert([
            'id' => (string) Str::uuid7(),
            'tenant_id' => $customer->tenant_id,
            'customer_id' => $customer->id,
            'sale_id' => $saleId,
            'direction' => 'void',
            'points' => abs($delta),
            'created_at' => now(),
        ]);
    }

    public static function tier(int $earned): string
    {
        if ($earned >= 2000) {
            return 'gold';
        }
        if ($earned >= 500) {
            return 'silver';
        }

        return 'bronze';
    }

    private function write(string $tenantId, string $customerId, ?string $saleId, string $direction, int $points): void
    {
        $customer = DB::table('customers')->where('id', $customerId)->lockForUpdate()->first();
        $balance = (int) ($customer->loyalty_points ?? 0);
        $next = $direction === 'earn' ? $balance + $points : $balance - $points;
        DB::table('customers')->where('id', $customerId)->update([
            'loyalty_points' => $next,
            'updated_at' => now(),
        ]);
        DB::table('loyalty_entries')->insert([
            'id' => (string) Str::uuid7(),
            'tenant_id' => $tenantId,
            'customer_id' => $customerId,
            'sale_id' => $saleId,
            'direction' => $direction,
            'points' => $points,
            'created_at' => now(),
        ]);
    }
}
