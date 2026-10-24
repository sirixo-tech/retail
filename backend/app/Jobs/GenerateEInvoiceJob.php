<?php

namespace App\Jobs;

use App\Modules\Pos\Models\Sale;
use App\Services\EInvoiceService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class GenerateEInvoiceJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    /**
     * @var array<int, int>
     */
    public array $backoff = [60, 300, 900];

    public function __construct(public string $saleId)
    {
    }

    public function handle(EInvoiceService $service): void
    {
        $sale = Sale::withoutTenancy()->find($this->saleId);
        if (! $sale) {
            return;
        }

        try {
            $result = $service->generateEInvoice($sale);
            Log::info('E-Invoice processed', ['sale_id' => $sale->id, 'result' => $result]);
        } catch (\Throwable $e) {
            Log::error('E-Invoice generation failed: ' . $e->getMessage(), [
                'sale_id' => $sale->id,
            ]);

            DB::table('e_invoices')->updateOrInsert(
                ['sale_id' => $sale->id],
                [
                    'tenant_id' => $sale->tenant_id,
                    'error_message' => $e->getMessage(),
                    'status' => 'failed',
                    'updated_at' => now(),
                ]
            );

            throw $e;
        }
    }
}
