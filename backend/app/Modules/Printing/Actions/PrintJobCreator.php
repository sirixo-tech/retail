<?php

namespace App\Modules\Printing\Actions;

use App\Modules\Printing\Data\CommandPlan;
use App\Modules\Printing\Enums\DocumentKind;
use App\Modules\Printing\Enums\PrintJobStatus;
use App\Modules\Printing\Models\Printer;
use App\Modules\Printing\Models\PrintJob;
use App\Modules\Printing\Services\PrintProfileService;
use App\Modules\Printing\Services\TemplateCompiler;
use App\Support\Tenancy\TenantContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;

class PrintJobCreator
{
    public function __construct(
        private TemplateCompiler $compiler,
        private PrintProfileService $profileService,
        private TenantContext $tenantContext,
    ) {}

    /**
     * Create a print job from a completed sale.
     */
    public function createFromSale(string $saleId, string $storeId, ?string $purpose = null, ?string $cut = null, ?bool $drawer = null): PrintJob
    {
        $tenantId = $this->tenantContext->id();

        // Load sale
        $saleQuery = DB::table('sales')->where('id', $saleId);
        if ($tenantId) {
            $saleQuery->where('tenant_id', $tenantId);
        }
        $sale = $saleQuery->first();

        if (!$sale) {
            throw new InvalidArgumentException("Sale not found: {$saleId}");
        }

        $tenantId = $tenantId ?: $sale->tenant_id;

        // Load sale lines
        $lines = DB::table('sale_lines')
            ->where('sale_id', $saleId)
            ->get();

        // Load store details
        $store = DB::table('stores')
            ->where('id', $storeId)
            ->first();

        if (!$store) {
            throw new InvalidArgumentException("Store not found: {$storeId}");
        }

        // Determine purpose: if this sale already has a print job, mark as reprint unless specified
        if ($purpose === null) {
            $existingJob = DB::table('print_jobs')
                ->where('sale_id', $saleId)
                ->where('purpose', 'sale')
                ->exists();
            $purpose = $existingJob ? 'reprint' : 'sale';
        }

        // Load payments
        $payments = DB::table('sale_payments')
            ->where('sale_id', $saleId)
            ->get();

        // Load customer if exists
        $customer = null;
        if (!empty($sale->customer_id)) {
            $customer = DB::table('customers')->where('id', $sale->customer_id)->first();
        }

        // Build context for template compilation
        $context = $this->buildSaleContext($sale, $lines, $store, $payments, $customer);

        // Get print profile for this store and receipt document kind
        $profile = $this->profileService->getProfile($storeId, DocumentKind::RECEIPT);

        // Determine driver and locale
        $driverName = $profile?->driver_name ?? 'escpos';
        $locale = $store->default_locale ?? 'en';

        // Compile template
        $commandPlan = $this->compiler->compile(
            $tenantId,
            DocumentKind::RECEIPT,
            $locale,
            $context,
            $driverName
        );

        // Determine drawer setting
        $openDrawer = $drawer !== null ? $drawer : $this->shouldOpenDrawer($sale, $payments, $profile);

        // Create print job
        $printJob = new PrintJob();
        $printJob->id = (string) Str::uuid7();
        $printJob->tenant_id = $tenantId;
        $printJob->store_id = $storeId;
        $printJob->kind = DocumentKind::RECEIPT->value;
        $printJob->sale_id = $saleId;
        $printJob->command_plan = $commandPlan->toArray();
        $printJob->cut = $cut !== null ? $cut : ($profile?->cut_mode ?? 'partial');
        $printJob->drawer = $openDrawer;
        $printJob->status = PrintJobStatus::QUEUED->value;
        $printJob->purpose = $purpose;
        $printJob->retry_count = 0;
        $printJob->save();

        return $printJob;
    }

    /**
     * Create a test print job for a store/printer.
     */
    public function createTestJob(string $storeId, ?string $printerId = null): PrintJob
    {
        $tenantId = $this->tenantContext->id();

        $store = DB::table('stores')->where('id', $storeId)->first();
        if (!$store) {
            throw new InvalidArgumentException("Store not found: {$storeId}");
        }

        $tenantId = $tenantId ?: $store->tenant_id;

        $printer = null;
        if ($printerId) {
            $printer = Printer::query()->where('id', $printerId)->first();
        }

        $driverName = $printer?->driver ?? 'escpos';
        $locale = $store->default_locale ?? 'en';

        // Retrieve fixture data
        $fixtureData = $this->compiler->getRepository()->getFixtureData(DocumentKind::RECEIPT);
        $fixtureData['store_name'] = $store->name ?? $fixtureData['store_name'];

        // Compile template with fixture data
        $commandPlan = $this->compiler->compile(
            $tenantId,
            DocumentKind::RECEIPT,
            $locale,
            $fixtureData,
            $driverName
        );

        // Create test print job
        $printJob = new PrintJob();
        $printJob->id = (string) Str::uuid7();
        $printJob->tenant_id = $tenantId;
        $printJob->store_id = $storeId;
        $printJob->kind = DocumentKind::RECEIPT->value;
        $printJob->sale_id = null;
        $printJob->command_plan = $commandPlan->toArray();
        $printJob->cut = 'partial';
        $printJob->drawer = false;
        $printJob->status = PrintJobStatus::QUEUED->value;
        $printJob->purpose = 'test';
        $printJob->retry_count = 0;
        $printJob->save();

        return $printJob;
    }

    /**
     * Build rich context array matching block template variable keys.
     */
    private function buildSaleContext(object $sale, $lines, object $store, $payments, ?object $customer = null): array
    {
        // Compute payment methods
        $paymentMethodsList = [];
        $totalPaidPaise = 0;
        $changePaise = 0;

        foreach ($payments as $payment) {
            $paymentMethodsList[] = ucfirst($payment->method ?? 'Cash');
            $totalPaidPaise += (int) ($payment->amount_paise ?? 0);
            $changePaise += (int) ($payment->change_paise ?? 0);
        }

        $primaryPaymentMethod = !empty($paymentMethodsList) ? $paymentMethodsList[0] : 'Cash';
        $paymentMethodSummary = !empty($paymentMethodsList) ? implode(', ', array_unique($paymentMethodsList)) : 'Cash';

        $lineItems = [];
        $taxTable = [];

        foreach ($lines as $line) {
            $lineItems[] = [
                'name' => $line->description_snapshot ?? 'Item',
                'description' => $line->description_snapshot ?? 'Item',
                'qty' => (float) ($line->qty ?? 1),
                'unit_price_paise' => (int) ($line->unit_price_paise ?? 0),
                'line_total_paise' => (int) ($line->line_total_paise ?? 0),
                'taxable_paise' => (int) ($line->taxable_paise ?? 0),
                'gst_bps' => (int) ($line->gst_bps ?? 0),
                'rate_percent' => ((int) ($line->gst_bps ?? 0)) / 100,
                'cgst_paise' => (int) ($line->cgst_paise ?? 0),
                'sgst_paise' => (int) ($line->sgst_paise ?? 0),
                'igst_paise' => (int) ($line->igst_paise ?? 0),
                'hsn' => $line->hsn_snapshot ?? '',
                'serial' => $line->serial ?? '',
            ];

            $rate = ((int) ($line->gst_bps ?? 0)) / 100;
            $rateKey = (string) $rate;
            if (!isset($taxTable[$rateKey])) {
                $taxTable[$rateKey] = [
                    'rate' => $rate,
                    'taxable' => 0,
                    'cgst' => 0,
                    'sgst' => 0,
                    'igst' => 0,
                    'total_tax' => 0,
                ];
            }
            $taxTable[$rateKey]['taxable'] += (int) ($line->taxable_paise ?? 0);
            $taxTable[$rateKey]['cgst'] += (int) ($line->cgst_paise ?? 0);
            $taxTable[$rateKey]['sgst'] += (int) ($line->sgst_paise ?? 0);
            $taxTable[$rateKey]['igst'] += (int) ($line->igst_paise ?? 0);
            $taxTable[$rateKey]['total_tax'] += ((int) ($line->cgst_paise ?? 0) + (int) ($line->sgst_paise ?? 0) + (int) ($line->igst_paise ?? 0));
        }

        $loyaltyPoints = (int) DB::table('loyalty_entries')
            ->where('sale_id', $sale->id)
            ->where('direction', 'earn')
            ->value('points');

        return [
            'store_name' => $store->name ?? 'Retail Store',
            'store_city' => $store->city ?? 'Bangalore',
            'store_address' => $store->address ?? '',
            'store_phone' => $store->phone ?? '',
            'gstin' => $store->gstin ?? '',
            'sale_number' => $sale->number ?? $sale->id,
            'invoice_number' => $sale->number ?? $sale->id,
            'created_at' => $sale->created_at ?? now()->toIso8601String(),
            'subtotal_paise' => (int) ($sale->subtotal_paise ?? 0),
            'discount_paise' => (int) ($sale->discount_paise ?? 0),
            'cgst_paise' => (int) ($sale->cgst_paise ?? 0),
            'sgst_paise' => (int) ($sale->sgst_paise ?? 0),
            'igst_paise' => (int) ($sale->igst_paise ?? 0),
            'tax_total_paise' => ((int) ($sale->cgst_paise ?? 0) + (int) ($sale->sgst_paise ?? 0) + (int) ($sale->igst_paise ?? 0)),
            'round_off_paise' => (int) ($sale->round_off_paise ?? 0),
            'grand_total_paise' => (int) ($sale->total_paise ?? 0),
            'total_paise' => (int) ($sale->total_paise ?? 0),
            'payment_method' => $primaryPaymentMethod,
            'payment_methods' => $paymentMethodSummary,
            'cash_tender_paise' => $totalPaidPaise,
            'change_paise' => $changePaise,
            'customer_name' => $customer->name ?? '',
            'customer_phone' => $customer->phone ?? '',
            'customer_points' => $loyaltyPoints,
            'line_items' => $lineItems,
            'tax_breakup' => array_values($taxTable),
        ];
    }

    /**
     * Determine if cash drawer should open.
     */
    private function shouldOpenDrawer(object $sale, $payments, ?object $profile): bool
    {
        if (!$profile || empty($profile->open_drawer_on)) {
            return false;
        }

        $rule = $profile->open_drawer_on;
        if ($rule === 'never') {
            return false;
        }

        if ($rule === 'all_payments') {
            return true;
        }

        if ($rule === 'cash') {
            // Check if any payment method was cash
            foreach ($payments as $payment) {
                if (strtolower($payment->method ?? '') === 'cash') {
                    return true;
                }
            }
            // Fallback check if sale had cash tender
            if (isset($sale->payment_method) && strtolower($sale->payment_method) === 'cash') {
                return true;
            }
        }

        return false;
    }
}
