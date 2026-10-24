<?php

namespace App\Support\Tenancy;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class RlsHelper
{
    /**
     * List of tenant-scoped tables requiring PostgreSQL Row-Level Security.
     */
    public const TENANT_TABLES = [
        'stores',
        'store_items',
        'store_item_barcodes',
        'sales',
        'sale_lines',
        'orders',
        'order_items',
        'customers',
        'customer_addresses',
        'customer_favourites',
        'customer_feedback',
        'customer_segments',
        'staff_profiles',
        'attendance_punches',
        'shifts',
        'shift_cash_movements',
        'pos_holds',
        'pos_quick_keys',
        'counters',
        'printers',
        'print_jobs',
        'print_profiles',
        'pairing_sessions',
        'document_templates',
        'coupons',
        'payments',
        'payment_gateways',
        'subscriptions',
        'billing_invoices',
        'billing_utrs',
        'purchase_orders',
        'purchase_returns',
        'suppliers',
        'supplier_ledger_entries',
        'supplier_payments',
        'stock_counts',
        'stock_ledger_entries',
        'stock_reservations',
        'stock_transfers',
        'delivery_zones',
        'deliveries',
        'api_keys',
        'webhook_endpoints',
        'notification_logs',
        'audit_logs',
        'daily_store_metrics',
        'saved_reports',
        'report_schedules',
        'loyalty_entries',
        'khata_entries',
        'sale_credit_notes',
        'tenant_brands',
        'tenant_categories',
        'tenant_units',
        'tenant_feature_overrides',
        'tenant_provision_steps',
        'invoice_series',
        'catalog_subscriptions',
        'e_invoices',
        'stock_alerts',
        'stock_batches',
    ];

    /**
     * Tables that can have tenant_id IS NULL for shared / global platform reference records.
     */
    public const NULLABLE_TENANT_TABLES = [
        'document_templates',
        'audit_logs',
        'cms_pages',
        'roles',
        'model_has_roles',
    ];

    public static function enableRls(string $table, bool $allowNullTenant = false): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        if (! Schema::hasTable($table)) {
            return;
        }

        DB::statement("ALTER TABLE \"{$table}\" ENABLE ROW LEVEL SECURITY;");
        DB::statement("DROP POLICY IF EXISTS tenant_isolation_policy ON \"{$table}\";");

        $condition = "NULLIF(current_setting('app.bypass_rls', true), 'off') = 'on' "
                   . "OR \"tenant_id\" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid";

        if ($allowNullTenant) {
            $condition .= " OR \"tenant_id\" IS NULL";
        }

        $checkCondition = "NULLIF(current_setting('app.bypass_rls', true), 'off') = 'on' "
                        . "OR \"tenant_id\" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid";

        if ($allowNullTenant) {
            $checkCondition .= " OR \"tenant_id\" IS NULL";
        }

        DB::statement("
            CREATE POLICY tenant_isolation_policy ON \"{$table}\"
            FOR ALL
            USING ({$condition})
            WITH CHECK ({$checkCondition});
        ");
    }

    public static function disableRls(string $table): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        if (! Schema::hasTable($table)) {
            return;
        }

        DB::statement("DROP POLICY IF EXISTS tenant_isolation_policy ON \"{$table}\";");
        DB::statement("ALTER TABLE \"{$table}\" DISABLE ROW LEVEL SECURITY;");
    }

    public static function enableAll(): void
    {
        foreach (self::TENANT_TABLES as $table) {
            $allowNull = in_array($table, self::NULLABLE_TENANT_TABLES, true);
            self::enableRls($table, $allowNull);
        }
    }

    public static function disableAll(): void
    {
        foreach (self::TENANT_TABLES as $table) {
            self::disableRls($table);
        }
    }
}
