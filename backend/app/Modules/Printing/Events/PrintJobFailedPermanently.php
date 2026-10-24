<?php

namespace App\Modules\Printing\Events;

use App\Modules\Printing\Models\PrintJob;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PrintJobFailedPermanently
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public PrintJob $job,
    ) {}
}
