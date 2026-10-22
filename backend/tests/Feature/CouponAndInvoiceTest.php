<?php

namespace Tests\Feature;

use App\Modules\Tenancy\Models\Store;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CouponAndInvoiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_coupon_reduces_the_order_and_a_gstin_removes_the_specimen_mark(): void
    {
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
            'items' => [['master_product_id' => $created->json('data.id'), 'opening_qty' => 5]],
        ])->assertOk();
        $itemId = (string) DB::table('store_items')->value('id');

        $this->postJson('/api/v1/coupons', [
            'code' => 'welcome10',
            'kind' => 'percent',
            'value' => 10,
            'max_redemptions' => 1,
        ])->assertCreated();
        $this->postJson('/api/v1/coupons', [
            'code' => 'old',
            'kind' => 'fixed',
            'value' => 100,
            'expires_at' => now()->subDay()->toDateString(),
        ])->assertCreated();

        $placed = $this->postJson('/api/v1/public/stores/annapurna/checkout', [
            'customer_name' => 'Meera',
            'customer_phone' => '9876543210',
            'fulfillment' => 'pickup',
            'coupon_code' => 'welcome10',
            'lines' => [['store_item_id' => $itemId, 'qty' => 1]],
        ])->assertCreated();
        $this->assertSame(9450, $placed->json('data.total_paise'));
        $this->assertSame(1050, $placed->json('data.discount_paise'));

        $this->postJson('/api/v1/public/stores/annapurna/checkout', [
            'customer_name' => 'Meera',
            'customer_phone' => '9876543210',
            'fulfillment' => 'pickup',
            'coupon_code' => 'welcome10',
            'lines' => [['store_item_id' => $itemId, 'qty' => 1]],
        ])->assertStatus(422)->assertJsonPath('error.message', 'That coupon has been used up.');

        $this->postJson('/api/v1/public/stores/annapurna/checkout', [
            'customer_name' => 'Meera',
            'customer_phone' => '9876543210',
            'fulfillment' => 'pickup',
            'coupon_code' => 'old',
            'lines' => [['store_item_id' => $itemId, 'qty' => 1]],
        ])->assertStatus(422)->assertJsonPath('error.message', 'That coupon has expired.');

        $invoice = $this->postJson('/api/v1/billing/invoices')->assertCreated();
        $invoiceId = $invoice->json('data.id');
        $this->assertTrue((bool) $invoice->json('data.specimen'));
        $specimen = $this->get("/api/v1/billing/invoices/{$invoiceId}/pdf")->assertOk();
        $this->assertStringContainsString('%PDF', $specimen->getContent());
        $this->assertStringContainsString('SPECIMEN', $specimen->getContent());

        $this->postJson('/api/v1/auth/staff/logout')->assertOk();
        $this->postJson('/api/v1/auth/platform/login', [
            'email' => 'admin@selfx.test',
            'password' => 'password',
        ])->assertOk();
        $this->putJson('/api/v1/platform/legal-entity', [
            'legal_name' => 'SelfX Retail Private Limited',
            'gstin' => '36AABCU9603R1ZM',
            'sac' => '998313',
            'address' => 'Hyderabad',
        ])->assertOk()->assertJsonPath('data.specimen', false);
        $this->putJson('/api/v1/platform/legal-entity', [
            'legal_name' => 'SelfX Retail Private Limited',
            'gstin' => 'NOT-A-GSTIN',
        ])->assertStatus(422);

        $this->postJson('/api/v1/auth/platform/logout')->assertOk();
        $this->postJson('/api/v1/auth/staff/login', [
            'email' => 'owner@annapurna.store',
            'password' => 'second-pass-1',
            'slug' => 'annapurna',
        ])->assertOk();
        $clear = $this->get("/api/v1/billing/invoices/{$invoiceId}/pdf")->assertOk();
        $this->assertStringNotContainsString('SPECIMEN', $clear->getContent());
        $this->assertStringContainsString('36AABCU9603R1ZM', $clear->getContent());
        $this->assertFalse((bool) $this->getJson('/api/v1/billing/invoices')->json('data.0.specimen'));
    }

    private function catalog(string $name): string
    {
        return DB::getDriverName() === 'pgsql' ? 'catalog.'.$name : 'catalog_'.$name;
    }
}
