<?php

namespace Tests\Feature;

use App\Modules\Tenancy\Models\Store;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PlatformSliceTest extends TestCase
{
    use RefreshDatabase;

    public function test_export_favourites_pin_override_keys_profit_and_expiry(): void
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
        $tenant = $this->postJson('/api/v1/platform/tenants', [
            'owner_name' => 'Ananya Shah',
            'email' => 'owner@annapurna.store',
            'password' => 'first-pass-1',
            'business_name' => 'Annapurna Stores',
            'slug' => 'annapurna',
            'kind' => 'single_store',
            'plan_code' => 'enterprise',
        ])->assertCreated();
        $tenantId = $tenant->json('data.id');
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

        $this->postJson('/api/v1/customers', ['name' => 'Meera', 'phone' => '9876543210'])->assertCreated();
        $this->assertStringContainsString('"Meera",9876543210', $this->get('/api/v1/customers/export')->assertOk()->getContent());

        $this->postJson('/api/v1/public/stores/annapurna/favourites', [
            'phone' => '9876543210',
            'store_item_id' => $itemId,
        ])->assertOk();
        $this->getJson('/api/v1/public/stores/annapurna/favourites?phone=9876543210')
            ->assertOk()
            ->assertJsonPath('data.0', $itemId);

        $this->postJson("/api/v1/stores/{$storeId}/purchases", [
            'supplier_name' => 'Hill Grain',
            'lines' => [['store_item_id' => $itemId, 'qty' => 2, 'cost_paise' => 4000, 'expires_on' => now()->addDays(5)->toDateString()]],
        ])->assertCreated();
        $this->getJson("/api/v1/stores/{$storeId}/stock/expiry?within_days=30")
            ->assertOk()
            ->assertJsonPath('data.0.id', $itemId);

        $this->postJson("/api/v1/stores/{$storeId}/shifts/open", ['opening_cash_paise' => 0])->assertCreated();
        $sale = $this->postJson("/api/v1/stores/{$storeId}/sales", [
            'client_uuid' => '018f1a00-0000-7000-8000-0000000000a1',
            'cash_tender_paise' => 10500,
            'lines' => [['store_item_id' => $itemId, 'qty' => 1]],
        ])->assertCreated();
        $this->getJson('/api/v1/reports/profit')->assertOk()
            ->assertJsonPath('data.sales_paise', 10500)
            ->assertJsonPath('data.cogs_paise', 4000)
            ->assertJsonPath('data.profit_paise', 6500);

        $this->postJson('/api/v1/staff/pin', ['pin' => '1234'])->assertOk();
        $this->postJson('/api/v1/sales/'.$sale->json('data.id').'/void', ['reason' => 'Wrong item'])->assertStatus(401);
        $this->withHeader('X-Cashier-Pin', '1234')
            ->postJson('/api/v1/sales/'.$sale->json('data.id').'/void', ['reason' => 'Wrong item'])
            ->assertOk();

        $key = $this->postJson('/api/v1/api-keys', ['name' => 'Till'])->assertCreated();
        $token = $key->json('data.token');
        $this->withHeader('Authorization', 'Bearer '.$token)->getJson('/api/v1/open/items')->assertOk();
        $rotated = $this->postJson('/api/v1/api-keys/'.$key->json('data.id').'/rotate')->assertCreated();
        $this->withHeader('Authorization', 'Bearer '.$token)->getJson('/api/v1/open/items')->assertStatus(401);
        $this->withHeader('Authorization', 'Bearer '.$rotated->json('data.token'))->getJson('/api/v1/open/items')->assertOk();

        $this->postJson('/api/v1/webhooks', ['url' => 'http://127.0.0.1/hook'])->assertStatus(422);
        $this->postJson('/api/v1/webhooks', ['url' => 'http://10.1.1.5/hook'])->assertStatus(422);

        $this->postJson('/api/v1/auth/staff/logout')->assertOk();
        $this->postJson('/api/v1/auth/platform/login', [
            'email' => 'admin@selfx.test',
            'password' => 'password',
        ])->assertOk();
        $this->putJson("/api/v1/platform/tenants/{$tenantId}/features", [
            'key' => 'limit.orders_per_month',
            'value' => 0,
        ])->assertOk();
        $this->postJson('/api/v1/auth/platform/logout')->assertOk();
        $this->postJson('/api/v1/auth/staff/login', [
            'email' => 'owner@annapurna.store',
            'password' => 'second-pass-1',
            'slug' => 'annapurna',
        ])->assertOk();
        $this->postJson('/api/v1/public/stores/annapurna/checkout', [
            'customer_name' => 'Meera',
            'customer_phone' => '9876543210',
            'fulfillment' => 'pickup',
            'lines' => [['store_item_id' => $itemId, 'qty' => 1]],
        ])->assertStatus(422)->assertJsonPath('error.code', 'entitlement.limit_exceeded');
    }

    private function catalog(string $name): string
    {
        return DB::getDriverName() === 'pgsql' ? 'catalog.'.$name : 'catalog_'.$name;
    }
}
