<?php

namespace Tests\Feature;

use App\Modules\Tenancy\Models\Store;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PurchaseTest extends TestCase
{
    use RefreshDatabase;

    public function test_goods_receipt_increases_stock_and_the_supplier_payable(): void
    {
        $this->seed();
        $this->postJson('/api/v1/auth/platform/login', [
            'email' => 'admin@selfx.test',
            'password' => 'password',
        ])->assertOk();

        $created = $this->postJson('/api/v1/platform/catalog/products', [
            'name' => 'Toor dal 1kg',
            'gtin' => '8901001000018',
            'category_id' => DB::table($this->catalog('categories'))->where('slug', 'staples')->value('id'),
            'tax_class_id' => DB::table($this->catalog('tax_classes'))->where('hsn', '1006')->value('id'),
            'reference_mrp_paise' => 14000,
            'description' => 'Split pigeon peas packed in a one kilogram pouch.',
        ])->assertCreated();
        $this->postJson('/api/v1/platform/catalog/products/'.$created->json('data.id').'/publish')->assertOk();
        $this->postJson('/api/v1/platform/tenants', [
            'owner_name' => 'Owner',
            'email' => 'owner@annapurna.store',
            'password' => 'first-pass-1',
            'business_name' => 'Annapurna',
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
            'items' => [['master_product_id' => $created->json('data.id'), 'opening_qty' => 2]],
        ])->assertOk();
        $itemId = (string) DB::table('store_items')->value('id');

        $this->postJson("/api/v1/stores/{$storeId}/purchases", [
            'supplier_name' => 'Grain House',
            'lines' => [['store_item_id' => $itemId, 'qty' => 10, 'cost_paise' => 9000]],
        ])->assertCreated()->assertJsonPath('data.payable_paise', 90000);

        $onHand = (float) DB::table('stock_balances')->where('store_item_id', $itemId)->value('on_hand');
        $this->assertEqualsWithDelta(12, $onHand, 0.001);
        $this->assertSame(90000, (int) DB::table('supplier_ledger_entries')->value('amount_paise'));

        $this->getJson('/api/v1/reports/sales')->assertOk()->assertJsonPath('data.bills', 0);
    }

    private function catalog(string $name): string
    {
        return DB::getDriverName() === 'pgsql' ? 'catalog.'.$name : 'catalog_'.$name;
    }
}
