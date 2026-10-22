<?php

namespace Tests\Feature;

use App\Modules\Tenancy\Models\Store;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ServiceEdgesTest extends TestCase
{
    use RefreshDatabase;

    public function test_sms_stays_unsent_print_jobs_queue_and_ai_refuses_sql(): void
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
            'items' => [['master_product_id' => $created->json('data.id'), 'opening_qty' => 3]],
        ])->assertOk();
        $itemId = (string) DB::table('store_items')->value('id');

        $this->postJson('/api/v1/public/stores/annapurna/checkout', [
            'customer_name' => 'Meera',
            'customer_phone' => '9876543210',
            'fulfillment' => 'pickup',
            'lines' => [['store_item_id' => $itemId, 'qty' => 1]],
        ])->assertCreated();
        $this->getJson('/api/v1/notifications')->assertOk()
            ->assertJsonPath('data.0.status', 'not_configured')
            ->assertJsonPath('data.0.channel', 'sms');

        $this->postJson("/api/v1/stores/{$storeId}/shifts/open", ['opening_cash_paise' => 0])->assertCreated();
        $sale = $this->postJson("/api/v1/stores/{$storeId}/sales", [
            'client_uuid' => '018f1a00-0000-7000-8000-0000000000b7',
            'cash_tender_paise' => 10500,
            'lines' => [['store_item_id' => $itemId, 'qty' => 1]],
        ])->assertCreated();
        $job = $this->postJson('/api/v1/print-jobs', [
            'kind' => 'receipt',
            'sale_id' => $sale->json('data.id'),
            'cut' => 'partial',
            'drawer' => true,
        ])->assertCreated();
        $this->getJson('/api/v1/print-jobs')->assertOk()->assertJsonPath('data.0.drawer', true);
        $this->postJson('/api/v1/print-jobs/'.$job->json('data.id').'/ack')->assertOk();
        $this->getJson('/api/v1/print-jobs')->assertOk()->assertJsonCount(0, 'data');

        $answer = $this->postJson('/api/v1/ai/reports', ['question' => 'What sold today?'])->assertOk();
        $this->assertStringContainsString('INR', $answer->json('data.answer'));
        $this->assertStringNotContainsString('select', strtolower($answer->json('data.answer')));
        $this->postJson('/api/v1/ai/reports', ['question' => 'select * from sales'])->assertStatus(422);

        $this->assertNotEmpty($tenant->json('data.id'));
    }

    private function catalog(string $name): string
    {
        return DB::getDriverName() === 'pgsql' ? 'catalog.'.$name : 'catalog_'.$name;
    }
}
