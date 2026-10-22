<?php

namespace Tests\Feature;

use App\Modules\Tenancy\Models\Store;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CounterDeskTest extends TestCase
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
            'items' => [['master_product_id' => $created->json('data.id'), 'opening_qty' => 5]],
        ])->assertOk();
        $this->itemId = (string) DB::table('store_items')->value('id');
        $this->postJson("/api/v1/stores/{$this->storeId}/shifts/open", ['opening_cash_paise' => 0])->assertCreated();
    }

    public function test_price_override_split_tender_pick_list_loyalty_and_shift_report(): void
    {
        $this->postJson("/api/v1/stores/{$this->storeId}/sales", [
            'client_uuid' => '018f1a00-0000-7000-8000-0000000000c1',
            'cash_tender_paise' => 5000,
            'lines' => [['store_item_id' => $this->itemId, 'qty' => 1, 'unit_price_paise' => 5000]],
        ])->assertStatus(422)->assertJsonPath('error.code', 'price.reason');

        $overridden = $this->postJson("/api/v1/stores/{$this->storeId}/sales", [
            'client_uuid' => '018f1a00-0000-7000-8000-0000000000c2',
            'cash_tender_paise' => 5000,
            'lines' => [['store_item_id' => $this->itemId, 'qty' => 1, 'unit_price_paise' => 5000, 'price_reason' => 'Short dated']],
        ])->assertCreated();
        $this->assertSame(5000, $overridden->json('data.total_paise'));

        $split = $this->postJson("/api/v1/stores/{$this->storeId}/sales", [
            'client_uuid' => '018f1a00-0000-7000-8000-0000000000c3',
            'cash_tender_paise' => 0,
            'payments' => [
                ['method' => 'upi', 'amount_paise' => 5500],
                ['method' => 'cash', 'amount_paise' => 5000],
            ],
            'lines' => [['store_item_id' => $this->itemId, 'qty' => 1]],
        ])->assertCreated();
        $this->assertSame(10500, $split->json('data.total_paise'));
        $this->assertSame(2, DB::table('sale_payments')->where('sale_id', $split->json('data.id'))->count());

        $customerId = $this->postJson('/api/v1/customers', ['name' => 'Meera', 'phone' => '9876543210'])->assertCreated()->json('data.id');
        $this->postJson("/api/v1/stores/{$this->storeId}/sales", [
            'client_uuid' => '018f1a00-0000-7000-8000-0000000000c4',
            'cash_tender_paise' => 10500,
            'customer_id' => $customerId,
            'lines' => [['store_item_id' => $this->itemId, 'qty' => 1]],
        ])->assertCreated();
        $this->getJson('/api/v1/public/stores/annapurna/loyalty?phone=9876543210')
            ->assertOk()
            ->assertJsonPath('data.points', 105)
            ->assertJsonPath('data.tier', 'bronze');

        $orderId = $this->postJson('/api/v1/public/stores/annapurna/checkout', [
            'customer_name' => 'Meera',
            'customer_phone' => '9876543210',
            'fulfillment' => 'pickup',
            'lines' => [['store_item_id' => $this->itemId, 'qty' => 1]],
        ])->assertCreated()->json('data.id');
        $this->postJson("/api/v1/orders/{$orderId}/transitions", ['to' => 'accepted'])->assertOk();
        $this->getJson('/api/v1/pick-list')->assertOk()->assertJsonPath('data.0.number', DB::table('orders')->where('id', $orderId)->value('number'));

        $this->postJson("/api/v1/stores/{$this->storeId}/shifts/close", ['actual_cash_paise' => 0])->assertOk();
        $this->getJson('/api/v1/reports/shifts')->assertOk()->assertJsonPath('data.0.status', null);
        $this->assertNotNull($this->getJson('/api/v1/reports/shifts')->json('data.0.expected_cash_paise'));
        $this->getJson('/api/v1/audit?q=staff')->assertOk();
    }

    private function catalog(string $name): string
    {
        return DB::getDriverName() === 'pgsql' ? 'catalog.'.$name : 'catalog_'.$name;
    }
}
