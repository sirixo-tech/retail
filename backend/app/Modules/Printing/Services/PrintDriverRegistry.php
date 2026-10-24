<?php

namespace App\Modules\Printing\Services;

use App\Modules\Printing\Contracts\PrintDriver;
use App\Modules\Printing\Drivers\EscposDriver;
use App\Modules\Printing\Drivers\SystemDriver;

class PrintDriverRegistry
{
    /**
     * @var array<string, PrintDriver>
     */
    private array $drivers = [];

    public function __construct()
    {
        $this->register(new EscposDriver());
        $this->register(new SystemDriver());
    }

    public function register(PrintDriver $driver): void
    {
        $this->drivers[$driver->getName()] = $driver;
    }

    public function get(string $name): ?PrintDriver
    {
        return $this->drivers[$name] ?? $this->drivers['escpos'] ?? null;
    }

    /**
     * @return array<string, PrintDriver>
     */
    public function all(): array
    {
        return $this->drivers;
    }
}
