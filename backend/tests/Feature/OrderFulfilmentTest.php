<?php

namespace Tests\Feature;

use App\Modules\Tenancy\Models\Store;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class OrderFulfilmentTest extends TestCase
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

    public function test_accept_reserves_stock_and_cancel_releases_it(): void
    {
        $first = $this->checkout('pickup', 4);
        $second = $this->checkout('pickup', 2);

        $this->postJson("/api/v1/orders/{$first}/transitions", ['to' => 'accepted'])->assertOk();
        $this->assertEqualsWithDelta(4, $this->reserved(), 0.001);
        $this->assertEqualsWithDelta(5, $this->onHand(), 0.001);
        $this->assertSame(0, DB::table('stock_ledger_entries')->where('reason', 'sale')->count());

        $this->postJson("/api/v1/orders/{$first}/transitions", ['to' => 'accepted'])->assertStatus(409);
        $this->assertEqualsWithDelta(4, $this->reserved(), 0.001);

        $this->postJson("/api/v1/orders/{$second}/transitions", ['to' => 'accepted'])
            ->assertStatus(409)
            ->assertJsonPath('error.code', 'conflict.insufficient_stock');
        $this->assertEqualsWithDelta(4, $this->reserved(), 0.001);

        $this->postJson("/api/v1/stores/{$this->storeId}/shifts/open", [
            'opening_cash_paise' => 0,
        ])->assertCreated();
        $this->postJson("/api/v1/stores/{$this->storeId}/sales", [
            'client_uuid' => '018f1a00-0000-7000-8000-000000000099',
            'cash_tender_paise' => 30000,
            'lines' => [['store_item_id' => $this->itemId, 'qty' => 2]],
        ])->assertStatus(409)->assertJsonPath('error.code', 'conflict.insufficient_stock');
        $this->assertEqualsWithDelta(5, $this->onHand(), 0.001);
        $this->assertEqualsWithDelta(4, $this->reserved(), 0.001);

        $this->postJson("/api/v1/orders/{$first}/transitions", ['to' => 'cancelled'])->assertOk();
        $this->assertEqualsWithDelta(0, $this->reserved(), 0.001);
        $this->postJson("/api/v1/orders/{$first}/transitions", ['to' => 'cancelled'])->assertStatus(409);
        $this->assertEqualsWithDelta(0, $this->reserved(), 0.001);

        $this->postJson("/api/v1/orders/{$second}/transitions", ['to' => 'accepted'])->assertOk();
        $this->assertEqualsWithDelta(2, $this->reserved(), 0.001);
    }

    public function test_a_reservation_older_than_a_day_is_released_when_orders_are_listed(): void
    {
        $orderId = $this->checkout('pickup', 1);
        $this->postJson("/api/v1/orders/{$orderId}/transitions", ['to' => 'accepted'])->assertOk();
        $this->assertEqualsWithDelta(1, $this->reserved(), 0.001);

        DB::table('stock_reservations')->update(['reserved_at' => now()->subHours(25)]);

        $this->getJson('/api/v1/orders')->assertOk();
        $this->assertEqualsWithDelta(0, $this->reserved(), 0.001);
        $this->assertSame('released', DB::table('stock_reservations')->value('status'));
        $this->assertSame('accepted', DB::table('orders')->where('id', $orderId)->value('status'));
    }

    public function test_cod_delivery_creates_one_sale_and_deducts_on_hand(): void
    {
        $this->postJson("/api/v1/stores/{$this->storeId}/delivery-zones", [
            'pincode' => '500081',
            'charge_paise' => 2500,
        ])->assertOk();

        $placed = $this->postJson('/api/v1/public/stores/annapurna/checkout', [
            'customer_name' => 'Meera',
            'customer_phone' => '9876543210',
            'fulfillment' => 'delivery',
            'payment_method' => 'cod',
            'pincode' => '500081',
            'lines' => [['store_item_id' => $this->itemId, 'qty' => 5]],
        ])->assertCreated();
        $orderId = $placed->json('data.id');
        $this->assertSame(55000, $placed->json('data.total_paise'));

        foreach (['accepted', 'packing', 'ready'] as $status) {
            $this->postJson("/api/v1/orders/{$orderId}/transitions", ['to' => $status])->assertOk();
        }
        $this->assertSame(0, DB::table('sales')->count());
        $this->assertEqualsWithDelta(5, $this->reserved(), 0.001);

        $dispatched = $this->postJson("/api/v1/orders/{$orderId}/transitions", ['to' => 'out_for_delivery'])->assertOk();
        $otp = $dispatched->json('data.delivery_otp');

        $delivered = $this->postJson("/api/v1/orders/{$orderId}/transitions", [
            'to' => 'delivered',
            'otp' => $otp,
        ])->assertOk();
        $this->assertNotEmpty($delivered->json('data.sale_id'));
        $this->assertSame(1, DB::table('sales')->count());
        $this->assertSame($delivered->json('data.sale_id'), DB::table('sales')->value('id'));
        $this->assertSame($orderId, DB::table('sales')->value('order_id'));
        $this->assertSame(55000, (int) DB::table('sales')->value('total_paise'));
        $this->assertSame('cod', DB::table('sale_payments')->value('method'));
        $this->assertSame(55000, (int) DB::table('sale_payments')->value('amount_paise'));
        $this->assertEqualsWithDelta(0, $this->onHand(), 0.001);
        $this->assertEqualsWithDelta(0, $this->reserved(), 0.001);
        $this->assertEqualsWithDelta(-5, (float) DB::table('stock_ledger_entries')->where('reason', 'sale')->sum('qty_delta'), 0.001);

        $this->postJson("/api/v1/orders/{$orderId}/transitions", [
            'to' => 'delivered',
            'otp' => $otp,
        ])->assertStatus(409);
        $this->assertSame(1, DB::table('sales')->count());
        $this->assertSame(1, DB::table('stock_ledger_entries')->where('reason', 'sale')->count());
    }

    public function test_pay_at_store_pickup_is_invoiced_when_picked_up(): void
    {
        $orderId = $this->checkout('pickup', 1);
        $this->postJson("/api/v1/orders/{$orderId}/transitions", ['to' => 'accepted'])
            ->assertOk()
            ->assertJsonPath('data.sale_id', null);
        $this->assertSame(0, DB::table('sales')->count());

        foreach (['packing', 'ready', 'ready_for_pickup'] as $status) {
            $this->postJson("/api/v1/orders/{$orderId}/transitions", ['to' => $status])->assertOk();
            $this->assertSame(0, DB::table('sales')->count());
        }

        $picked = $this->postJson("/api/v1/orders/{$orderId}/transitions", ['to' => 'picked_up'])->assertOk();
        $this->assertNotEmpty($picked->json('data.sale_id'));
        $this->assertSame(1, DB::table('sales')->count());
        $this->assertSame('pay_at_store', DB::table('sale_payments')->value('method'));
        $this->assertSame((int) DB::table('orders')->where('id', $orderId)->value('total_paise'), (int) DB::table('sales')->value('total_paise'));
        $this->assertEqualsWithDelta(4, $this->onHand(), 0.001);
        $this->assertEqualsWithDelta(0, $this->reserved(), 0.001);
    }

    private function checkout(string $fulfillment, float $qty): string
    {
        return $this->postJson('/api/v1/public/stores/annapurna/checkout', [
            'customer_name' => 'Meera',
            'customer_phone' => '9876543210',
            'fulfillment' => $fulfillment,
            'lines' => [['store_item_id' => $this->itemId, 'qty' => $qty]],
        ])->assertCreated()->json('data.id');
    }

    private function reserved(): float
    {
        return (float) DB::table('stock_balances')->where('store_item_id', $this->itemId)->value('reserved');
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
