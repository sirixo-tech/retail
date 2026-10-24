<?php

namespace App\Modules\Printing\Listeners;

use App\Modules\Printing\Actions\PrintJobCreator;
use App\Modules\Printing\Enums\DocumentKind;
use App\Modules\Printing\Events\SaleCompleted;
use App\Modules\Printing\Services\PrintProfileService;
use App\Support\Tenancy\TenantContext;
use Illuminate\Support\Facades\Log;
use Throwable;

class PrintSaleReceiptListener
{
    public function __construct(
        private PrintJobCreator $creator,
        private PrintProfileService $profileService,
        private TenantContext $tenantContext,
    ) {}

    /**
     * Handle the event.
     */
    public function handle(SaleCompleted $event): void
    {
        try {
            if ($event->tenantId) {
                $this->tenantContext->setTenantId($event->tenantId);
            }

            $profile = $this->profileService->getProfile($event->storeId, DocumentKind::RECEIPT);
            if (!$profile) {
                return;
            }

            $this->creator->createFromSale($event->saleId, $event->storeId);
        } catch (Throwable $e) {
            Log::error('PrintSaleReceiptListener failed: ' . $e->getMessage(), [
                'sale_id' => $event->saleId,
                'store_id' => $event->storeId,
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }
}
