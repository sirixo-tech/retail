<?php

namespace App\Console\Commands;

use App\Modules\Inventory\Actions\ReserveStock;
use Illuminate\Console\Command;

class ReleaseReservations extends Command
{
    protected $signature = 'stock:release-reservations';

    protected $description = 'Release stock reserved for orders past the store hold window';

    public function handle(ReserveStock $stock): int
    {
        $stock->releaseExpired();
        $this->info('Expired reservations released.');

        return self::SUCCESS;
    }
}
