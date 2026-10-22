<?php

namespace Tests\Feature;

use App\Modules\Tenancy\Models\Store;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PrepaidGatewayTest extends TestCase
{
    use RefreshDatabase;

    private string $storeId;

    private string $itemId;

    private string $secret = 'rzp_test_secret_value';

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

    public function test_prepaid_keys_stay_encrypted_and_a_webhook_bills_once(): void
    {
        $this->patchJson('/api/v1/gateways/razorpay', ['status' => 'active'])->assertStatus(422);
        $this->putJson('/api/v1/gateways/razorpay/credentials', [
            'key_id' => 'rzp_live_should_fail',
            'key_secret' => 'live-secret-value',
            'mode' => 'live',
        ])->assertStatus(422);

        $saved = $this->putJson('/api/v1/gateways/razorpay/credentials', [
            'key_id' => 'rzp_test_annapurna',
            'key_secret' => $this->secret,
            'mode' => 'test',
        ])->assertOk();
        $this->assertStringNotContainsString($this->secret, $saved->getContent());
        $this->assertTrue($saved->json('data.2.has_credentials'));
        $cipher = (string) DB::table('payment_gateways')->where('provider', 'razorpay')->value('credentials_ciphertext');
        $this->assertStringNotContainsString($this->secret, $cipher);
        $this->assertSame($this->secret, json_decode(Crypt::decryptString($cipher), true)['key_secret']);

        $this->patchJson('/api/v1/gateways/razorpay', ['status' => 'active', 'mode' => 'test'])->assertOk();

        $placed = $this->postJson('/api/v1/public/stores/annapurna/checkout', [
            'customer_name' => 'Meera',
            'customer_phone' => '9876543210',
            'fulfillment' => 'pickup',
            'payment_method' => 'razorpay',
            'lines' => [['store_item_id' => $this->itemId, 'qty' => 1]],
        ])->assertCreated();
        $orderId = $placed->json('data.id');
        $amount = (int) $placed->json('data.total_paise');
        $paymentId = $placed->json('data.payment.id');
        $this->assertNotEmpty($paymentId);

        $this->webhook($orderId, 'evt_bad_sig', $amount, $this->secret, 'not-the-signature')->assertStatus(400);
        $this->assertSame(0, DB::table('webhook_receipts')->count());
        $this->assertSame('unpaid', DB::table('orders')->where('id', $orderId)->value('payment_status'));

        $this->webhook($orderId, 'evt_bad_amount', $amount + 1, $this->secret)->assertStatus(400);
        $this->assertSame(0, DB::table('webhook_receipts')->count());

        $this->postJson("/api/v1/public/payments/{$paymentId}/capture", ['token' => 'wrong-token'])->assertStatus(401);

        $this->webhook($orderId, 'evt_capture_1', $amount, $this->secret)->assertOk();
        $this->assertSame('captured', DB::table('orders')->where('id', $orderId)->value('payment_status'));
        $this->assertSame(0, DB::table('sales')->count());

        $this->webhook($orderId, 'evt_capture_1', $amount, $this->secret)->assertOk();
        $this->assertSame(1, DB::table('webhook_receipts')->count());

        $this->postJson("/api/v1/orders/{$orderId}/transitions", ['to' => 'accepted'])->assertOk();
        $this->assertSame(1, DB::table('sales')->count());
        $this->assertSame('razorpay', DB::table('sale_payments')->value('method'));
        $this->assertSame($amount, (int) DB::table('sales')->value('total_paise'));
        $this->assertEqualsWithDelta(4, (float) DB::table('stock_balances')->where('store_item_id', $this->itemId)->value('on_hand'), 0.001);

        $this->webhook($orderId, 'evt_capture_1', $amount, $this->secret)->assertOk();
        $this->assertSame(1, DB::table('sales')->count());
        $this->assertSame(1, DB::table('stock_ledger_entries')->where('reason', 'sale')->count());
    }

    public function test_a_captured_webhook_after_accept_bills_once(): void
    {
        $this->putJson('/api/v1/gateways/razorpay/credentials', [
            'key_id' => 'rzp_test_annapurna',
            'key_secret' => $this->secret,
        ])->assertOk();
        $this->patchJson('/api/v1/gateways/razorpay', ['status' => 'active'])->assertOk();

        $placed = $this->postJson('/api/v1/public/stores/annapurna/checkout', [
            'customer_name' => 'Meera',
            'customer_phone' => '9876543210',
            'fulfillment' => 'pickup',
            'payment_method' => 'razorpay',
            'lines' => [['store_item_id' => $this->itemId, 'qty' => 1]],
        ])->assertCreated();
        $orderId = $placed->json('data.id');
        $amount = (int) $placed->json('data.total_paise');

        $this->postJson("/api/v1/orders/{$orderId}/transitions", ['to' => 'accepted'])
            ->assertOk()
            ->assertJsonPath('data.sale_id', null);
        $this->assertSame(0, DB::table('sales')->count());

        $this->webhook($orderId, 'evt_after_accept', $amount, $this->secret)->assertOk();
        $this->assertSame(1, DB::table('sales')->count());
        $this->assertNotNull(DB::table('orders')->where('id', $orderId)->value('sale_id'));

        $this->webhook($orderId, 'evt_after_accept', $amount, $this->secret)->assertOk();
        $this->assertSame(1, DB::table('sales')->count());
        $this->assertSame(1, DB::table('stock_ledger_entries')->where('reason', 'sale')->count());
    }

    private function webhook(string $orderId, string $eventId, int $amount, string $secret, ?string $signature = null): \Illuminate\Testing\TestResponse
    {
        $raw = json_encode([
            'event_id' => $eventId,
            'type' => 'payment.captured',
            'order_id' => $orderId,
            'amount_paise' => $amount,
        ], JSON_THROW_ON_ERROR);

        return $this->call('POST', '/api/v1/public/webhooks/razorpay', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_ACCEPT' => 'application/json',
            'HTTP_X_GATEWAY_SIGNATURE' => $signature ?? hash_hmac('sha256', $raw, $secret),
        ], $raw);
    }

    private function catalog(string $name): string
    {
        return DB::getDriverName() === 'pgsql' ? 'catalog.'.$name : 'catalog_'.$name;
    }
}
