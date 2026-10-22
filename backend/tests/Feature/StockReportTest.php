<?php

namespace Tests\Feature;

use App\Modules\Tenancy\Models\Store;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class StockReportTest extends TestCase
{
    use RefreshDatabase;

    public function test_stock_is_valued_at_the_latest_receipt_cost_and_unsold_items_are_slow(): void
    {
        $this->seed();
        $this->postJson('/api/v1/auth/platform/login', [
            'email' => 'admin@selfx.test',
            'password' => 'password',
        ])->assertOk();
        $rice = $this->product('Basmati rice 5kg', '8901001000018');
        $milk = $this->product('Whole milk 1L', '8901001000025');
        $this->postJson('/api/v1/platform/tenants', [
            'owner_name' => 'Ananya Shah',
            'email' => 'owner@annapurna.store',
            'password' => 'first-pass-1',
            'business_name' => 'Annapurna Stores',
            'slug' => 'annapurna',
            'kind' => 'single_store',
            'plan_code' => 'starter',
        ])->assertCreated();
        $storeId = (string) Store::query()->value('id');
        $this->postJson('/api/v1/auth/platform/logout')->assertOk();
        $this->postJson('/api/v1/auth/staff/login', [
            'email' => 'owner@annapurna.store',
            'password' => 'first-pass-1',
            'slug' => 'annapurna',
        ])->assertOk();
        $this->changeRequiredPassword();
        $this->postJson("/api/v1/stores/{$storeId}/items/from-catalog", [
            'margin_bps' => 0,
            'items' => [
                ['master_product_id' => $rice, 'opening_qty' => 5],
                ['master_product_id' => $milk, 'opening_qty' => 2],
            ],
        ])->assertOk();
        $riceItem = (string) DB::table('store_items')->where('master_product_id', $rice)->value('id');
        $milkItem = (string) DB::table('store_items')->where('master_product_id', $milk)->value('id');

        $this->getJson('/api/v1/reports/stock')->assertOk()->assertJsonPath('data.total_paise', 0);

        $this->postJson("/api/v1/stores/{$storeId}/purchases", [
            'supplier_name' => 'Hill Grain',
            'lines' => [['store_item_id' => $riceItem, 'qty' => 2, 'cost_paise' => 4000]],
        ])->assertCreated();
        $valued = $this->getJson('/api/v1/reports/stock')->assertOk();
        $this->assertSame(28000, $valued->json('data.total_paise'));

        $this->postJson("/api/v1/stores/{$storeId}/shifts/open", ['opening_cash_paise' => 0])->assertCreated();
        $this->postJson("/api/v1/stores/{$storeId}/sales", [
            'client_uuid' => '018f1a00-0000-7000-8000-0000000000c1',
            'cash_tender_paise' => 10500,
            'lines' => [['store_item_id' => $riceItem, 'qty' => 1]],
        ])->assertCreated();

        $after = $this->getJson('/api/v1/reports/stock')->assertOk();
        $this->assertSame(24000, $after->json('data.total_paise'));
        $riceLine = collect($after->json('data.lines'))->firstWhere('id', $riceItem);
        $this->assertSame(4000, $riceLine['unit_cost_paise']);
        $this->assertEqualsWithDelta(6, $riceLine['on_hand'], 0.001);

        $movement = $this->getJson('/api/v1/reports/products')->assertOk();
        $this->assertSame($riceItem, $movement->json('data.best.0.id'));
        $this->assertEqualsWithDelta(1, $movement->json('data.best.0.qty'), 0.001);
        $this->assertSame($milkItem, $movement->json('data.slow.0.id'));
        $this->assertNotContains($riceItem, collect($movement->json('data.slow'))->pluck('id')->all());
    }

    private function product(string $name, string $gtin): string
    {
        $created = $this->postJson('/api/v1/platform/catalog/products', [
            'name' => $name,
            'gtin' => $gtin,
            'category_id' => DB::table($this->catalog('categories'))->where('slug', 'staples')->value('id'),
            'tax_class_id' => DB::table($this->catalog('tax_classes'))->where('hsn', '1006')->value('id'),
            'reference_mrp_paise' => 10500,
            'description' => 'A household grocery pack sold by weight or volume.',
        ])->assertCreated();
        $this->postJson('/api/v1/platform/catalog/products/'.$created->json('data.id').'/publish')->assertOk();

        return (string) $created->json('data.id');
    }

    private function catalog(string $name): string
    {
        return DB::getDriverName() === 'pgsql' ? 'catalog.'.$name : 'catalog_'.$name;
    }
}
