<?php

namespace Tests\Feature;

use App\Modules\Tenancy\Models\Store;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class StockCountTest extends TestCase
{
    use RefreshDatabase;

    private string $storeId;

    private string $itemId;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
        $this->postJson('/api/v1/auth/platform/login', [
            'email' => 'admin@selfx.test',
            'password' => 'password',
        ])->assertOk();
        $created = $this->postJson('/api/v1/platform/catalog/products', [
            'name' => 'Basmati rice 5kg',
            'gtin' => '8901001000018',
            'category_id' => DB::table($this->catalog('categories'))->where('slug', 'staples')->value('id'),
            'tax_class_id' => DB::table($this->catalog('tax_classes'))->where('hsn', '1006')->value('id'),
            'reference_mrp_paise' => 10500,
            'description' => 'Aged basmati rice in a five kilogram bag for the household.',
        ])->assertCreated();
        $this->postJson('/api/v1/platform/catalog/products/'.$created->json('data.id').'/publish')->assertOk();
        $this->postJson('/api/v1/platform/tenants', [
            'owner_name' => 'Ananya Shah',
            'email' => 'owner@annapurna.store',
            'password' => 'first-pass-1',
            'business_name' => 'Annapurna Stores',
            'slug' => 'annapurna',
            'kind' => 'single_store',
            'plan_code' => 'starter',
        ])->assertCreated();
        $this->storeId = (string) Store::query()->value('id');
        $this->postJson('/api/v1/auth/platform/logout')->assertOk();
        $this->postJson('/api/v1/auth/staff/login', [
            'email' => 'owner@annapurna.store',
            'password' => 'first-pass-1',
            'slug' => 'annapurna',
        ])->assertOk();
        $this->changeRequiredPassword();
        $this->postJson("/api/v1/stores/{$this->storeId}/items/from-catalog", [
            'margin_bps' => 0,
            'items' => [['master_product_id' => $created->json('data.id'), 'opening_qty' => 5]],
        ])->assertOk();
        $this->itemId = (string) DB::table('store_items')->value('id');
    }

    public function test_a_count_corrects_stock_and_a_supplier_return_reduces_what_is_owed(): void
    {
        $this->postJson("/api/v1/stores/{$this->storeId}/counts", [
            'lines' => [['store_item_id' => $this->itemId, 'counted_qty' => 3]],
        ])->assertCreated()->assertJsonPath('data.adjustments', 1);
        $this->assertEqualsWithDelta(3, $this->onHand(), 0.001);
        $this->assertEqualsWithDelta(-2, (float) DB::table('stock_ledger_entries')->where('reason', 'correction')->sum('qty_delta'), 0.001);

        $this->postJson("/api/v1/stores/{$this->storeId}/counts", [
            'lines' => [['store_item_id' => $this->itemId, 'counted_qty' => 3]],
        ])->assertCreated()->assertJsonPath('data.adjustments', 0);
        $this->assertEqualsWithDelta(3, $this->onHand(), 0.001);

        $receipt = $this->postJson("/api/v1/stores/{$this->storeId}/purchases", [
            'supplier_name' => 'Hill Grain',
            'lines' => [['store_item_id' => $this->itemId, 'qty' => 2, 'cost_paise' => 4000]],
        ])->assertCreated();
        $this->assertEqualsWithDelta(5, $this->onHand(), 0.001);

        $this->postJson("/api/v1/stores/{$this->storeId}/purchase-returns", [
            'supplier_id' => $receipt->json('data.supplier_id'),
            'store_item_id' => $this->itemId,
            'qty' => 1,
            'cost_paise' => 4000,
        ])->assertCreated()->assertJsonPath('data.amount_paise', 4000);
        $this->assertEqualsWithDelta(4, $this->onHand(), 0.001);
        $credit = (int) DB::table('supplier_ledger_entries')->where('direction', 'credit')->sum('amount_paise');
        $debit = (int) DB::table('supplier_ledger_entries')->where('direction', 'debit')->sum('amount_paise');
        $this->assertSame(4000, $credit - $debit);

        $this->postJson("/api/v1/stores/{$this->storeId}/purchase-returns", [
            'supplier_id' => $receipt->json('data.supplier_id'),
            'store_item_id' => $this->itemId,
            'qty' => 10,
            'cost_paise' => 4000,
        ])->assertStatus(409)->assertJsonPath('error.code', 'conflict.insufficient_stock');

        $orderId = $this->postJson('/api/v1/public/stores/annapurna/checkout', [
            'customer_name' => 'Meera',
            'customer_phone' => '9876543210',
            'fulfillment' => 'pickup',
            'lines' => [['store_item_id' => $this->itemId, 'qty' => 4]],
        ])->assertCreated()->json('data.id');
        $this->postJson("/api/v1/orders/{$orderId}/transitions", ['to' => 'accepted'])->assertOk();
        $this->postJson("/api/v1/stores/{$this->storeId}/counts", [
            'lines' => [['store_item_id' => $this->itemId, 'counted_qty' => 3]],
        ])->assertStatus(409);
        $this->assertEqualsWithDelta(4, $this->onHand(), 0.001);
    }

    private function onHand(): float
    {
        return (float) DB::table('stock_balances')->where('store_item_id', $this->itemId)->value('on_hand');
    }

    private function catalog(string $name): string
    {
        return DB::getDriverName() === 'pgsql' ? 'catalog.'.$name : 'catalog_'.$name;
    }
}
