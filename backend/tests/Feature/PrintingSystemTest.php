<?php

namespace Tests\Feature;

use App\Modules\Printing\Actions\PrintJobCreator;
use App\Modules\Printing\Enums\DocumentKind;
use App\Modules\Printing\Events\SaleCompleted;
use App\Modules\Printing\Models\Printer;
use App\Modules\Printing\Models\PrintJob;
use App\Modules\Tenancy\Models\Store;
use Database\Seeders\PrintingTemplateSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class PrintingSystemTest extends TestCase
{
    use RefreshDatabase;

    private string $tenantId;
    private string $storeId;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
        $this->seed(PrintingTemplateSeeder::class);

        // Login as platform admin and create tenant
        $this->postJson('/api/v1/auth/platform/login', [
            'email' => 'admin@selfx.test',
            'password' => 'password',
        ])->assertOk();

        $tenantResponse = $this->postJson('/api/v1/platform/tenants', [
            'owner_name' => 'Kiran Sharma',
            'email' => 'kiran@printshop.test',
            'password' => 'first-pass-1',
            'business_name' => 'Kiran Retail Mart',
            'slug' => 'kiranmart',
            'kind' => 'single_store',
            'plan_code' => 'starter',
        ])->assertCreated();

        $this->tenantId = (string) $tenantResponse->json('data.id');
        $this->storeId = (string) Store::query()->where('tenant_id', $this->tenantId)->value('id');

        // Logout platform and login as store staff
        $this->postJson('/api/v1/auth/platform/logout')->assertOk();
        $this->postJson('/api/v1/auth/staff/login', [
            'email' => 'kiran@printshop.test',
            'password' => 'first-pass-1',
            'slug' => 'kiranmart',
        ])->assertOk();
        $this->changeRequiredPassword();
    }

    public function test_printer_registration_listing_and_heartbeat(): void
    {
        // 1. Register printer
        $res = $this->postJson('/api/v1/printers', [
            'store_id' => $this->storeId,
            'name' => 'Counter Thermal 80mm',
            'transport' => 'agent',
            'driver' => 'escpos',
            'connection_params' => [
                'type' => 'usb',
                'vendor_id' => 1155,
                'product_id' => 22339,
            ],
        ])->assertCreated();

        $printerId = $res->json('data.id');
        $this->assertNotEmpty($printerId);

        // 2. List printers
        $listRes = $this->getJson("/api/v1/printers?store_id={$this->storeId}")
            ->assertOk();

        $this->assertCount(1, $listRes->json('data'));
        $this->assertEquals('Counter Thermal 80mm', $listRes->json('data.0.name'));

        // 3. Heartbeat update
        $this->postJson("/api/v1/printers/{$printerId}/heartbeat", [
            'status' => 'online',
        ])->assertOk();

        $this->assertDatabaseHas('printers', [
            'id' => $printerId,
            'status' => 'online',
        ]);
    }

    public function test_pairing_workflow_generates_code_and_issues_device_token(): void
    {
        // 1. Agent initiates pairing
        $initRes = $this->postJson('/api/v1/printers/pair-code', [
            'store_id' => $this->storeId,
            'agent_fingerprint' => 'agent-mac-pc-01',
        ])->assertCreated();

        $code = $initRes->json('data.code');
        $this->assertMatchesRegularExpression('/^[0-9]{4}$/', $code);

        // 2. POS submits code
        $pairRes = $this->postJson('/api/v1/printers/pair', [
            'code' => $code,
            'store_id' => $this->storeId,
            'agent_fingerprint' => 'agent-mac-pc-01',
        ])->assertOk();

        $deviceToken = $pairRes->json('data.device_token');
        $this->assertNotEmpty($deviceToken);

        // 3. Re-submitting the same expired/completed code fails with 404
        $this->postJson('/api/v1/printers/pair', [
            'code' => $code,
            'store_id' => $this->storeId,
        ])->assertStatus(404);
    }

    public function test_print_profile_routing(): void
    {
        // Create printer
        $printer = Printer::create([
            'id' => (string) Str::uuid7(),
            'tenant_id' => $this->tenantId,
            'store_id' => $this->storeId,
            'name' => 'Bill Printer 1',
            'transport' => 'browser_raw',
            'driver' => 'escpos',
            'status' => 'online',
        ]);

        // Save profile
        $saveRes = $this->putJson('/api/v1/print-profiles', [
            'store_id' => $this->storeId,
            'document_kind' => 'receipt',
            'printer_id' => $printer->id,
            'driver_name' => 'escpos',
            'cut_mode' => 'partial',
            'open_drawer_on' => 'cash',
        ])->assertOk();

        $this->assertEquals('cash', $saveRes->json('data.open_drawer_on'));

        // Retrieve profiles
        $getRes = $this->getJson("/api/v1/print-profiles?store_id={$this->storeId}")
            ->assertOk();

        $this->assertCount(1, $getRes->json('data'));
        $this->assertEquals($printer->id, $getRes->json('data.0.printer_id'));
    }

    public function test_test_print_creates_queued_job_without_sale_id(): void
    {
        $printer = Printer::create([
            'id' => (string) Str::uuid7(),
            'tenant_id' => $this->tenantId,
            'store_id' => $this->storeId,
            'name' => 'Thermal Test Printer',
            'transport' => 'agent',
            'driver' => 'escpos',
            'status' => 'online',
        ]);

        $res = $this->postJson("/api/v1/printers/{$printer->id}/test-print")
            ->assertCreated();

        $jobId = $res->json('data.job_id');
        $this->assertNotEmpty($jobId);

        $this->assertDatabaseHas('print_jobs', [
            'id' => $jobId,
            'store_id' => $this->storeId,
            'purpose' => 'test',
            'status' => 'queued',
            'sale_id' => null,
        ]);
    }

    public function test_sale_completed_event_creates_print_job(): void
    {
        // Setup counter, shift, series, and sale record
        $shiftId = (string) Str::uuid7();
        $counterId = (string) DB::table('counters')->where('store_id', $this->storeId)->value('id');
        if (!$counterId) {
            $counterId = (string) Str::uuid7();
            DB::table('counters')->insert([
                'id' => $counterId,
                'tenant_id' => $this->tenantId,
                'store_id' => $this->storeId,
                'code' => 'C1',
                'name' => 'Main Counter',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // Configure printer and active receipt profile for store
        $printerId = (string) Str::uuid7();
        DB::table('printers')->insert([
            'id' => $printerId,
            'tenant_id' => $this->tenantId,
            'store_id' => $this->storeId,
            'name' => 'Receipt Thermal Printer',
            'transport' => 'agent',
            'driver' => 'escpos',
            'status' => 'online',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('print_profiles')->insert([
            'id' => (string) Str::uuid7(),
            'store_id' => $this->storeId,
            'document_kind' => 'receipt',
            'printer_id' => $printerId,
            'driver_name' => 'escpos',
            'cut_mode' => 'partial',
            'open_drawer_on' => 'cash',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $saleId = (string) Str::uuid7();
        DB::table('sales')->insert([
            'id' => $saleId,
            'tenant_id' => $this->tenantId,
            'store_id' => $this->storeId,
            'counter_id' => $counterId,
            'number' => 'INV-2026-0001',
            'client_uuid' => (string) Str::uuid(),
            'status' => 'completed',
            'gst_pricing_mode' => 'inclusive',
            'subtotal_paise' => 10000,
            'discount_paise' => 0,
            'cgst_paise' => 900,
            'sgst_paise' => 900,
            'igst_paise' => 0,
            'total_paise' => 11800,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('sale_lines')->insert([
            'id' => (string) Str::uuid7(),
            'sale_id' => $saleId,
            'description_snapshot' => 'Premium Olive Oil 1L',
            'qty' => 1,
            'unit_price_paise' => 11800,
            'taxable_paise' => 10000,
            'cgst_paise' => 900,
            'sgst_paise' => 900,
            'igst_paise' => 0,
            'gst_bps' => 1800,
            'line_total_paise' => 11800,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('sale_payments')->insert([
            'id' => (string) Str::uuid7(),
            'sale_id' => $saleId,
            'method' => 'cash',
            'amount_paise' => 12000,
            'change_paise' => 200,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Dispatch SaleCompleted event
        event(new SaleCompleted($saleId, $this->storeId, $this->tenantId));

        // Verify queued print job created
        $this->assertDatabaseHas('print_jobs', [
            'store_id' => $this->storeId,
            'sale_id' => $saleId,
            'kind' => 'receipt',
            'status' => 'queued',
            'purpose' => 'sale',
        ]);

        $job = PrintJob::query()->where('sale_id', $saleId)->first();
        $this->assertNotNull($job);
        $this->assertNotEmpty($job->command_plan);
    }

    public function test_pos_polling_and_acknowledging_print_job(): void
    {
        // Enqueue manual print job
        $storeRes = $this->postJson('/api/v1/print-jobs', [
            'store_id' => $this->storeId,
            'kind' => 'receipt',
            'cut' => 'partial',
            'drawer' => true,
        ])->assertCreated();

        $jobId = $storeRes->json('data.id');

        // Poll print jobs
        $pollRes = $this->getJson("/api/v1/print-jobs?store_id={$this->storeId}")
            ->assertOk();

        $matching = collect($pollRes->json('data'))->firstWhere('id', $jobId);
        $this->assertNotNull($matching);
        $this->assertTrue($matching['drawer']);

        // Acknowledge print job
        $ackRes = $this->postJson("/api/v1/print-jobs/{$jobId}/ack", [
            'status' => 'printed',
        ])->assertOk();

        $this->assertEquals('printed', $ackRes->json('data.status'));

        // Idempotent re-acknowledgment
        $this->postJson("/api/v1/print-jobs/{$jobId}/ack", [
            'status' => 'printed',
        ])->assertOk();

        $this->assertDatabaseHas('print_jobs', [
            'id' => $jobId,
            'status' => 'printed',
        ]);
    }

    public function test_template_preview_and_tenant_override(): void
    {
        // Preview active receipt template
        $previewRes = $this->postJson('/api/v1/templates/preview', [
            'kind' => 'receipt',
            'locale' => 'en',
        ])->assertOk();

        $this->assertNotEmpty($previewRes->json('data.html'));
        $this->assertStringContainsString('receipt-container', $previewRes->json('data.html'));

        // Get active template
        $tplRes = $this->getJson('/api/v1/templates/receipt?locale=en')
            ->assertOk();

        $content = $tplRes->json('data.content');
        $this->assertNotEmpty($content['blocks']);

        // Save tenant override (customized content with locked blocks preserved)
        $customContent = $content;
        $customContent['blocks'][] = [
            'type' => 'text',
            'content' => 'CUSTOM TENANT PROMO: 10% OFF ON WEEKENDS!',
            'align' => 'center',
            'weight' => 'bold',
        ];

        $updateRes = $this->putJson('/api/v1/templates/receipt', [
            'locale' => 'en',
            'content' => $customContent,
        ])->assertOk();

        $this->assertEquals(1, $updateRes->json('data.version'));
        $this->assertEquals($this->tenantId, $updateRes->json('data.tenant_id'));

        // Verify version recorded in audit table
        $this->assertDatabaseHas('document_template_versions', [
            'template_id' => $updateRes->json('data.id'),
            'version_number' => 1,
        ]);
    }
}
