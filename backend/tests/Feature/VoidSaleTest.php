<?php

namespace Tests\Feature;

use App\Modules\Tenancy\Models\Store;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class VoidSaleTest extends TestCase
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

    public function test_voiding_a_counter_bill_puts_the_stock_and_points_back(): void
    {
        $customerId = $this->postJson('/api/v1/customers', [
            'name' => 'Meera',
            'phone' => '9876543210',
        ])->assertCreated()->json('data.id');

        $sale = $this->postJson("/api/v1/stores/{$this->storeId}/sales", [
            'client_uuid' => '018f1a00-0000-7000-8000-0000000000d1',
            'cash_tender_paise' => 10500,
            'customer_id' => $customerId,
            'lines' => [['store_item_id' => $this->itemId, 'qty' => 1]],
        ])->assertCreated();
        $saleId = $sale->json('data.id');
        $this->assertGreaterThan(0, (int) DB::table('customers')->where('id', $customerId)->value('loyalty_points'));
        $this->assertEqualsWithDelta(4, $this->onHand(), 0.001);

        $this->postJson("/api/v1/sales/{$saleId}/void", ['reason' => 'Wrong item'])->assertOk()->assertJsonPath('data.status', 'voided');
        $this->assertEqualsWithDelta(5, $this->onHand(), 0.001);
        $this->assertSame(0, (int) DB::table('customers')->where('id', $customerId)->value('loyalty_points'));
        $this->assertSame('voided', DB::table('sales')->where('id', $saleId)->value('status'));
        $this->postJson("/api/v1/sales/{$saleId}/void", ['reason' => 'Again'])->assertStatus(409);

        $closed = $this->postJson("/api/v1/stores/{$this->storeId}/shifts/close", ['actual_cash_paise' => 0])->assertOk();
        $this->assertSame(0, $closed->json('data.expected_cash_paise'));

        $this->postJson("/api/v1/stores/{$this->storeId}/shifts/open", ['opening_cash_paise' => 0])->assertCreated();
        $second = $this->postJson("/api/v1/stores/{$this->storeId}/sales", [
            'client_uuid' => '018f1a00-0000-7000-8000-0000000000d2',
            'cash_tender_paise' => 10500,
            'lines' => [['store_item_id' => $this->itemId, 'qty' => 1]],
        ])->assertCreated();
        $lineId = (string) DB::table('sale_lines')->where('sale_id', $second->json('data.id'))->value('id');
        $this->postJson('/api/v1/sales/'.$second->json('data.id').'/returns', [
            'reason' => 'Changed mind',
            'lines' => [['sale_line_id' => $lineId, 'qty' => 1]],
        ])->assertCreated();
        $this->postJson('/api/v1/sales/'.$second->json('data.id').'/void', ['reason' => 'Too late'])
            ->assertStatus(409)
            ->assertJsonPath('error.code', 'conflict.returned');
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
