<?php

namespace App\Modules\Printing\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SaleCompleted
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $saleId,
        public string $storeId,
        public ?string $tenantId = null,
    ) {}
}
