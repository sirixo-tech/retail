<?php

namespace Tests\Feature;

use App\Modules\Catalog\Models\Product;
use App\Modules\Inventory\Models\StoreItem;
use App\Modules\Tenancy\Models\Store;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class ImplementationPlanFeaturesTest extends TestCase
{
    use RefreshDatabase;

    private string $storeId;
    private string $tenantId;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();

        // 1. Platform Login & Create Published Catalog Product
        $this->postJson('/api/v1/auth/platform/login', [
            'email' => 'admin@selfx.test',
            'password' => 'password',
        ])->assertOk();

        $catId = DB::table($this->catalog('categories'))->where('slug', 'staples')->value('id');
        $taxId = DB::table($this->catalog('tax_classes'))->where('hsn', '1006')->value('id');

        $created = $this->postJson('/api/v1/platform/catalog/products', [
            'name' => 'Royal Sona Masoori 10kg',
            'gtin' => '8901234567890',
            'category_id' => $catId,
            'tax_class_id' => $taxId,
            'reference_mrp_paise' => 85000,
            'description' => 'Premium aged rice.',
        ])->assertCreated();

        $masterProductId = $created->json('data.id');
        $this->postJson("/api/v1/platform/catalog/products/{$masterProductId}/publish")->assertOk();

        // 2. Create Tenant
        $this->postJson('/api/v1/platform/tenants', [
            'owner_name' => 'Kavitha Raman',
            'email' => 'owner@kavitha.store',
            'password' => 'first-pass-1',
            'business_name' => 'Kavitha Supermarket',
            'slug' => 'kavitha',
            'kind' => 'single_store',
            'plan_code' => 'starter',
        ])->assertCreated();

        $tenant = Tenant::where('slug', 'kavitha')->firstOrFail();
        $this->tenantId = $tenant->id;
        $this->storeId = (string) Store::where('tenant_id', $this->tenantId)->value('id');

        // Logout platform, login tenant owner
        $this->postJson('/api/v1/auth/platform/logout')->assertOk();
        $this->postJson('/api/v1/auth/staff/login', [
            'email' => 'owner@kavitha.store',
            'password' => 'first-pass-1',
            'slug' => 'kavitha',
        ])->assertOk();

        $this->changeRequiredPassword();
    }

    public function test_health_check_endpoint(): void
    {
        $response = $this->get('/health');
        $response->assertOk()
            ->assertJsonPath('status', 'healthy')
            ->assertJsonStructure([
                'status',
                'timestamp',
                'checks' => ['database', 'cache', 'storage', 'queue'],
            ]);
    }

    public function test_performance_monitoring_headers_are_attached(): void
    {
        $response = $this->get('/health');
        $response->assertHeader('X-Response-Time');
        $response->assertHeader('X-Memory-Usage');
    }

    public function test_catalog_search_filters_and_bulk_add(): void
    {
        // 1. Search catalog with pagination and query
        $res = $this->getJson('/api/v1/catalog/products?q=Masoori&page=1&per_page=10');
        $res->assertOk();
        $this->assertArrayHasKey('data', $res->json());
        $this->assertArrayHasKey('meta', $res->json());

        $products = $res->json('data');
        $this->assertNotEmpty($products);
        $masterId = $products[0]['id'];

        // 2. Bulk Add to store
        $bulkRes = $this->postJson("/api/v1/stores/{$this->storeId}/items/bulk-from-catalog", [
            'master_product_ids' => [$masterId],
            'margin_bps' => 1000,
        ]);
        $bulkRes->assertOk();
        $this->assertEquals(1, $bulkRes->json('data.added'));

        // 3. Verify StoreItem and CatalogSubscription created
        $storeItem = StoreItem::where('tenant_id', $this->tenantId)->first();
        $this->assertNotNull($storeItem);

        // 4. Test Subscription endpoints
        $subRes = $this->getJson("/api/v1/catalog/own/products/{$storeItem->id}/subscription");
        $subRes->assertOk()
            ->assertJsonPath('data.auto_update_name', true)
            ->assertJsonPath('data.auto_update_price', false);

        $updateSub = $this->postJson("/api/v1/catalog/own/products/{$storeItem->id}/subscription", [
            'auto_update_price' => true,
        ]);
        $updateSub->assertOk()
            ->assertJsonPath('data.auto_update_price', true);
    }

    public function test_stock_alerts_management_and_po_generation(): void
    {
        // Insert a test stock alert
        $alertId = (string) Str::uuid7();
        DB::table('stock_alerts')->insert([
            'id' => $alertId,
            'tenant_id' => $this->tenantId,
            'store_id' => $this->storeId,
            'alert_type' => 'low_stock',
            'item_count' => 1,
            'items' => json_encode([
                [
                    'store_item_id' => (string) Str::uuid7(),
                    'sku' => 'SKU-RICE-01',
                    'name' => 'Royal Sona Masoori',
                    'current_qty' => 3,
                    'reorder_point' => 10,
                    'reorder_quantity' => 20,
                ],
            ]),
            'created_at' => now(),
        ]);

        // List alerts
        $res = $this->getJson('/api/v1/inventory/alerts');
        $res->assertOk();
        $this->assertGreaterThanOrEqual(1, count($res->json('data.data')));

        // Acknowledge alert
        $ackRes = $this->postJson("/api/v1/inventory/alerts/{$alertId}/acknowledge");
        $ackRes->assertOk();
        $this->assertNotNull($ackRes->json('data.acknowledged_at'));

        // Generate PO from alert
        $poRes = $this->postJson("/api/v1/inventory/alerts/{$alertId}/generate-po");
        $poRes->assertOk()
            ->assertJsonStructure(['data' => ['po_number_draft', 'lines']]);
        $this->assertEquals('SKU-RICE-01', $poRes->json('data.lines.0.sku'));
    }

    public function test_stock_batches_creation_and_expiry_tracking(): void
    {
        // Create a store item
        $item = StoreItem::create([
            'id' => (string) Str::uuid7(),
            'tenant_id' => $this->tenantId,
            'store_id' => $this->storeId,
            'sku' => 'MED-PARA-500',
            'name_override' => 'Paracetamol 500mg',
            'cost_paise' => 1500,
            'pricing_strategy' => 'retail',
            'enable_batch_tracking' => true,
        ]);

        // Create batch
        $batchRes = $this->postJson("/api/v1/inventory/items/{$item->id}/batches", [
            'batch_number' => 'BATCH-2026-X',
            'manufacturing_date' => now()->subMonths(2)->toDateString(),
            'expiry_date' => now()->addDays(15)->toDateString(),
            'qty' => 100,
            'cost_paise' => 1500,
        ]);
        $batchRes->assertCreated();
        $batchId = $batchRes->json('data.id');

        // Check batches for item
        $listRes = $this->getJson("/api/v1/inventory/items/{$item->id}/batches");
        $listRes->assertOk();
        $this->assertCount(1, $listRes->json('data'));

        // Check expiring batches (within 30 days)
        $expiringRes = $this->getJson('/api/v1/inventory/batches/expiring?days=30');
        $expiringRes->assertOk();
        $this->assertNotEmpty($expiringRes->json('data'));

        // Mark expired
        $markRes = $this->postJson("/api/v1/inventory/batches/{$batchId}/mark-expired");
        $markRes->assertOk()
            ->assertJsonPath('data.status', 'expired');
    }

    public function test_financial_and_inventory_reports(): void
    {
        // 1. Profit & Loss
        $plRes = $this->getJson('/api/v1/reports/profit-loss');
        $plRes->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'revenue_paise',
                    'cogs_paise',
                    'gross_profit_paise',
                    'gross_margin_percent',
                    'net_profit_paise',
                ],
            ]);

        // 2. Cash Flow
        $cfRes = $this->getJson('/api/v1/reports/cash-flow');
        $cfRes->assertOk()
            ->assertJsonStructure([
                'data' => ['inflows', 'outflows', 'net_cash_flow_paise'],
            ]);

        // 3. Balance Sheet
        $bsRes = $this->getJson('/api/v1/reports/balance-sheet');
        $bsRes->assertOk()
            ->assertJsonStructure([
                'data' => ['assets', 'liabilities', 'equity_paise'],
            ]);

        // 4. Dead Stock
        $deadRes = $this->getJson('/api/v1/reports/inventory/dead-stock?days=30');
        $deadRes->assertOk()
            ->assertJsonStructure([
                'data' => ['days_threshold', 'item_count', 'total_blocked_value_paise', 'items'],
            ]);

        // 5. Stock Aging
        $agingRes = $this->getJson('/api/v1/reports/inventory/aging');
        $agingRes->assertOk()
            ->assertJsonStructure([
                'data' => ['total_items', 'total_value_paise', 'buckets'],
            ]);

        // 6. Fast Moving & Slow Moving
        $fastRes = $this->getJson('/api/v1/reports/inventory/fast-moving');
        $fastRes->assertOk();

        $slowRes = $this->getJson('/api/v1/reports/inventory/slow-moving');
        $slowRes->assertOk();
    }

    public function test_gstr1_report_preview_and_download(): void
    {
        $month = now()->format('Y-m');

        // Preview
        $previewRes = $this->getJson("/api/v1/reports/gstr1/{$month}/preview");
        $previewRes->assertOk()
            ->assertJsonStructure([
                'data' => ['b2b_count', 'b2c_total', 'hsn_count', 'total_turnover'],
            ]);

        // Download JSON
        $downloadRes = $this->getJson("/api/v1/reports/gstr1/{$month}");
        $downloadRes->assertOk()
            ->assertHeader('Content-Disposition', "attachment; filename=\"gstr1_{$month}.json\"")
            ->assertJsonStructure([
                'gstin',
                'fp',
                'b2b',
                'b2cl',
                'b2cs',
                'hsn',
            ]);
    }

    private function catalog(string $name): string
    {
        return DB::getDriverName() === 'pgsql' ? 'catalog.'.$name : 'catalog_'.$name;
    }
}
