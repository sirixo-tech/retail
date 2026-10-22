<?php

namespace Database\Seeders;

use App\Modules\Identity\Models\User;
use App\Modules\Plans\Models\Feature;
use App\Modules\Plans\Models\Plan;
use App\Modules\Plans\Models\PlanFeature;
use App\Modules\Plans\Models\PlanPrice;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        foreach ([
            'www', 'admin', 'api', 'app', 'shop', 'mail', 'static', 'cdn', 'status',
            'docs', 'help', 'support', 'billing', 'assets', 'images', 'catalog',
            'platform', 'selfx', 'root', 'null', 'test', 'demo', 'staging', 'localhost',
        ] as $slug) {
            DB::table('reserved_slugs')->insertOrIgnore(['slug' => $slug]);
        }

        $definitions = [
            ['module.pos', 'Point of sale', 'boolean', true],
            ['module.inventory', 'Inventory', 'boolean', true],
            ['module.storefront', 'Online store', 'boolean', true],
            ['module.delivery', 'Delivery', 'boolean', true],
            ['module.customers', 'Customers', 'boolean', false],
            ['module.loyalty', 'Loyalty', 'boolean', true],
            ['module.khata', 'Customer credit', 'boolean', true],
            ['module.reports_advanced', 'Advanced reports', 'boolean', true],
            ['module.price_lists', 'Extra price lists', 'boolean', true],
            ['module.ai_reports', 'AI reports', 'boolean', true],
            ['module.ai_product_create', 'AI product entry', 'boolean', false],
            ['module.ai_assistant', 'Shopping assistant', 'boolean', false],
            ['module.accounting_export', 'Accounting export', 'boolean', false],
            ['module.webhooks', 'Webhooks', 'boolean', false],
            ['module.api_keys', 'API keys', 'boolean', false],
            ['module.custom_domain', 'Custom domain', 'boolean', false],
            ['module.multi_store', 'Multiple stores', 'boolean', true],
            ['module.offline_pos', 'Offline billing', 'boolean', true],
            ['module.whatsapp', 'WhatsApp', 'boolean', true],
            ['apps.android', 'Android app', 'boolean', false],
            ['apps.ios', 'iOS app', 'boolean', false],
            ['apps.windows', 'Windows app', 'boolean', false],
            ['apps.desktop', 'Desktop app', 'boolean', false],
            ['limit.stores', 'Stores', 'integer', true],
            ['limit.staff', 'Staff', 'integer', true],
            ['limit.products', 'Products', 'integer', true],
            ['limit.orders_per_month', 'Orders / month', 'integer', true],
            ['limit.storage_mb', 'Storage (MB)', 'integer', false],
            ['limit.sms_per_month', 'SMS / month', 'integer', true],
            ['limit.ai_credits_per_month', 'AI credits / month', 'integer', false],
            ['limit.counters', 'Counters', 'integer', false],
        ];

        $features = [];
        foreach ($definitions as [$key, $name, $type, $public]) {
            $features[$key] = Feature::query()->create([
                'key' => $key,
                'name' => $name,
                'value_type' => $type,
                'show_on_pricing' => $public,
            ]);
        }

        $plans = [
            'starter' => [
                'name' => 'Starter',
                'sort' => 1,
                'monthly' => 0,
                'trial' => 0,
                'values' => [
                    'module.pos' => 1, 'module.inventory' => 1, 'module.storefront' => 1, 'module.customers' => 1,
                    'limit.stores' => 1, 'limit.staff' => 2, 'limit.products' => 100, 'limit.orders_per_month' => 300,
                    'limit.storage_mb' => 500, 'limit.sms_per_month' => 50, 'limit.ai_credits_per_month' => 0, 'limit.counters' => 1,
                ],
            ],
            'professional' => [
                'name' => 'Professional',
                'sort' => 2,
                'monthly' => 149900,
                'trial' => 14,
                'values' => [
                    'module.pos' => 1, 'module.inventory' => 1, 'module.storefront' => 1, 'module.customers' => 1,
                    'module.delivery' => 1, 'module.loyalty' => 1, 'module.khata' => 1, 'module.reports_advanced' => 1,
                    'module.price_lists' => 1, 'module.offline_pos' => 1,
                    'limit.stores' => 1, 'limit.staff' => 10, 'limit.products' => 5000, 'limit.orders_per_month' => -1,
                    'limit.storage_mb' => 5000, 'limit.sms_per_month' => 1000, 'limit.ai_credits_per_month' => 0, 'limit.counters' => 3,
                ],
            ],
            'enterprise' => [
                'name' => 'Enterprise',
                'sort' => 3,
                'monthly' => 499900,
                'trial' => 0,
                'values' => [
                    'module.pos' => 1, 'module.inventory' => 1, 'module.storefront' => 1, 'module.customers' => 1,
                    'module.delivery' => 1, 'module.loyalty' => 1, 'module.khata' => 1, 'module.reports_advanced' => 1,
                    'module.price_lists' => 1, 'module.offline_pos' => 1, 'module.multi_store' => 1,
                    'module.api_keys' => 1, 'module.webhooks' => 1, 'module.accounting_export' => 1,
                    'module.ai_reports' => 1, 'module.ai_product_create' => 1, 'module.ai_assistant' => 1,
                    'apps.android' => 1, 'apps.ios' => 1, 'apps.windows' => 1, 'apps.desktop' => 1,
                    'limit.stores' => 25, 'limit.staff' => -1, 'limit.products' => -1, 'limit.orders_per_month' => -1,
                    'limit.storage_mb' => 50000, 'limit.sms_per_month' => 10000, 'limit.ai_credits_per_month' => 5000, 'limit.counters' => -1,
                ],
            ],
        ];

        foreach ($plans as $code => $spec) {
            $plan = Plan::query()->create([
                'code' => $code,
                'name' => $spec['name'],
                'status' => 'active',
                'sort' => $spec['sort'],
                'is_public' => true,
            ]);

            foreach (['monthly' => 1, 'quarterly' => 3, 'yearly' => 12] as $cycle => $months) {
                $full = $spec['monthly'] * $months;
                $amount = $cycle === 'yearly' ? (int) round($full * 0.85) : $full;
                PlanPrice::query()->create([
                    'plan_id' => $plan->id,
                    'cycle' => $cycle,
                    'amount_paise' => $amount,
                    'compare_at_paise' => $cycle === 'monthly' ? null : $full,
                    'currency' => 'INR',
                    'trial_days' => $cycle === 'monthly' ? $spec['trial'] : 0,
                    'active' => true,
                ]);
            }

            foreach ($features as $key => $feature) {
                PlanFeature::query()->create([
                    'plan_id' => $plan->id,
                    'feature_id' => $feature->id,
                    'value' => $spec['values'][$key] ?? 0,
                ]);
            }
        }

        User::query()->create([
            'kind' => 'platform',
            'name' => 'Super Admin',
            'email' => 'admin@selfx.test',
            'password' => 'password',
            'must_change_password' => false,
            'status' => 'active',
        ]);

        $this->call(CatalogSeeder::class);
    }
}
