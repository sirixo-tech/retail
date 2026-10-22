<?php

namespace Tests\Feature;

use App\Modules\Tenancy\Models\Store;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class OperationsTest extends TestCase
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
    }

    public function test_limits_khata_dashboard_export_and_parked_bills(): void
    {
        $this->setLimit('limit.orders_per_month', 0);
        $this->postJson('/api/v1/public/stores/annapurna/checkout', [
            'customer_name' => 'Meera',
            'customer_phone' => '9876543210',
            'fulfillment' => 'pickup',
            'lines' => [['store_item_id' => $this->itemId, 'qty' => 1]],
        ])->assertStatus(422)->assertJsonPath('error.code', 'entitlement.limit_exceeded');
        $this->setLimit('limit.orders_per_month', -1);

        $customer = $this->postJson('/api/v1/customers', [
            'name' => 'Meera',
            'phone' => '9876543210',
        ])->assertCreated();
        $customerId = $customer->json('data.id');
        $this->postJson("/api/v1/customers/{$customerId}/addresses", [
            'line1' => '12 Lake Road',
            'city' => 'Hyderabad',
            'pincode' => '500081',
        ])->assertCreated();
        $this->postJson("/api/v1/customers/{$customerId}/khata", [
            'direction' => 'charge',
            'amount_paise' => 50000,
            'note' => 'Rice on account',
        ])->assertOk()->assertJsonPath('data.khata_balance_paise', 50000);
        $this->postJson("/api/v1/customers/{$customerId}/khata", [
            'direction' => 'collect',
            'amount_paise' => 20000,
        ])->assertOk()->assertJsonPath('data.khata_balance_paise', 30000);
        $this->postJson("/api/v1/customers/{$customerId}/khata", [
            'direction' => 'collect',
            'amount_paise' => 40000,
        ])->assertStatus(422);
        $this->getJson("/api/v1/customers/{$customerId}")
            ->assertOk()
            ->assertJsonPath('data.addresses.0.pincode', '500081')
            ->assertJsonPath('data.khata_balance_paise', 30000);
        $this->getJson('/api/v1/audit')->assertOk()->assertJsonPath('data.0.action', 'khata.collect');

        $this->setLimit('module.khata', 0);
        $this->postJson("/api/v1/customers/{$customerId}/khata", [
            'direction' => 'charge',
            'amount_paise' => 100,
        ])->assertForbidden();
        $this->setLimit('module.khata', 1);

        $this->postJson("/api/v1/stores/{$this->storeId}/shifts/open", ['opening_cash_paise' => 0])->assertCreated();
        $this->postJson("/api/v1/stores/{$this->storeId}/sales", [
            'client_uuid' => '018f1a00-0000-7000-8000-0000000000aa',
            'cash_tender_paise' => 10500,
            'lines' => [['store_item_id' => $this->itemId, 'qty' => 1]],
        ])->assertCreated();

        $dash = $this->getJson('/api/v1/reports/dashboard')->assertOk();
        $this->assertSame(10500, $dash->json('data.sales_paise'));
        $this->assertSame(1, $dash->json('data.bills'));
        $this->assertSame(30000, $dash->json('data.sales_due_paise'));
        $this->assertSame('Basmati rice 5kg', $dash->json('data.top.0.name'));

        $csv = $this->get('/api/v1/reports/sales?format=csv')->assertOk();
        $this->assertStringContainsString('number,total_paise', $csv->getContent());
        $this->assertStringContainsString('10500', $csv->getContent());

        $parked = $this->postJson("/api/v1/stores/{$this->storeId}/holds", [
            'label' => 'Counter',
            'lines' => [['store_item_id' => $this->itemId, 'qty' => 2]],
        ])->assertCreated();
        $this->getJson("/api/v1/stores/{$this->storeId}/holds")
            ->assertOk()
            ->assertJsonPath('data.0.lines.0.qty', 2);
        $this->deleteJson("/api/v1/stores/{$this->storeId}/holds/{$parked->json('data.id')}")->assertOk();
        $this->assertSame(0, DB::table('pos_holds')->count());
    }

    private function setLimit(string $key, int $value): void
    {
        $planId = DB::table('plans')->where('code', 'professional')->value('id');
        $featureId = DB::table('features')->where('key', $key)->value('id');
        DB::table('plan_features')->where('plan_id', $planId)->where('feature_id', $featureId)->update(['value' => $value]);
    }

    private function catalog(string $name): string
    {
        return DB::getDriverName() === 'pgsql' ? 'catalog.'.$name : 'catalog_'.$name;
    }
}
