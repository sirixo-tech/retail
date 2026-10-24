<?php

namespace App\Modules\Printing\Services;

use App\Modules\Printing\Data\BlockTemplate;
use App\Modules\Printing\Enums\DocumentKind;
use App\Modules\Printing\Models\DocumentTemplate;
use App\Modules\Printing\Models\DocumentTemplateVersion;
use Illuminate\Support\Str;

class TemplateRepository
{
    public function getActiveTemplate(?string $tenantId, DocumentKind|string $kind, string $locale = 'en'): ?DocumentTemplate
    {
        $kindStr = $kind instanceof DocumentKind ? $kind->value : $kind;

        // 1. Try tenant override in requested locale
        if ($tenantId) {
            $template = DocumentTemplate::query()
                ->where('tenant_id', $tenantId)
                ->where('kind', $kindStr)
                ->where('locale', $locale)
                ->first();

            if ($template) {
                return $template;
            }

            // Fallback to English tenant override
            if ($locale !== 'en') {
                $template = DocumentTemplate::query()
                    ->where('tenant_id', $tenantId)
                    ->where('kind', $kindStr)
                    ->where('locale', 'en')
                    ->first();

                if ($template) {
                    return $template;
                }
            }
        }

        // 2. Try platform default (tenant_id IS NULL) in requested locale
        $default = DocumentTemplate::query()
            ->whereNull('tenant_id')
            ->where('kind', $kindStr)
            ->where('locale', $locale)
            ->first();

        if ($default) {
            return $default;
        }

        // 3. Fallback to platform default in English
        $defaultEn = DocumentTemplate::query()
            ->whereNull('tenant_id')
            ->where('kind', $kindStr)
            ->where('locale', 'en')
            ->first();

        if ($defaultEn) {
            return $defaultEn;
        }

        // 4. If not even in DB, synthesize platform default
        return $this->synthesizeDefault($kindStr, $locale);
    }

    public function saveTenantTemplate(string $tenantId, DocumentKind|string $kind, string $locale, array|BlockTemplate $content, ?string $userId = null): DocumentTemplate
    {
        $kindStr = $kind instanceof DocumentKind ? $kind->value : $kind;
        $contentArray = $content instanceof BlockTemplate ? $content->toArray() : $content;

        $template = DocumentTemplate::query()
            ->where('tenant_id', $tenantId)
            ->where('kind', $kindStr)
            ->where('locale', $locale)
            ->first();

        if ($template) {
            $nextVersion = $template->version + 1;
            $template->content = $contentArray;
            $template->version = $nextVersion;
            $template->save();
        } else {
            $template = DocumentTemplate::create([
                'id' => (string) Str::uuid7(),
                'tenant_id' => $tenantId,
                'kind' => $kindStr,
                'locale' => $locale,
                'content' => $contentArray,
                'version' => 1,
                'is_locked' => false,
                'created_by' => $userId,
            ]);
        }

        // Append to audit trail
        DocumentTemplateVersion::create([
            'id' => (string) Str::uuid7(),
            'template_id' => $template->id,
            'version_number' => $template->version,
            'content' => $contentArray,
            'edited_by' => $userId,
            'created_at' => now(),
        ]);

        return $template;
    }

    public function saveTenantVersion(string $tenantId, DocumentKind|string $kind, string $locale, array|BlockTemplate $content, ?string $userId = null): DocumentTemplate
    {
        return $this->saveTenantTemplate($tenantId, $kind, $locale, $content, $userId);
    }

    public function deleteTenantOverride(string $tenantId, DocumentKind|string $kind, string $locale): bool
    {
        $kindStr = $kind instanceof DocumentKind ? $kind->value : $kind;

        return (bool) DocumentTemplate::query()
            ->where('tenant_id', $tenantId)
            ->where('kind', $kindStr)
            ->where('locale', $locale)
            ->delete();
    }

    public function getFixtureData(DocumentKind|string $kind): array
    {
        $kindStr = $kind instanceof DocumentKind ? $kind->value : $kind;

        $base = [
            'store_name' => 'ANNAPURNA SUPERMARKET',
            'store_tagline' => 'Fresh Groceries & Daily Essentials',
            'store_address' => 'Plot 42, Road No. 12, Banjara Hills, Hyderabad - 500034',
            'store_city' => 'HYDERABAD',
            'store_phone' => '+91 98765 43210',
            'gstin' => '36AABCA1234F1Z5',
            'fssai' => '13621011000452',
            'drug_lic' => 'DL-20B/21B-9988',
            'sale_number' => 'INV-2026-0042',
            'token_number' => '42',
            'register_name' => 'Counter #1',
            'cashier_name' => 'Kiran Sharma',
            'created_at' => date('d-m-Y H:i'),
            'customer_name' => 'Rahul Verma',
            'customer_phone' => '+91 98450 11223',
            'buyer_gstin' => '36AAACR5566K1Z1',
            'payment_method' => 'UPI (PhonePe)',
            'subtotal' => '₹609.52',
            'subtotal_formatted' => '₹609.52',
            'subtotal_paise' => 60952,
            'tax_total' => '₹30.48',
            'tax_total_paise' => 3048,
            'cgst' => '₹15.24',
            'cgst_formatted' => '₹15.24',
            'cgst_paise' => 1524,
            'sgst' => '₹15.24',
            'sgst_formatted' => '₹15.24',
            'sgst_paise' => 1524,
            'igst' => '₹0.00',
            'discount' => '₹0.00',
            'discount_paise' => 0,
            'grand_total' => '₹640.00',
            'grand_total_formatted' => '₹640.00',
            'grand_total_paise' => 64000,
            'total' => '₹640.00',
            'items_count' => 2,
            'total_qty' => 3,
            'savings_total' => '₹60.00',
            'loyalty_points_earned' => 6,
            'loyalty_points_balance' => 142,
            'khata_balance' => '₹0.00',
            'return_policy' => 'Goods once sold can be exchanged within 7 days with original tax invoice.',
            'thank_you' => 'THANK YOU FOR YOUR ORDER! VISIT AGAIN.',
            'line_items' => [
                [
                    'name' => 'Tata Tea Gold 500g',
                    'qty' => 2,
                    'unit_price' => '₹320.00',
                    'unit_price_formatted' => '₹320.00',
                    'line_total' => '₹640.00',
                    'line_total_formatted' => '₹640.00',
                    'hsn' => '09024020',
                    'gst_pct' => 5,
                    'sku' => 'TTG-500',
                ],
                [
                    'name' => 'Fortune Rozana Basmati 1kg',
                    'qty' => 1,
                    'unit_price' => '₹110.00',
                    'unit_price_formatted' => '₹110.00',
                    'line_total' => '₹110.00',
                    'line_total_formatted' => '₹110.00',
                    'hsn' => '10063020',
                    'gst_pct' => 5,
                    'sku' => 'FRB-1KG',
                ],
            ],
        ];

        if ($kindStr === 'label') {
            $base['barcode'] = '8901052003892';
            $base['product_name'] = 'Tata Tea Gold 500g';
            $base['mrp'] = '₹350.00';
            $base['selling_price'] = '₹320.00';
            $base['sku'] = 'TTG-500';
            $base['pkd_date'] = date('m/y');
        } elseif ($kindStr === 'pick_list') {
            $base['order_number'] = 'ORD-2026-9921';
            $base['picker_name'] = 'Suresh Dispatch';
            $base['channel'] = 'Online Web Store';
        } elseif ($kindStr === 'delivery_note') {
            $base['delivery_address'] = 'Flat 402, Green Palms, Indiranagar, Bengaluru - 560038';
            $base['delivery_rider'] = 'Ramesh Rider (+91 99000 11222)';
        }

        return $base;
    }

    public function getDefaultTemplateContent(DocumentKind|string $kind, string $locale = 'en'): array
    {
        $kindStr = $kind instanceof DocumentKind ? $kind->value : $kind;

        $footerMsg = match ($locale) {
            'te' => 'మీ ఆర్డర్‌కు ధన్యవాదాలు! మళ్లీ సందర్శించండి.',
            'hi' => 'आपके आर्डर के लिए धन्यवाद! फिर पधारें।',
            default => 'THANK YOU FOR YOUR ORDER! VISIT AGAIN.',
        };

        if ($kindStr === 'label') {
            return [
                'paper_width_mm' => 50,
                'blocks' => [
                    ['type' => 'text', 'content' => '{{store_name}}', 'align' => 'center', 'size' => 'sm', 'weight' => 'bold'],
                    ['type' => 'text', 'content' => '{{product_name}}', 'align' => 'center', 'size' => 'md', 'weight' => 'bold'],
                    ['type' => 'text', 'content' => 'MRP: {{mrp}} (Incl. of all taxes)', 'align' => 'center', 'size' => 'sm'],
                    ['type' => 'text', 'content' => 'OUR PRICE: {{selling_price}}', 'align' => 'center', 'size' => 'md', 'weight' => 'bold'],
                    ['type' => 'barcode', 'data' => '{{barcode}}', 'barcodeType' => 'CODE128', 'height' => 40],
                    ['type' => 'text', 'content' => 'SKU: {{sku}} | PKD: {{pkd_date}}', 'align' => 'center', 'size' => 'sm'],
                    ['type' => 'feed', 'lines' => 1],
                ],
            ];
        }

        if ($kindStr === 'pick_list') {
            return [
                'paper_width_mm' => 80,
                'blocks' => [
                    ['type' => 'text', 'content' => 'PICK LIST / PACKING SLIP', 'align' => 'center', 'size' => 'lg', 'weight' => 'bold'],
                    ['type' => 'text', 'content' => 'Order #{{order_number}}', 'align' => 'center', 'size' => 'md'],
                    ['type' => 'text', 'content' => 'Date: {{created_at}} | Channel: {{channel}}', 'align' => 'center', 'size' => 'sm'],
                    ['type' => 'rule', 'char' => '=', 'width' => 48],
                    ['type' => 'text', 'content' => 'Customer: {{customer_name}} ({{customer_phone}})', 'align' => 'left', 'size' => 'sm'],
                    ['type' => 'rule', 'char' => '-', 'width' => 48],
                    ['type' => 'columns', 'columns' => [
                        ['content' => '[ ] QTY', 'align' => 'left'],
                        ['content' => 'ITEM & SKU', 'align' => 'left'],
                    ]],
                    ['type' => 'rule', 'char' => '-', 'width' => 48],
                    ['type' => 'text', 'content' => "{{#line_items}}[ ] {{qty}}x  {{name}} ({{sku}})\n{{/line_items}}"],
                    ['type' => 'rule', 'char' => '=', 'width' => 48],
                    ['type' => 'text', 'content' => 'Picker Signature: __________________', 'align' => 'left', 'size' => 'sm'],
                    ['type' => 'feed', 'lines' => 2],
                    ['type' => 'cut', 'mode' => 'partial'],
                ],
            ];
        }

        // Default 80mm Standard GST Retail Receipt
        return [
            'paper_width_mm' => 80,
            'blocks' => [
                ['type' => 'text', 'content' => '{{store_name}}', 'align' => 'center', 'size' => 'lg', 'weight' => 'bold'],
                ['type' => 'text', 'content' => '{{store_tagline}}', 'align' => 'center', 'size' => 'sm'],
                ['type' => 'text', 'content' => '{{store_address}}', 'align' => 'center', 'size' => 'sm'],
                ['type' => 'text', 'content' => 'Ph: {{store_phone}}', 'align' => 'center', 'size' => 'sm'],
                ['id' => 'gstin', 'type' => 'text', 'content' => 'GSTIN: {{gstin}} | FSSAI: {{fssai}}', 'align' => 'center', 'size' => 'sm', 'weight' => 'bold'],
                ['type' => 'spacer', 'lines' => 1],
                ['type' => 'text', 'content' => 'TAX INVOICE', 'align' => 'center', 'size' => 'md', 'weight' => 'bold'],
                ['id' => 'invoice_number', 'type' => 'text', 'content' => 'Bill No: {{sale_number}} | Token: #{{token_number}}', 'align' => 'center', 'size' => 'sm'],
                ['type' => 'text', 'content' => 'Date: {{created_at}} | Cashier: {{cashier_name}}', 'align' => 'center', 'size' => 'sm'],
                ['type' => 'text', 'content' => 'Customer: {{customer_name}} ({{customer_phone}})', 'align' => 'center', 'size' => 'sm'],
                ['type' => 'rule', 'char' => '-', 'width' => 48],
                ['type' => 'columns', 'columns' => [
                    ['content' => 'Item & Qty', 'align' => 'left'],
                    ['content' => 'Amount', 'align' => 'right'],
                ]],
                ['type' => 'rule', 'char' => '-', 'width' => 48],
                ['type' => 'text', 'content' => "{{#line_items}}{{qty}}x {{name}} @ {{unit_price}} = {{line_total}}\n{{/line_items}}"],
                ['type' => 'rule', 'char' => '-', 'width' => 48],
                ['type' => 'columns', 'columns' => [
                    ['content' => 'Taxable Subtotal', 'align' => 'left'],
                    ['content' => '{{subtotal}}', 'align' => 'right'],
                ]],
                ['id' => 'tax_table', 'type' => 'columns', 'columns' => [
                    ['content' => 'CGST + SGST (Tax)', 'align' => 'left'],
                    ['content' => '{{tax_total}}', 'align' => 'right'],
                ]],
                ['type' => 'rule', 'char' => '=', 'width' => 48],
                ['type' => 'columns', 'columns' => [
                    ['content' => 'GRAND TOTAL', 'align' => 'left', 'weight' => 'bold'],
                    ['content' => '{{grand_total}}', 'align' => 'right', 'weight' => 'bold'],
                ]],
                ['type' => 'rule', 'char' => '=', 'width' => 48],
                ['type' => 'text', 'content' => 'Paid By: {{payment_method}}', 'align' => 'center', 'size' => 'sm', 'weight' => 'bold'],
                ['type' => 'spacer', 'lines' => 1],
                ['type' => 'qr', 'data' => '{{sale_number}}', 'size' => 6, 'errorCorrection' => 'M'],
                ['type' => 'spacer', 'lines' => 1],
                ['type' => 'text', 'content' => '{{return_policy}}', 'align' => 'center', 'size' => 'sm'],
                ['type' => 'text', 'content' => $footerMsg, 'align' => 'center', 'size' => 'sm', 'weight' => 'bold'],
                ['type' => 'feed', 'lines' => 2],
                ['type' => 'cut', 'mode' => 'partial'],
            ],
        ];
    }

    private function synthesizeDefault(string $kind, string $locale): DocumentTemplate
    {
        $template = new DocumentTemplate();
        $template->id = (string) Str::uuid7();
        $template->tenant_id = null;
        $template->kind = $kind;
        $template->locale = $locale;
        $template->content = $this->getDefaultTemplateContent($kind, $locale);
        $template->version = 1;
        $template->is_locked = true;

        return $template;
    }
}
