<?php

namespace App\Modules\Printing\Services;

use App\Modules\Printing\Models\Printer;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Str;

class PrinterRegistry
{
    public function getPrinters(string $tenantId, string $storeId): Collection
    {
        $this->markStalePrintersOffline();

        return Printer::query()
            ->where('tenant_id', $tenantId)
            ->where('store_id', $storeId)
            ->orderBy('name')
            ->get();
    }

    public function listPrinters(string $storeId): Collection
    {
        $this->markStalePrintersOffline();

        return Printer::query()
            ->where('store_id', $storeId)
            ->orderBy('name')
            ->get();
    }

    public function findPrinter(string $id, ?string $tenantId = null): ?Printer
    {
        $query = Printer::query()->where('id', $id);
        if ($tenantId) {
            $query->where('tenant_id', $tenantId);
        }
        return $query->first();
    }

    public function registerPrinter(string|array $tenantIdOrData, ?string $storeId = null, array $data = []): Printer
    {
        if (is_array($tenantIdOrData)) {
            $data = $tenantIdOrData;
            $tenantId = $data['tenant_id'];
            $storeId = $data['store_id'];
        } else {
            $tenantId = $tenantIdOrData;
        }

        return Printer::create([
            'id' => (string) Str::uuid7(),
            'tenant_id' => $tenantId,
            'store_id' => $storeId,
            'name' => $data['name'],
            'transport' => $data['transport'] ?? 'agent',
            'driver' => $data['driver'] ?? 'escpos',
            'connection_params' => $data['connection_params'] ?? [],
            'device_token' => $data['device_token'] ?? null,
            'status' => in_array($data['transport'] ?? 'agent', ['browser_raw', 'browser_dialog']) ? 'online' : 'offline',
            'last_heartbeat_at' => null,
        ]);
    }

    public function updatePrinter(Printer|string $printer, array $data): Printer
    {
        $printerModel = $printer instanceof Printer ? $printer : Printer::query()->findOrFail($printer);

        $printerModel->fill(array_filter([
            'name' => $data['name'] ?? null,
            'transport' => $data['transport'] ?? null,
            'driver' => $data['driver'] ?? null,
            'connection_params' => $data['connection_params'] ?? null,
            'device_token' => $data['device_token'] ?? null,
            'status' => $data['status'] ?? null,
        ], fn ($val) => $val !== null));

        $printerModel->save();
        return $printerModel;
    }

    public function deletePrinter(Printer|string $printer): bool
    {
        if (is_string($printer)) {
            $printer = Printer::query()->find($printer);
        }

        return $printer ? (bool) $printer->delete() : false;
    }

    public function recordHeartbeat(string $printerIdOrToken, string|array $statusOrPrinters): mixed
    {
        if (is_string($statusOrPrinters)) {
            $printer = Printer::query()->find($printerIdOrToken);
            if ($printer) {
                $printer->update([
                    'status' => $statusOrPrinters,
                    'last_heartbeat_at' => now(),
                    'updated_at' => now(),
                ]);
            }
            return $printer;
        }

        $updated = 0;
        foreach ($statusOrPrinters as $item) {
            $printerId = $item['printer_id'] ?? null;
            $status = $item['status'] ?? 'online';

            if ($printerId) {
                $query = Printer::query()->where('id', $printerId);
                if ($printerIdOrToken) {
                    $query->where('device_token', $printerIdOrToken);
                }
                $cnt = $query->update([
                    'status' => $status,
                    'last_heartbeat_at' => now(),
                    'updated_at' => now(),
                ]);
                $updated += $cnt;
            }
        }
        return $updated;
    }

    public function markStalePrintersOffline(): int
    {
        // 45 seconds offline threshold per requirement 26.4
        return Printer::query()
            ->where('status', '!=', 'offline')
            ->where(function ($q) {
                $q->whereNull('last_heartbeat_at')
                  ->orWhere('last_heartbeat_at', '<', now()->subSeconds(45));
            })
            ->update([
                'status' => 'offline',
                'updated_at' => now(),
            ]);
    }
}
