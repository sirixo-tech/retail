<?php

namespace Tests\Feature;

use App\Modules\Customers\Actions\PostLoyalty;
use App\Modules\Tenancy\Models\Store;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class LoyaltyTest extends TestCase
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
        $this->postJson("/api/v1/stores/{$this->storeId}/shifts/open", ['opening_cash_paise' => 0])->assertCreated();
    }

    public function test_a_sale_earns_a_point_per_rupee_and_redeem_reduces_the_bill(): void
    {
        $customerId = $this->postJson('/api/v1/customers', [
            'name' => 'Meera',
            'phone' => '9876543210',
        ])->assertCreated()->json('data.id');

        $first = $this->sell($customerId, '018f1a00-0000-7000-8000-0000000000b1', 10500);
        $earned = (int) $first->json('data.points_earned');
        $this->assertSame(intdiv((int) $first->json('data.total_paise'), 100), $earned);
        $this->assertSame($earned, (int) DB::table('customers')->where('id', $customerId)->value('loyalty_points'));
        $this->sell($customerId, '018f1a00-0000-7000-8000-0000000000b1', 10500);
        $this->assertSame($earned, (int) DB::table('customers')->where('id', $customerId)->value('loyalty_points'));

        $second = $this->postJson("/api/v1/stores/{$this->storeId}/sales", [
            'client_uuid' => '018f1a00-0000-7000-8000-0000000000b2',
            'cash_tender_paise' => 5500,
            'customer_id' => $customerId,
            'loyalty_points' => 50,
            'lines' => [['store_item_id' => $this->itemId, 'qty' => 1]],
        ])->assertCreated();
        $this->assertSame(5500, $second->json('data.total_paise'));
        $this->assertSame($earned - 50 + intdiv(5500, 100), (int) DB::table('customers')->where('id', $customerId)->value('loyalty_points'));

        $this->postJson("/api/v1/stores/{$this->storeId}/sales", [
            'client_uuid' => '018f1a00-0000-7000-8000-0000000000b3',
            'cash_tender_paise' => 10500,
            'customer_id' => $customerId,
            'loyalty_points' => 10000,
            'lines' => [['store_item_id' => $this->itemId, 'qty' => 1]],
        ])->assertStatus(422)->assertJsonPath('error.code', 'loyalty.short');

        $this->getJson("/api/v1/customers/{$customerId}")
            ->assertOk()
            ->assertJsonPath('data.loyalty_tier', 'bronze');
        $this->assertSame('silver', PostLoyalty::tier(500));
        $this->assertSame('gold', PostLoyalty::tier(2000));

        $this->setLoyalty(0);
        $before = (int) DB::table('customers')->where('id', $customerId)->value('loyalty_points');
        $this->sell($customerId, '018f1a00-0000-7000-8000-0000000000b4', 10500)->assertJsonPath('data.points_earned', 0);
        $this->assertSame($before, (int) DB::table('customers')->where('id', $customerId)->value('loyalty_points'));
        $this->postJson("/api/v1/stores/{$this->storeId}/sales", [
            'client_uuid' => '018f1a00-0000-7000-8000-0000000000b5',
            'cash_tender_paise' => 10500,
            'customer_id' => $customerId,
            'loyalty_points' => 1,
            'lines' => [['store_item_id' => $this->itemId, 'qty' => 1]],
        ])->assertForbidden();
    }

    private function sell(string $customerId, string $uuid, int $tender): \Illuminate\Testing\TestResponse
    {
        return $this->postJson("/api/v1/stores/{$this->storeId}/sales", [
            'client_uuid' => $uuid,
            'cash_tender_paise' => $tender,
            'customer_id' => $customerId,
            'lines' => [['store_item_id' => $this->itemId, 'qty' => 1]],
        ])->assertCreated();
    }

    private function setLoyalty(int $value): void
    {
        $planId = DB::table('plans')->where('code', 'professional')->value('id');
        $featureId = DB::table('features')->where('key', 'module.loyalty')->value('id');
        DB::table('plan_features')->where('plan_id', $planId)->where('feature_id', $featureId)->update(['value' => $value]);
    }

    private function catalog(string $name): string
    {
        return DB::getDriverName() === 'pgsql' ? 'catalog.'.$name : 'catalog_'.$name;
    }
}
