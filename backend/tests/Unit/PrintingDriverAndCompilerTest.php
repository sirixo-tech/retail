<?php

namespace Tests\Unit;

use App\Modules\Printing\Data\BlockTemplate;
use App\Modules\Printing\Drivers\EscposDriver;
use App\Modules\Printing\Drivers\SystemDriver;
use App\Modules\Printing\Enums\DocumentKind;
use App\Modules\Printing\Enums\PrintJobStatus;
use App\Modules\Printing\Exceptions\TemplateCompilationException;
use App\Modules\Printing\Models\PrintJob;
use App\Modules\Printing\Services\PrintDriverRegistry;
use App\Modules\Printing\Services\PrintJobFailureHandler;
use App\Modules\Printing\Services\TemplateCompiler;
use App\Modules\Printing\Services\TemplateRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PrintingDriverAndCompilerTest extends TestCase
{
    use RefreshDatabase;

    private TemplateCompiler $compiler;
    private TemplateRepository $repository;

    protected function setUp(): void
    {
        parent::setUp();

        $registry = new PrintDriverRegistry();

        $this->repository = new TemplateRepository();
        $this->compiler = new TemplateCompiler($this->repository, $registry);
    }

    public function test_escpos_driver_compiles_text_feed_and_cut(): void
    {
        $driver = new EscposDriver();
        $template = BlockTemplate::fromArray([
            'paper_width_mm' => 80,
            'blocks' => [
                ['type' => 'text', 'content' => 'SELF-X STORE', 'align' => 'center', 'weight' => 'bold'],
                ['type' => 'feed', 'lines' => 2],
                ['type' => 'cut', 'mode' => 'partial'],
            ],
        ]);

        $plan = $driver->compile($template, []);

        $this->assertEquals('escpos', $plan->format);
        $this->assertNotEmpty($plan->data);
        $this->assertStringContainsString('SELF-X STORE', base64_decode($plan->data));
    }

    public function test_system_driver_compiles_clean_html_with_receipt_css(): void
    {
        $driver = new SystemDriver();
        $template = BlockTemplate::fromArray([
            'paper_width_mm' => 80,
            'blocks' => [
                ['type' => 'text', 'content' => 'Super Market Receipt', 'align' => 'center', 'size' => 'lg', 'weight' => 'bold'],
                ['type' => 'rule', 'char' => '-', 'width' => 48],
                ['type' => 'text', 'content' => 'Total: Rs 500', 'align' => 'right'],
            ],
        ]);

        $plan = $driver->compile($template, []);

        $this->assertEquals('html', $plan->format);
        $decoded = base64_decode($plan->data);
        $this->assertStringContainsString('Super Market Receipt', $decoded);
        $this->assertStringContainsString('receipt-container', $decoded);
    }

    public function test_template_compiler_enforces_locked_blocks_on_tax_receipts(): void
    {
        // Template missing invoice_number and gstin
        $invalidTemplate = BlockTemplate::fromArray([
            'paper_width_mm' => 80,
            'blocks' => [
                ['type' => 'text', 'content' => 'Store Name'],
                ['type' => 'text', 'content' => 'Thank you!'],
            ],
        ]);

        $this->expectException(TemplateCompilationException::class);
        $this->compiler->validateLockedBlocks($invalidTemplate, DocumentKind::RECEIPT);
    }

    public function test_template_compiler_passes_when_all_locked_blocks_are_present(): void
    {
        $validTemplate = BlockTemplate::fromArray([
            'paper_width_mm' => 80,
            'blocks' => [
                ['type' => 'text', 'content' => 'Invoice: {{invoice_number}}', 'locked' => true],
                ['type' => 'text', 'content' => 'GSTIN: {{gstin}}', 'locked' => true],
                ['type' => 'text', 'content' => 'Tax: {{tax_table}}', 'locked' => true],
            ],
        ]);

        $this->compiler->validateLockedBlocks($validTemplate, DocumentKind::RECEIPT);
        $this->assertTrue(true); // Reached here without exception
    }

    public function test_preview_is_strictly_side_effect_free(): void
    {
        $initialJobCount = PrintJob::count();

        $preview = $this->compiler->preview(
            tenantId: null,
            kind: DocumentKind::RECEIPT,
            locale: 'en'
        );

        $this->assertNotEmpty($preview['html']);
        $this->assertEquals($initialJobCount, PrintJob::count());
    }

    public function test_failure_handler_retries_transient_printer_offline(): void
    {
        $handler = new PrintJobFailureHandler();
        $job = new PrintJob();
        $job->id = (string) \Illuminate\Support\Str::uuid();
        $job->tenant_id = (string) \Illuminate\Support\Str::uuid();
        $job->store_id = (string) \Illuminate\Support\Str::uuid();
        $job->kind = 'receipt';
        $job->status = PrintJobStatus::QUEUED->value;
        $job->retry_count = 0;
        $job->save();

        $handler->handleFailure($job, 'printer_offline');

        $refreshed = PrintJob::find($job->id);
        $this->assertEquals(1, $refreshed->retry_count);
        $this->assertEquals('printer_offline', $refreshed->failure_reason);
        // Should be rescheduled to queued
        $this->assertEquals(PrintJobStatus::QUEUED->value, $refreshed->status);
    }
}
