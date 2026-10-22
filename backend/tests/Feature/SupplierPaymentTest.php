<?php

namespace Tests\Feature;

use App\Modules\Tenancy\Models\Store;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SupplierPaymentTest extends TestCase
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
            'items' => [['master_product_id' => $created->json('data.id'), 'opening_qty' => 1]],
        ])->assertOk();
        $this->itemId = (string) DB::table('store_items')->value('id');
    }

    public function test_a_supplier_payment_cannot_exceed_what_is_owed_and_customers_can_be_grouped(): void
    {
        $receipt = $this->postJson("/api/v1/stores/{$this->storeId}/purchases", [
            'supplier_name' => 'Hill Grain',
            'lines' => [['store_item_id' => $this->itemId, 'qty' => 2, 'cost_paise' => 4000]],
        ])->assertCreated();
        $supplierId = $receipt->json('data.supplier_id');

        $this->postJson("/api/v1/stores/{$this->storeId}/supplier-payments", [
            'supplier_id' => $supplierId,
            'amount_paise' => 3000,
            'note' => 'UPI',
        ])->assertCreated()->assertJsonPath('data.due_paise', 5000);

        $this->postJson("/api/v1/stores/{$this->storeId}/supplier-payments", [
            'supplier_id' => $supplierId,
            'amount_paise' => 5001,
        ])->assertStatus(422)->assertJsonPath('error.code', 'supplier.overpay');

        $this->postJson("/api/v1/stores/{$this->storeId}/supplier-payments", [
            'supplier_id' => $supplierId,
            'amount_paise' => 5000,
        ])->assertCreated()->assertJsonPath('data.due_paise', 0);

        $customerId = $this->postJson('/api/v1/customers', [
            'name' => 'Meera',
            'phone' => '9876543210',
        ])->assertCreated()->json('data.id');
        $segmentId = $this->postJson('/api/v1/segments', ['name' => 'Regulars'])->assertCreated()->json('data.id');
        $this->postJson('/api/v1/segments', ['name' => 'Regulars'])->assertStatus(422);
        $this->postJson("/api/v1/segments/{$segmentId}/customers", ['customer_id' => $customerId])->assertOk();
        $this->postJson("/api/v1/segments/{$segmentId}/customers", ['customer_id' => $customerId])->assertOk();
        $this->getJson("/api/v1/segments/{$segmentId}")
            ->assertOk()
            ->assertJsonCount(1, 'data.customers')
            ->assertJsonPath('data.customers.0.name', 'Meera');

        $this->postJson("/api/v1/customers/{$customerId}/feedback", [
            'rating' => 5,
            'comment' => 'Fresh rice',
        ])->assertCreated();
        $this->postJson("/api/v1/customers/{$customerId}/feedback", [
            'rating' => 6,
        ])->assertStatus(422);
        $this->getJson("/api/v1/customers/{$customerId}")
            ->assertOk()
            ->assertJsonPath('data.feedback.0.rating', 5)
            ->assertJsonPath('data.feedback.0.comment', 'Fresh rice');
    }

    private function catalog(string $name): string
    {
        return DB::getDriverName() === 'pgsql' ? 'catalog.'.$name : 'catalog_'.$name;
    }
}
