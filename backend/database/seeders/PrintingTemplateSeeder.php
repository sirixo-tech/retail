<?php

namespace Database\Seeders;

use App\Modules\Printing\Enums\DocumentKind;
use App\Modules\Printing\Models\DocumentTemplate;
use App\Modules\Printing\Services\TemplateRepository;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class PrintingTemplateSeeder extends Seeder
{
    public function run(): void
    {
        $repo = app(TemplateRepository::class);

        $templates = [
            ['kind' => DocumentKind::RECEIPT, 'locale' => 'en'],
            ['kind' => DocumentKind::RECEIPT, 'locale' => 'te'],
            ['kind' => DocumentKind::RECEIPT, 'locale' => 'hi'],
            ['kind' => DocumentKind::LABEL, 'locale' => 'en'],
            ['kind' => DocumentKind::INVOICE_PDF, 'locale' => 'en'],
            ['kind' => DocumentKind::PICK_LIST, 'locale' => 'en'],
            ['kind' => DocumentKind::DELIVERY_NOTE, 'locale' => 'en'],
            ['kind' => DocumentKind::REPORT_PDF, 'locale' => 'en'],
        ];

        foreach ($templates as $item) {
            $kind = $item['kind'];
            $locale = $item['locale'];

            $exists = DocumentTemplate::query()
                ->whereNull('tenant_id')
                ->where('kind', $kind->value)
                ->where('locale', $locale)
                ->exists();

            if (!$exists) {
                $content = $repo->getDefaultTemplateContent($kind, $locale);

                DocumentTemplate::create([
                    'id' => (string) Str::uuid7(),
                    'tenant_id' => null,
                    'kind' => $kind->value,
                    'locale' => $locale,
                    'content' => $content,
                    'version' => 1,
                    'is_locked' => true,
                    'created_by' => null,
                ]);
            }
        }
    }
}
