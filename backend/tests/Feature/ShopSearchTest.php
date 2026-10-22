<?php

namespace Tests\Feature;

use App\Modules\Tenancy\Models\Store;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ShopSearchTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_shop_search_matches_a_name_and_the_receipt_keeps_its_footer(): void
    {
        $this->seed();
        $this->postJson('/api/v1/auth/platform/login', [
            'email' => 'admin@selfx.test',
            'password' => 'password',
        ])->assertOk();
        $rice = $this->product('Basmati rice 5kg', '8901001000018');
        $milk = $this->product('Whole milk 1L', '8901001000025');
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
            'items' => [
                ['master_product_id' => $rice, 'opening_qty' => 2],
                ['master_product_id' => $milk, 'opening_qty' => 2],
            ],
        ])->assertOk();

        $found = $this->getJson('/api/v1/public/stores/annapurna/items?q=rice')->assertOk();
        $this->assertCount(1, $found->json('data'));
        $this->assertSame('Basmati rice 5kg', $found->json('data.0.name'));
        $this->getJson('/api/v1/public/stores/annapurna/items?q=ricce')->assertOk()->assertJsonPath('data.0.name', 'Basmati rice 5kg');
        $this->getJson('/api/v1/public/stores/annapurna/items?q=soap')->assertOk()->assertJsonCount(0, 'data');

        $this->putJson("/api/v1/stores/{$storeId}/receipt", [
            'receipt_footer' => 'Thank you. Goods once sold can be exchanged within a day.',
        ])->assertOk();
        $settings = Store::query()->find($storeId)->settings;
        $this->assertSame(24, $settings['reservation_hours']);
        $this->assertSame('Thank you. Goods once sold can be exchanged within a day.', $settings['receipt_footer']);

        $riceItem = (string) DB::table('store_items')->where('master_product_id', $rice)->value('id');
        $this->postJson("/api/v1/stores/{$storeId}/shifts/open", ['opening_cash_paise' => 0])->assertCreated();
        $sale = $this->postJson("/api/v1/stores/{$storeId}/sales", [
            'client_uuid' => '018f1a00-0000-7000-8000-0000000000f1',
            'cash_tender_paise' => 10500,
            'lines' => [['store_item_id' => $riceItem, 'qty' => 1]],
        ])->assertCreated();
        $this->getJson('/api/v1/sales/'.$sale->json('data.id').'/receipt')
            ->assertOk()
            ->assertJsonPath('data.footer', 'Thank you. Goods once sold can be exchanged within a day.');

        $clock = now('Asia/Kolkata')->format('H:i');
        $window = $clock < '00:01' ? ['open' => '23:00', 'close' => '23:30'] : ['open' => '00:00', 'close' => '00:01'];
        $this->putJson("/api/v1/stores/{$storeId}/hours", $window)->assertOk()->assertJsonPath('data.open_now', false);
        $this->putJson("/api/v1/stores/{$storeId}/hours", [
            'open' => '18:00',
            'close' => '09:00',
        ])->assertStatus(422);
        $this->postJson('/api/v1/public/stores/annapurna/checkout', [
            'customer_name' => 'Meera',
            'customer_phone' => '9876543210',
            'fulfillment' => 'pickup',
            'lines' => [['store_item_id' => $riceItem, 'qty' => 1]],
        ])->assertStatus(422)->assertJsonPath('error.code', 'conflict.closed');
        $this->getJson('/api/v1/public/stores/annapurna')
            ->assertOk()
            ->assertJsonPath('data.open_now', false);
    }

    private function product(string $name, string $gtin): string
    {
        $created = $this->postJson('/api/v1/platform/catalog/products', [
            'name' => $name,
            'gtin' => $gtin,
            'category_id' => DB::table($this->catalog('categories'))->where('slug', 'staples')->value('id'),
            'tax_class_id' => DB::table($this->catalog('tax_classes'))->where('hsn', '1006')->value('id'),
            'reference_mrp_paise' => 10500,
            'description' => 'A household grocery pack sold by weight or volume.',
        ])->assertCreated();
        $this->postJson('/api/v1/platform/catalog/products/'.$created->json('data.id').'/publish')->assertOk();

        return (string) $created->json('data.id');
    }

    private function catalog(string $name): string
    {
        return DB::getDriverName() === 'pgsql' ? 'catalog.'.$name : 'catalog_'.$name;
    }
}
