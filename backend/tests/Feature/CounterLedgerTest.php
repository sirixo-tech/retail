<?php

namespace Tests\Feature;

use App\Modules\Tenancy\Models\Store;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class CounterLedgerTest extends TestCase
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
            'plan_code' => 'professional',
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
            'items' => [['master_product_id' => $created->json('data.id'), 'opening_qty' => 8]],
        ])->assertOk();
        $this->itemId = (string) DB::table('store_items')->value('id');
    }

    public function test_drawer_count_khata_reorder_and_stale_holds(): void
    {
        $this->patchJson("/api/v1/stores/{$this->storeId}/items/{$this->itemId}/reorder", [
            'reorder_point' => 10,
        ])->assertOk();
        $this->getJson("/api/v1/stores/{$this->storeId}/stock/alerts")->assertOk()->assertJsonCount(1, 'data');
        $this->patchJson("/api/v1/stores/{$this->storeId}/items/{$this->itemId}/reorder", [
            'reorder_point' => 0,
        ])->assertOk();
        $this->getJson("/api/v1/stores/{$this->storeId}/stock/alerts")->assertOk()->assertJsonCount(0, 'data');

        $this->putJson("/api/v1/stores/{$this->storeId}/quick-keys", [
            'keys' => [
                ['store_item_id' => $this->itemId, 'position' => 1],
                ['store_item_id' => $this->itemId, 'position' => 2],
            ],
        ])->assertStatus(422);
        $this->putJson("/api/v1/stores/{$this->storeId}/quick-keys", [
            'keys' => [['store_item_id' => $this->itemId, 'position' => 1]],
        ])->assertOk();
        $this->getJson("/api/v1/stores/{$this->storeId}/quick-keys")
            ->assertOk()
            ->assertJsonPath('data.0.position', 1);

        $this->postJson("/api/v1/stores/{$this->storeId}/shifts/open", ['opening_cash_paise' => 0])->assertCreated();
        $cash = $this->postJson("/api/v1/stores/{$this->storeId}/sales", [
            'client_uuid' => '018f1a00-0000-7000-8000-0000000000c1',
            'cash_tender_paise' => 20000,
            'lines' => [['store_item_id' => $this->itemId, 'qty' => 1]],
        ])->assertCreated();
        $total = (int) $cash->json('data.total_paise');

        $customer = $this->postJson('/api/v1/customers', [
            'name' => 'Meera',
            'phone' => '9876543210',
        ])->assertCreated();
        $this->postJson("/api/v1/stores/{$this->storeId}/sales", [
            'client_uuid' => '018f1a00-0000-7000-8000-0000000000c2',
            'cash_tender_paise' => 0,
            'payments' => [['method' => 'khata', 'amount_paise' => $total]],
            'lines' => [['store_item_id' => $this->itemId, 'qty' => 1]],
        ])->assertStatus(422);
        $this->postJson("/api/v1/stores/{$this->storeId}/sales", [
            'client_uuid' => '018f1a00-0000-7000-8000-0000000000c3',
            'cash_tender_paise' => 0,
            'customer_id' => $customer->json('data.id'),
            'payments' => [['method' => 'khata', 'amount_paise' => $total]],
            'lines' => [['store_item_id' => $this->itemId, 'qty' => 1]],
        ])->assertCreated();
        $this->assertSame($total, (int) DB::table('customers')->value('khata_balance_paise'));

        $this->getJson("/api/v1/stores/{$this->storeId}/shifts/reading")
            ->assertOk()
            ->assertJsonPath('data.expected_paise', $total);

        $payments = $this->getJson('/api/v1/reports/payments')->assertOk();
        $this->assertSame('cash', $payments->json('data.0.method'));
        $this->assertSame('khata', $payments->json('data.1.method'));

        $tally = $this->get('/api/v1/reports/sales?format=tally')->assertOk();
        $this->assertStringContainsString('Output CGST', $tally->getContent());
        $this->assertStringContainsString('Khata', $tally->getContent());

        $this->postJson("/api/v1/stores/{$this->storeId}/shifts/close", [
            'actual_cash_paise' => $total,
            'denominations' => [['value_paise' => 300, 'count' => 1]],
        ])->assertStatus(422);
        $this->postJson("/api/v1/stores/{$this->storeId}/shifts/close", [
            'actual_cash_paise' => $total,
            'denominations' => [['value_paise' => 500, 'count' => 1]],
        ])->assertStatus(422);
        $notes = (int) ($total / 500);
        $this->postJson("/api/v1/stores/{$this->storeId}/shifts/close", [
            'actual_cash_paise' => $total,
            'denominations' => [['value_paise' => 500, 'count' => $notes]],
        ])->assertOk();
        $this->assertSame($notes, (int) DB::table('denomination_counts')->value('count'));

        $held = $this->postJson('/api/v1/public/stores/annapurna/checkout', [
            'customer_name' => 'Meera',
            'customer_phone' => '9876543210',
            'fulfillment' => 'pickup',
            'lines' => [['store_item_id' => $this->itemId, 'qty' => 1]],
        ])->assertCreated()->json('data.id');
        $fresh = $this->postJson('/api/v1/public/stores/annapurna/checkout', [
            'customer_name' => 'Ravi',
            'customer_phone' => '9876543211',
            'fulfillment' => 'pickup',
            'lines' => [['store_item_id' => $this->itemId, 'qty' => 1]],
        ])->assertCreated()->json('data.id');
        $this->postJson("/api/v1/orders/{$held}/transitions", ['to' => 'accepted'])->assertOk();
        $this->postJson("/api/v1/orders/{$fresh}/transitions", ['to' => 'accepted'])->assertOk();
        DB::table('stock_reservations')->where('order_id', $held)->update(['reserved_at' => now()->subHours(48)]);

        $this->artisan('stock:release-reservations')->assertSuccessful();

        $this->assertSame('released', DB::table('stock_reservations')->where('order_id', $held)->value('status'));
        $this->assertSame('reserved', DB::table('stock_reservations')->where('order_id', $fresh)->value('status'));
        $this->assertNotEmpty(Str::uuid7());
    }

    private function catalog(string $name): string
    {
        return DB::getDriverName() === 'pgsql' ? 'catalog.'.$name : 'catalog_'.$name;
    }
}
