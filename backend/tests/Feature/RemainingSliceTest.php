<?php

namespace Tests\Feature;

use App\Modules\Tenancy\Models\Store;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class RemainingSliceTest extends TestCase
{
    use RefreshDatabase;

    private string $storeId;

    private string $itemId;

    private string $productId;

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
        $this->productId = (string) $created->json('data.id');
        $this->postJson('/api/v1/platform/catalog/products/'.$this->productId.'/publish')->assertOk();
        $this->postJson('/api/v1/platform/tenants', [
            'owner_name' => 'Ananya Shah',
            'email' => 'owner@annapurna.store',
            'password' => 'first-pass-1',
            'business_name' => 'Annapurna Stores',
            'slug' => 'annapurna',
            'kind' => 'single_store',
            'plan_code' => 'enterprise',
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
            'items' => [['master_product_id' => $this->productId, 'opening_qty' => 20]],
        ])->assertOk();
        $this->itemId = (string) DB::table('store_items')->value('id');
    }

    public function test_exchange_offline_replay_shop_and_reports(): void
    {
        $before = (int) DB::table('invoice_series')->value('next_number');
        $block = $this->postJson("/api/v1/stores/{$this->storeId}/number-blocks", ['size' => 2])->assertCreated();
        $this->assertSame($before, (int) $block->json('data.start_number'));
        $this->assertSame($before + 2, (int) DB::table('invoice_series')->value('next_number'));

        $this->postJson("/api/v1/stores/{$this->storeId}/shifts/open", ['opening_cash_paise' => 0])->assertCreated();
        $sale = $this->postJson("/api/v1/stores/{$this->storeId}/sales", [
            'client_uuid' => '018f1a00-0000-7000-8000-0000000000d1',
            'cash_tender_paise' => 20000,
            'lines' => [['store_item_id' => $this->itemId, 'qty' => 1, 'serial' => 'SN-1']],
        ])->assertCreated();
        $lineId = (string) DB::table('sale_lines')->where('sale_id', $sale->json('data.id'))->value('id');
        $this->postJson("/api/v1/stores/{$this->storeId}/sales", [
            'client_uuid' => '018f1a00-0000-7000-8000-0000000000d2',
            'cash_tender_paise' => 20000,
            'lines' => [['store_item_id' => $this->itemId, 'qty' => 1, 'serial' => 'SN-1']],
        ])->assertStatus(422);
        $total = (int) $sale->json('data.total_paise');
        $this->postJson('/api/v1/sales/'.$sale->json('data.id').'/exchange', [
            'reason' => 'Wrong bag',
            'client_uuid' => '018f1a00-0000-7000-8000-0000000000d3',
            'cash_tender_paise' => $total,
            'lines' => [['sale_line_id' => $lineId, 'qty' => 1]],
            'replacement' => [['store_item_id' => $this->itemId, 'qty' => 1]],
        ])->assertCreated();
        $this->assertSame(1, DB::table('sale_credit_notes')->count());

        $payload = [
            'sales' => [[
                'client_uuid' => '018f1a00-0000-7000-8000-0000000000d4',
                'cash_tender_paise' => 20000,
                'lines' => [['store_item_id' => $this->itemId, 'qty' => 1]],
            ]],
        ];
        $this->postJson("/api/v1/stores/{$this->storeId}/sales/sync", $payload)->assertOk();
        $this->postJson("/api/v1/stores/{$this->storeId}/sales/sync", $payload)->assertOk();
        $this->assertSame(1, DB::table('sales')->where('client_uuid', '018f1a00-0000-7000-8000-0000000000d4')->count());

        $customer = $this->postJson('/api/v1/customers', ['name' => 'Meera', 'phone' => '9876543210'])->assertCreated();
        $this->postJson("/api/v1/stores/{$this->storeId}/sales", [
            'client_uuid' => '018f1a00-0000-7000-8000-0000000000d5',
            'cash_tender_paise' => 20000,
            'customer_id' => $customer->json('data.id'),
            'lines' => [['store_item_id' => $this->itemId, 'qty' => 1]],
        ])->assertCreated();
        DB::table('customers')->insert([
            'id' => (string) Str::uuid7(),
            'tenant_id' => (string) Str::uuid7(),
            'name' => 'Other Shop',
            'phone_e164' => '9000000000',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $export = $this->getJson('/api/v1/export')->assertOk();
        $this->assertSame('Meera', $export->json('data.customers.0.name'));
        $this->assertStringNotContainsString('Other Shop', $export->getContent());
        $this->getJson('/api/v1/reports/customers')->assertOk()->assertJsonPath('data.0.name', 'Meera');
        $this->assertStringContainsString('cash', $this->get('/api/v1/reports/payments?format=csv')->assertOk()->getContent());
        $this->assertStringContainsString('hsn', $this->get('/api/v1/reports/sales?format=gstr')->assertOk()->getContent());
        $this->assertStringContainsString('Worksheet', $this->get('/api/v1/reports/sales?format=xlsx')->assertOk()->getContent());
        $flags = $this->getJson('/api/v1/billing/features')->assertOk()->json('data');
        $this->assertTrue($flags['module.offline_pos']);
        $this->assertTrue($flags['module.khata']);

        $this->postJson('/api/v1/reports/schedules', ['email' => 'owner@annapurna.store'])->assertCreated();
        $this->artisan('reports:send-schedules')->assertSuccessful();
        $this->assertSame('not_configured', DB::table('notification_logs')->where('template', 'report.daily')->value('status'));
        $this->artisan('reports:aggregate-daily')->assertSuccessful();
        $this->assertGreaterThan(0, (int) DB::table('daily_store_metrics')->value('bills'));

        $this->postJson('/api/v1/billing/utr', ['utr' => 'UTR123456', 'amount_paise' => 149900])->assertCreated();
        $this->postJson('/api/v1/billing/utr', ['utr' => 'UTR123456', 'amount_paise' => 149900])->assertStatus(422);
        $this->postJson('/api/v1/ai/reports/saved', [
            'question' => 'What sold today?',
            'answer' => 'Sales so far today are INR 0.00.',
            'citation' => 'Completed bills dated today',
        ])->assertCreated();
        $this->getJson('/api/v1/ai/reports/saved')->assertOk()->assertJsonPath('data.0.question', 'What sold today?');
        $jobs = DB::table('print_jobs')->count();
        $this->postJson('/api/v1/print-jobs/preview', ['text' => 'Annapurna receipt'])->assertOk()->assertJsonPath('data.jobs', 0);
        $this->postJson('/api/v1/print-jobs/preview', ['text' => '<script>alert(1)</script>'])->assertStatus(422);
        $this->assertSame($jobs, DB::table('print_jobs')->count());

        $this->putJson("/api/v1/stores/{$this->storeId}/sections", [
            'sections' => [['position' => 1, 'kind' => 'announcement', 'title' => 'Open till 9']],
        ])->assertOk();
        $this->getJson('/api/v1/public/stores/annapurna/sections')->assertOk()->assertJsonPath('data.0.title', 'Open till 9');
        $this->getJson('/api/v1/public/orgs/annapurna/stores')->assertOk()->assertJsonPath('data.0.public_slug', 'annapurna');
        $this->getJson('/api/v1/public/i18n/te')->assertOk()->assertJsonPath('data.cart', 'బండి');

        $otp = $this->postJson('/api/v1/public/stores/annapurna/otp', ['phone' => '9876543210'])->assertOk();
        $this->assertSame('not_configured', $otp->json('data.status'));
        $this->postJson('/api/v1/public/stores/annapurna/otp/verify', ['phone' => '9876543210', 'code' => '000000'])->assertStatus(422);
        $this->postJson('/api/v1/public/stores/annapurna/otp/verify', [
            'phone' => '9876543210',
            'code' => $otp->json('data.code'),
        ])->assertOk();

        $this->postJson("/api/v1/stores/{$this->storeId}/delivery-zones", ['pincode' => '560001', 'charge_paise' => 0])->assertOk();
        $order = $this->postJson('/api/v1/public/stores/annapurna/checkout', [
            'customer_name' => 'Meera',
            'customer_phone' => '9876543210',
            'fulfillment' => 'delivery',
            'pincode' => '560001',
            'lines' => [['store_item_id' => $this->itemId, 'qty' => 1]],
        ])->assertCreated();
        foreach (['accepted', 'packing', 'ready', 'out_for_delivery'] as $status) {
            $this->postJson('/api/v1/orders/'.$order->json('data.id').'/transitions', ['to' => $status])->assertOk();
        }
        $this->postJson('/api/v1/orders/'.$order->json('data.id').'/proof', ['note' => 'Left at the door'])->assertOk();
        $this->assertSame('Left at the door', DB::table('deliveries')->value('proof_note'));
    }

    public function test_platform_rollback_plan_page_and_ai_switch(): void
    {
        $this->postJson('/api/v1/auth/staff/logout')->assertOk();
        $this->postJson('/api/v1/auth/platform/login', [
            'email' => 'admin@selfx.test',
            'password' => 'password',
        ])->assertOk();
        $this->postJson('/api/v1/platform/catalog/products/'.$this->productId.'/rollback')->assertOk()->assertJsonPath('data.status', 'draft');
        $this->postJson('/api/v1/platform/catalog/products/'.$this->productId.'/publish')->assertOk();
        $this->putJson('/api/v1/platform/plans/starter/features', ['key' => 'limit.staff', 'value' => 4])
            ->assertOk()
            ->assertJsonPath('data.value', 4);
        $this->postJson('/api/v1/platform/pages', [
            'slug' => 'about',
            'title' => 'About',
            'body' => 'SelfX helps a shop bill and deliver.',
        ])->assertCreated();
        $this->getJson('/api/v1/public/pages/about')->assertOk()->assertJsonPath('data.title', 'About');
        $this->putJson('/api/v1/platform/ai', ['enabled' => false])->assertOk();
        $this->postJson('/api/v1/auth/platform/logout')->assertOk();
        $this->postJson('/api/v1/auth/staff/login', [
            'email' => 'owner@annapurna.store',
            'password' => 'second-pass-1',
            'slug' => 'annapurna',
        ])->assertOk();
        $this->postJson('/api/v1/ai/reports', ['question' => 'What sold today?'])->assertStatus(403);
    }

    private function catalog(string $name): string
    {
        return DB::getDriverName() === 'pgsql' ? 'catalog.'.$name : 'catalog_'.$name;
    }
}
