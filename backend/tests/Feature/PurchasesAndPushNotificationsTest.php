<?php

namespace Tests\Feature;

use App\Modules\Inventory\Models\StoreItem;
use App\Modules\Tenancy\Models\Store;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PurchasesAndPushNotificationsTest extends TestCase
{
    use RefreshDatabase;

    private function setupTenantSession(): string
    {
        $this->seed();
        $this->postJson('/api/v1/auth/platform/login', [
            'email' => 'admin@selfx.test',
            'password' => 'password',
        ])->assertOk();

        $this->postJson('/api/v1/platform/tenants', [
            'owner_name' => 'Ananya Shah',
            'email' => 'owner@annapurna.store',
            'password' => 'first-pass-1',
            'business_name' => 'Annapurna Stores',
            'slug' => 'annapurna',
            'kind' => 'single_store',
            'plan_code' => 'professional',
        ])->assertCreated();

        $storeId = (string) Store::query()->value('id');
        $this->postJson('/api/v1/auth/platform/logout')->assertOk();

        $this->postJson('/api/v1/auth/staff/login', [
            'email' => 'owner@annapurna.store',
            'password' => 'first-pass-1',
            'slug' => 'annapurna',
        ])->assertOk();
        $this->changeRequiredPassword();

        return $storeId;
    }

    public function test_create_purchase_order_and_automatic_stock_posting(): void
    {
        $storeId = $this->setupTenantSession();
        $tenantId = (string) session('tenant_id');

        // 1. Create a supplier
        $supplierRes = $this->postJson('/api/v1/suppliers', [
            'name' => 'Metro Cash and Carry',
            'phone' => '+919876543210',
            'email' => 'metro@wholesale.in',
            'gstin' => '29AABCU9603R1ZM',
            'address' => 'Yeshwanthpur, Bengaluru',
        ]);
        $supplierRes->assertCreated();
        $supplierId = $supplierRes->json('data.id');

        // 2. Create a store item
        $item = StoreItem::create([
            'id' => (string) \Illuminate\Support\Str::uuid7(),
            'tenant_id' => $tenantId,
            'store_id' => $storeId,
            'sku' => 'RICE-001',
            'selling_price_paise' => 6000,
            'margin_bps' => 1000,
            'name_override' => 'Basmati Rice 1kg',
            'track_stock' => true,
        ]);
        $initialStock = (float) (DB::table('stock_balances')->where('store_item_id', $item->id)->value('on_hand') ?? 0);

        // 3. Create purchase order with status "received"
        $purchaseRes = $this->postJson('/api/v1/purchases', [
            'store_id' => $storeId,
            'supplier_id' => $supplierId,
            'status' => 'received',
            'date' => now()->toDateString(),
            'order_tax_rate' => 5,
            'discount_paise' => 1000, // ₹10 discount
            'shipping_paise' => 500,  // ₹5 shipping
            'paid_paise' => 2000,     // ₹20 paid initially
            'notes' => 'Urgent grocery restock',
            'lines' => [
                [
                    'store_item_id' => $item->id,
                    'qty' => 10,
                    'cost_paise' => 5000, // ₹50 each
                    'discount_paise' => 0,
                    'tax_bps' => 500, // 5%
                ],
            ],
        ]);

        $purchaseRes->assertCreated();
        $poNumber = $purchaseRes->json('data.number');
        $this->assertStringStartsWith('PO-', $poNumber);

        // Verify stock immediately increased by 10
        $newStock = (float) DB::table('stock_balances')->where('store_item_id', $item->id)->value('on_hand');
        $this->assertEquals($initialStock + 10.0, $newStock);

        // Verify goods receipt was created
        $this->assertDatabaseHas('goods_receipts', [
            'purchase_order_id' => $purchaseRes->json('data.id'),
            'store_id' => $storeId,
            'status' => 'posted',
        ]);
    }

    public function test_list_purchases_with_kpis_and_payment_recording(): void
    {
        $storeId = $this->setupTenantSession();
        $tenantId = (string) session('tenant_id');

        // 1. Create supplier
        $supplierRes = $this->postJson('/api/v1/suppliers', [
            'name' => 'Adani Wilmar Ltd',
            'phone' => '+919988776655',
        ]);
        $supplierId = $supplierRes->json('data.id');

        $item = StoreItem::create([
            'id' => (string) \Illuminate\Support\Str::uuid7(),
            'tenant_id' => $tenantId,
            'store_id' => $storeId,
            'sku' => 'OIL-001',
            'selling_price_paise' => 15000,
            'margin_bps' => 1000,
            'name_override' => 'Fortune Sunflower Oil 1L',
            'track_stock' => true,
        ]);

        // 2. Create purchase order with unpaid balance
        $purchaseRes = $this->postJson('/api/v1/purchases', [
            'store_id' => $storeId,
            'supplier_id' => $supplierId,
            'status' => 'received',
            'lines' => [
                [
                    'store_item_id' => $item->id,
                    'qty' => 5,
                    'cost_paise' => 10000, // ₹100 each -> ₹500
                ],
            ],
        ]);
        $purchaseRes->assertCreated();
        $poId = $purchaseRes->json('data.id');
        $totalPaise = $purchaseRes->json('data.total_paise');

        // 3. List purchases and verify KPIs
        $listRes = $this->getJson('/api/v1/purchases');
        $listRes->assertOk();
        $this->assertGreaterThanOrEqual(1, $listRes->json('data.kpis.total_count'));
        $this->assertGreaterThanOrEqual($totalPaise, $listRes->json('data.kpis.total_amount_paise'));

        // 4. Record partial payment
        $paymentRes = $this->postJson("/api/v1/purchases/{$poId}/payment", [
            'amount_paise' => 20000, // ₹200
            'payment_method' => 'upi',
            'note' => 'UPI to Vendor phonepe',
        ]);
        $paymentRes->assertOk();
        $this->assertEquals('partial', $paymentRes->json('data.payment_status'));
        $this->assertEquals($totalPaise - 20000, $paymentRes->json('data.due_paise'));

        // 5. Pay the remainder
        $finalPaymentRes = $this->postJson("/api/v1/purchases/{$poId}/payment", [
            'amount_paise' => $totalPaise - 20000,
            'payment_method' => 'cash',
        ]);
        $finalPaymentRes->assertOk();
        $this->assertEquals('paid', $finalPaymentRes->json('data.payment_status'));
        $this->assertEquals(0, $finalPaymentRes->json('data.due_paise'));
    }

    public function test_bulk_import_purchases_from_rows(): void
    {
        $storeId = $this->setupTenantSession();
        $tenantId = (string) session('tenant_id');

        $supplierRes = $this->postJson('/api/v1/suppliers', ['name' => 'ITC Limited']);
        $supplierId = $supplierRes->json('data.id');

        $item1 = StoreItem::create([
            'id' => (string) \Illuminate\Support\Str::uuid7(),
            'tenant_id' => $tenantId,
            'store_id' => $storeId,
            'sku' => 'AASH-001',
            'selling_price_paise' => 45000,
            'margin_bps' => 1000,
            'name_override' => 'Aashirvaad Atta 10kg',
            'track_stock' => true,
        ]);

        $item2 = StoreItem::create([
            'id' => (string) \Illuminate\Support\Str::uuid7(),
            'tenant_id' => $tenantId,
            'store_id' => $storeId,
            'sku' => 'SUN-001',
            'selling_price_paise' => 3000,
            'margin_bps' => 1000,
            'name_override' => 'Sunfeast Biscuits',
            'track_stock' => true,
        ]);

        $importRes = $this->postJson('/api/v1/purchases/import', [
            'store_id' => $storeId,
            'supplier_id' => $supplierId,
            'status' => 'received',
            'notes' => 'Imported consignment #772',
            'rows' => [
                [
                    'product_identifier' => 'AASH-001',
                    'cost_paise' => 38000,
                    'qty' => 20,
                    'discount_paise' => 1000,
                    'tax_bps' => 500,
                ],
                [
                    'product_identifier' => 'Sunfeast Biscuits',
                    'cost_paise' => 2200,
                    'qty' => 50,
                    'discount_paise' => 0,
                    'tax_bps' => 1800,
                ],
            ],
        ]);

        $importRes->assertCreated();
        $poNumber = $importRes->json('data.number');
        $this->assertNotEmpty($poNumber);

        // Verify stock for both items was posted
        $stock1 = (float) DB::table('stock_balances')->where('store_item_id', $item1->id)->value('on_hand');
        $stock2 = (float) DB::table('stock_balances')->where('store_item_id', $item2->id)->value('on_hand');
        $this->assertEquals(20.0, $stock1);
        $this->assertEquals(50.0, $stock2);
    }

    public function test_superadmin_push_notifications_configuration_and_test_connection(): void
    {
        $this->seed();
        // Login as Super Admin
        $this->postJson('/api/v1/auth/platform/login', [
            'email' => 'admin@selfx.test',
            'password' => 'password',
        ])->assertOk();

        // 1. Get current push settings
        $getRes = $this->getJson('/api/v1/platform/push-notifications');
        $getRes->assertOk();

        // 2. Update push settings
        $putRes = $this->putJson('/api/v1/platform/push-notifications', [
            'web_api_key' => 'AIzaSyA_sample_key_12345',
            'auth_domain' => 'selfx-retail.firebaseapp.com',
            'project_id' => 'selfx-retail',
            'app_id' => '1:123456789:web:abcdef123',
            'messaging_sender_id' => '123456789',
            'pos_android_app_id' => 'com.selfx.pos.terminal',
            'pos_ios_app_id' => 'com.selfx.pos.terminal',
            'kiosk_android_app_id' => 'com.selfx.kiosk',
            'kiosk_ios_app_id' => 'com.selfx.kiosk',
            'customer_android_app_id' => 'com.selfx.customer',
            'customer_ios_app_id' => 'com.selfx.customer',
            'vapid_key' => 'BMx9_sample_vapid_key',
            'service_account_json' => json_encode([
                'type' => 'service_account',
                'project_id' => 'selfx-retail',
                'private_key' => '-----BEGIN RSA PRIVATE KEY-----\nMIIE...',
                'client_email' => 'firebase-adminsdk@selfx-retail.iam.gserviceaccount.com',
            ]),
        ]);

        $putRes->assertOk();
        $this->assertEquals('ready', $putRes->json('data.status'));
        $this->assertEquals('selfx-retail', $putRes->json('data.project_id'));

        // 3. Test FCM connection
        $testRes = $this->postJson('/api/v1/platform/push-notifications/test');
        $testRes->assertOk();
        $this->assertTrue($testRes->json('data.success'));
        $this->assertEquals('firebase_fcm', $testRes->json('data.provider'));
    }
}
