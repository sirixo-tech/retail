<?php

namespace Tests\Feature;

use App\Modules\Inventory\Models\StoreItem;
use App\Modules\Tenancy\Models\Store;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class StoreItemTest extends TestCase
{
    use RefreshDatabase;

    private string $storeId;

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
            'reference_mrp_paise' => 62000,
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
    }

    public function test_catalog_add_writes_price_and_a_ledger_that_matches_the_balance(): void
    {
        $master = DB::table($this->catalog('products'))->value('id');

        $this->postJson("/api/v1/stores/{$this->storeId}/items/from-catalog", [
            'margin_bps' => 1000,
            'items' => [['master_product_id' => $master, 'opening_qty' => 4]],
        ])->assertOk()
            ->assertJsonPath('data.added.0.selling_price_paise', 55800)
            ->assertJsonPath('data.added.0.on_hand', '4');

        $this->postJson("/api/v1/stores/{$this->storeId}/items/from-catalog", [
            'margin_bps' => 1000,
            'items' => [['master_product_id' => $master, 'opening_qty' => 9]],
        ])->assertOk();

        $this->assertSame(1, StoreItem::query()->count());

        $itemId = StoreItem::query()->value('id');
        $this->postJson("/api/v1/stores/{$this->storeId}/adjustments", [
            'store_item_id' => $itemId,
            'qty_delta' => -1.5,
            'reason' => 'sale',
        ])->assertOk();

        $sum = (float) DB::table('stock_ledger_entries')->where('store_item_id', $itemId)->sum('qty_delta');
        $onHand = (float) DB::table('stock_balances')->where('store_item_id', $itemId)->value('on_hand');
        $this->assertEqualsWithDelta(2.5, $sum, 0.001);
        $this->assertEqualsWithDelta($sum, $onHand, 0.001);

        StoreItem::query()->find($itemId)->delete();
        $this->assertSame(2, DB::table('stock_ledger_entries')->count());
        $this->assertSame(0, StoreItem::query()->count());

        $this->getJson("/api/v1/stores/{$this->storeId}/pos/lookup?code=8901001000018")
            ->assertNotFound();
    }

    public function test_lookup_returns_the_store_price(): void
    {
        $master = DB::table($this->catalog('products'))->value('id');
        $this->postJson("/api/v1/stores/{$this->storeId}/items/from-catalog", [
            'margin_bps' => 0,
            'items' => [['master_product_id' => $master]],
        ])->assertOk();

        $this->getJson("/api/v1/stores/{$this->storeId}/pos/lookup?code=".rawurlencode('https://id.gs1.org/01/8901001000018'))
            ->assertOk()
            ->assertJsonPath('data.name', 'Basmati rice 5kg')
            ->assertJsonPath('data.selling_price_paise', 62000);
    }

    private function catalog(string $name): string
    {
        return DB::getDriverName() === 'pgsql' ? 'catalog.'.$name : 'catalog_'.$name;
    }
}
