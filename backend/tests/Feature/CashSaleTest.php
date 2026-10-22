<?php

namespace Tests\Feature;

use App\Modules\Tenancy\Models\Store;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CashSaleTest extends TestCase
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

    public function test_cash_sale_needs_a_shift_then_drops_stock_once(): void
    {
        $body = [
            'client_uuid' => '018f1a00-0000-7000-8000-000000000001',
            'cash_tender_paise' => 25000,
            'lines' => [['store_item_id' => $this->itemId, 'qty' => 2]],
        ];

        $this->postJson("/api/v1/stores/{$this->storeId}/sales", $body)
            ->assertStatus(409)
            ->assertJsonPath('error.code', 'conflict.shift_open');

        $this->postJson("/api/v1/stores/{$this->storeId}/shifts/open", [
            'opening_cash_paise' => 100000,
        ])->assertCreated();

        $first = $this->postJson("/api/v1/stores/{$this->storeId}/sales", $body)->assertCreated();
        $second = $this->postJson("/api/v1/stores/{$this->storeId}/sales", $body)->assertCreated();

        $this->assertSame($first->json('data.id'), $second->json('data.id'));
        $this->assertSame(1, DB::table('sales')->count());
        $onHand = (float) DB::table('stock_balances')->where('store_item_id', $this->itemId)->value('on_hand');
        $this->assertEqualsWithDelta(3, $onHand, 0.001);
        $this->assertNotEmpty($first->json('data.number'));

        $closed = $this->postJson("/api/v1/stores/{$this->storeId}/shifts/close", [
            'actual_cash_paise' => 121000,
        ])->assertOk();
        $this->assertSame(121000, $closed->json('data.expected_cash_paise'));
        $this->assertSame(0, $closed->json('data.difference_paise'));

        $this->getJson('/api/v1/sales/'.$first->json('data.id').'/receipt')
            ->assertOk()
            ->assertJsonPath('data.number', $first->json('data.number'));
    }

    public function test_a_partial_return_restocks_and_cannot_exceed_the_sale(): void
    {
        $this->postJson("/api/v1/stores/{$this->storeId}/shifts/open", [
            'opening_cash_paise' => 0,
        ])->assertCreated();

        $sale = $this->postJson("/api/v1/stores/{$this->storeId}/sales", [
            'client_uuid' => '018f1a00-0000-7000-8000-000000000002',
            'cash_tender_paise' => 30000,
            'lines' => [['store_item_id' => $this->itemId, 'qty' => 2]],
        ])->assertCreated();

        $lineId = $this->getJson('/api/v1/sales/'.$sale->json('data.id').'/receipt')->json('data.lines.0.id');

        $this->postJson('/api/v1/sales/'.$sale->json('data.id').'/returns', [
            'reason' => 'Customer changed their mind',
            'lines' => [['sale_line_id' => $lineId, 'qty' => 1]],
        ])->assertCreated()->assertJsonPath('data.sale_status', 'partially_returned');

        $this->postJson('/api/v1/sales/'.$sale->json('data.id').'/returns', [
            'reason' => 'Too many',
            'lines' => [['sale_line_id' => $lineId, 'qty' => 2]],
        ])->assertStatus(422);

        $onHand = (float) DB::table('stock_balances')->where('store_item_id', $this->itemId)->value('on_hand');
        $this->assertEqualsWithDelta(4, $onHand, 0.001);
    }

    public function test_delivery_uses_the_pin_code_and_the_right_otp(): void
    {
        $this->postJson('/api/v1/public/stores/annapurna/checkout', [
            'customer_name' => 'Meera',
            'customer_phone' => '9876543210',
            'fulfillment' => 'delivery',
            'pincode' => '500081',
            'lines' => [['store_item_id' => $this->itemId, 'qty' => 1]],
        ])->assertStatus(422);

        $this->postJson("/api/v1/stores/{$this->storeId}/delivery-zones", [
            'pincode' => '500081',
            'charge_paise' => 2500,
        ])->assertOk();

        $placed = $this->postJson('/api/v1/public/stores/annapurna/checkout', [
            'customer_name' => 'Meera',
            'customer_phone' => '9876543210',
            'fulfillment' => 'delivery',
            'pincode' => '500081',
            'lines' => [['store_item_id' => $this->itemId, 'qty' => 1]],
        ])->assertCreated();
        $this->assertSame(13000, $placed->json('data.total_paise'));
        $orderId = $placed->json('data.id');

        foreach (['accepted', 'packing', 'ready'] as $status) {
            $this->postJson("/api/v1/orders/{$orderId}/transitions", ['to' => $status])->assertOk();
        }

        $dispatched = $this->postJson("/api/v1/orders/{$orderId}/transitions", ['to' => 'out_for_delivery'])->assertOk();
        $otp = $dispatched->json('data.delivery_otp');
        $this->assertSame(6, strlen((string) $otp));

        $this->postJson("/api/v1/orders/{$orderId}/transitions", ['to' => 'delivered', 'otp' => '000000'])
            ->assertUnauthorized();

        $this->postJson("/api/v1/orders/{$orderId}/transitions", ['to' => 'delivered', 'otp' => $otp])
            ->assertOk()
            ->assertJsonPath('data.status', 'delivered');

        $this->postJson('/api/v1/public/orders/track', [
            'number' => $placed->json('data.number'),
            'phone' => '9876543210',
        ])->assertOk()->assertJsonPath('data.status', 'delivered');
    }

    public function test_pickup_order_can_be_accepted_and_not_jumped(): void
    {
        $this->postJson('/api/v1/public/stores/annapurna/checkout', [
            'customer_name' => 'Meera',
            'customer_phone' => '9876543210',
            'fulfillment' => 'pickup',
            'lines' => [['store_item_id' => $this->itemId, 'qty' => 1]],
        ])->assertCreated()->assertJsonPath('data.status', 'placed');

        $orderId = DB::table('orders')->value('id');
        $this->postJson("/api/v1/orders/{$orderId}/transitions", ['to' => 'delivered'])
            ->assertStatus(409);

        $this->postJson("/api/v1/orders/{$orderId}/transitions", ['to' => 'accepted'])
            ->assertOk()
            ->assertJsonPath('data.status', 'accepted');
    }

    private function catalog(string $name): string
    {
        return DB::getDriverName() === 'pgsql' ? 'catalog.'.$name : 'catalog_'.$name;
    }
}
