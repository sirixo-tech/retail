<?php

namespace Tests\Feature;

use App\Modules\Tenancy\Models\Store;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class BillDiscountTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_counter_discount_reduces_the_amount_due_and_needs_a_reason(): void
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
            'plan_code' => 'starter',
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
        $this->postJson("/api/v1/stores/{$storeId}/shifts/open", ['opening_cash_paise' => 0])->assertCreated();

        $this->postJson("/api/v1/stores/{$storeId}/sales", [
            'client_uuid' => '018f1a00-0000-7000-8000-0000000000e1',
            'cash_tender_paise' => 10000,
            'discount_paise' => 500,
            'lines' => [['store_item_id' => $itemId, 'qty' => 1]],
        ])->assertStatus(422)->assertJsonPath('error.message', 'A discount needs a reason.');

        $sale = $this->postJson("/api/v1/stores/{$storeId}/sales", [
            'client_uuid' => '018f1a00-0000-7000-8000-0000000000e2',
            'cash_tender_paise' => 10000,
            'discount_paise' => 500,
            'discount_reason' => 'Damaged pack',
            'lines' => [['store_item_id' => $itemId, 'qty' => 1]],
        ])->assertCreated();
        $this->assertSame(10000, $sale->json('data.total_paise'));
        $this->assertSame(500, $sale->json('data.discount_paise'));
        $this->getJson('/api/v1/sales/'.$sale->json('data.id').'/receipt')
            ->assertOk()
            ->assertJsonPath('data.discount_paise', 500);

        $this->postJson("/api/v1/stores/{$storeId}/sales", [
            'client_uuid' => '018f1a00-0000-7000-8000-0000000000e3',
            'cash_tender_paise' => 10500,
            'discount_paise' => 20000,
            'discount_reason' => 'Too much',
            'lines' => [['store_item_id' => $itemId, 'qty' => 1]],
        ])->assertStatus(422)->assertJsonPath('error.code', 'discount.too_large');
    }

    private function catalog(string $name): string
    {
        return DB::getDriverName() === 'pgsql' ? 'catalog.'.$name : 'catalog_'.$name;
    }
}
