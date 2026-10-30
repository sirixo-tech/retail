<?php

namespace Tests\Feature;

use Database\Seeders\MarketingSuiteSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class MarketingAndHardwareTest extends TestCase
{
    use RefreshDatabase;

    private string $tenantId;
    private string $storeId;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();

        // Platform login & tenant creation
        $this->postJson('/api/v1/auth/platform/login', [
            'email' => 'admin@selfx.test',
            'password' => 'password',
        ])->assertOk();

        $tenantResponse = $this->postJson('/api/v1/platform/tenants', [
            'owner_name' => 'Aditi Rao',
            'email' => 'aditi@fashionmart.test',
            'password' => 'first-pass-1',
            'business_name' => 'Aditi Fashion Mart',
            'slug' => 'aditifashion',
            'kind' => 'single_store',
            'plan_code' => 'professional',
        ])->assertCreated();

        $this->tenantId = (string) $tenantResponse->json('data.id');
        $this->storeId = (string) DB::table('stores')->where('tenant_id', $this->tenantId)->value('id');

        // Seed marketing suite for tenant
        (new MarketingSuiteSeeder())->seedTenantMarketing($this->tenantId);

        // Logout platform and login as store staff
        $this->postJson('/api/v1/auth/platform/logout')->assertOk();
        $this->postJson('/api/v1/auth/staff/login', [
            'email' => 'aditi@fashionmart.test',
            'password' => 'first-pass-1',
            'slug' => 'aditifashion',
        ])->assertOk();
        $this->changeRequiredPassword();
    }

    public function test_marketing_dashboard_and_campaign_dispatch(): void
    {
        // Insert a real customer for the tenant
        DB::table('customers')->insert([
            'id' => (string) \Illuminate\Support\Str::uuid7(),
            'tenant_id' => $this->tenantId,
            'name' => 'Priya Patel',
            'phone_e164' => '+919876543210',
            'email' => 'priya@example.com',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 1. Marketing Overview
        $overview = $this->getJson('/api/v1/marketing/overview')->assertOk();
        $this->assertArrayHasKey('stats', $overview->json('data'));
        $this->assertArrayHasKey('chart_data', $overview->json('data'));
        $this->assertArrayHasKey('campaigns_by_status', $overview->json('data'));

        // 2. Create and dispatch a WhatsApp marketing campaign
        $campRes = $this->postJson('/api/v1/marketing/campaigns', [
            'name' => 'Diwali Mega Fashion Sale Broadcast',
            'channel' => 'whatsapp',
            'target_segment' => 'All Store Customers',
            'message_body' => 'Celebrate Diwali with flat 25% off on all ethnic wear at {{store_name}}! Shop: {{store_url}}',
            'send_now' => true,
        ])->assertCreated();

        $campId = $campRes->json('data.id');
        $this->assertEquals('sent', $campRes->json('data.status'));
        $this->assertGreaterThan(0, $campRes->json('data.sent_count'));

        // 3. Test send preview
        $testSend = $this->postJson('/api/v1/marketing/campaigns/test-send', [
            'channel' => 'whatsapp',
            'recipient' => '+919876543210',
            'message_body' => 'Test broadcast preview for {{customer_name}}',
        ])->assertOk();

        $this->assertTrue($testSend->json('data.sent'));
        $this->assertStringContainsString('Valued Customer', $testSend->json('data.preview_text'));

        // 4. Update marketing gateway settings
        $settingsRes = $this->putJson('/api/v1/marketing/settings', [
            'whatsapp' => [
                'enabled' => true,
                'phone_number_id' => '999888777',
            ],
            'sms' => [
                'enabled' => true,
                'sender_id' => 'ADITIM',
            ],
        ])->assertOk();

        $this->assertEquals('999888777', $settingsRes->json('data.whatsapp.phone_number_id'));
        $this->assertEquals('ADITIM', $settingsRes->json('data.sms.sender_id'));
    }

    public function test_selfx_hardware_catalog_buying_and_demo(): void
    {
        // 0. SuperAdmin uploads a hardware product dynamically
        $this->postJson('/api/v1/auth/staff/logout')->assertOk();
        $this->postJson('/api/v1/auth/platform/login', [
            'email' => 'admin@selfx.test',
            'password' => 'password',
        ])->assertOk();

        $createRes = $this->postJson('/api/v1/platform/hardware', [
            'sku' => 'SX-KSK-32',
            'name' => 'SelfX Titan 32" Kiosk',
            'model' => 'Titan K32',
            'category' => 'kiosk',
            'description' => 'Self-ordering kiosk for retail and QSR.',
            'specs' => ['32-inch 4K Touch', 'Seiko 80mm Printer'],
            'buy_price_paise' => 6499900,
            'monthly_rent_paise' => 349900,
            'security_deposit_paise' => 1000000,
            'stock_qty' => 15,
        ])->assertCreated();

        // Log back in as tenant staff
        $this->postJson('/api/v1/auth/platform/logout')->assertOk();
        $this->postJson('/api/v1/auth/staff/login', [
            'email' => 'aditi@fashionmart.test',
            'password' => 'second-pass-1',
            'slug' => 'aditifashion',
        ])->assertOk();

        // 1. Tenant lists SelfX hardware
        $catalogRes = $this->getJson('/api/v1/tenant/hardware')->assertOk();
        $products = $catalogRes->json('data');
        $this->assertNotEmpty($products);

        $kiosk = collect($products)->firstWhere('category', 'kiosk');
        $this->assertNotNull($kiosk);

        // 2. Buy Outright Checkout
        $buyRes = $this->postJson('/api/v1/tenant/hardware/checkout', [
            'hardware_product_id' => $kiosk['id'],
            'type' => 'buy',
            'delivery_store_id' => $this->storeId,
            'quantity' => 1,
            'gateway' => 'razorpay',
            'contact_name' => 'Aditi Rao',
            'contact_phone' => '9888777666',
            'address_line' => 'Plot 42, Commercial Avenue',
            'city' => 'Bangalore',
            'pincode' => '560001',
        ])->assertCreated();

        $orderId = $buyRes->json('data.order_id');
        $refId = $buyRes->json('data.reference_id');
        $this->assertNotEmpty($orderId);

        // 3. Confirm Hardware Order
        $confirmRes = $this->postJson('/api/v1/tenant/hardware/confirm', [
            'order_id' => $orderId,
            'reference_id' => $refId,
            'payment_id' => 'pay_rzp_mock_123',
        ])->assertOk();

        $this->assertEquals('confirmed', $confirmRes->json('data.status'));

        // 4. Book Free Demo
        $demoRes = $this->postJson('/api/v1/tenant/hardware/demo', [
            'hardware_product_id' => $kiosk['id'],
            'demo_date' => now()->addDays(3)->toDateString(),
            'demo_time_slot' => '11:00 AM - 12:00 PM',
            'mode' => 'in_store',
            'contact_name' => 'Aditi Rao',
            'contact_phone' => '9888777666',
            'store_address' => 'Bangalore Flagship Store',
        ])->assertCreated();

        $this->assertEquals('demo_scheduled', $demoRes->json('data.status'));

        // 5. Submit RMA Replacement / Warranty Claim
        $rmaRes = $this->postJson('/api/v1/tenant/hardware/rma', [
            'original_order_id' => $orderId,
            'type' => 'replacement',
            'serial_number' => 'SN-TITAN-88942',
            'issue_category' => 'printer_jam',
            'issue_description' => 'Thermal paper cutter motor stuck during peak billing.',
        ])->assertCreated();

        $this->assertEquals('replacement_approved', $rmaRes->json('data.status'));

        // 6. SuperAdmin inspects orders
        $this->postJson('/api/v1/auth/staff/logout')->assertOk();
        $this->postJson('/api/v1/auth/platform/login', [
            'email' => 'admin@selfx.test',
            'password' => 'password',
        ])->assertOk();

        $adminOrders = $this->getJson('/api/v1/platform/hardware/orders')->assertOk();
        $this->assertGreaterThanOrEqual(3, count($adminOrders->json('data')));

        // 7. SuperAdmin updates order status with courier tracking
        $updateStatus = $this->putJson("/api/v1/platform/hardware/orders/{$orderId}/status", [
            'status' => 'dispatched',
            'carrier_name' => 'BlueDart Express',
            'tracking_number' => 'BD-882940192',
            'tracking_url' => 'https://bluedart.com/track/BD-882940192',
        ])->assertOk();

        $this->assertEquals('dispatched', $updateStatus->json('data.status'));
    }
}
