<?php

namespace App\Modules\Printing\Services;

use App\Modules\Printing\Enums\DocumentKind;
use App\Modules\Printing\Models\PrintProfile;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Str;

class PrintProfileService
{
    public function getProfile(string $storeId, DocumentKind|string $kind): ?PrintProfile
    {
        $kindStr = $kind instanceof DocumentKind ? $kind->value : $kind;

        return PrintProfile::query()
            ->with(['printer', 'template'])
            ->where('store_id', $storeId)
            ->where('document_kind', $kindStr)
            ->first();
    }

    public function getProfilesForStore(string $storeId): Collection
    {
        return PrintProfile::query()
            ->with(['printer', 'template'])
            ->where('store_id', $storeId)
            ->get();
    }

    public function getStoreProfiles(string $storeId): Collection
    {
        return $this->getProfilesForStore($storeId);
    }

    public function saveProfile(string $storeId, DocumentKind|string $kind, array|string $data, ?string $templateId = null, string $driverName = 'escpos', string $cutMode = 'partial', string $openDrawerOn = 'never', string $orientation = 'portrait'): PrintProfile
    {
        $kindStr = $kind instanceof DocumentKind ? $kind->value : $kind;
        if (!is_array($data)) {
            $data = [
                'printer_id' => $data,
                'template_id' => $templateId,
                'driver_name' => $driverName,
                'cut_mode' => $cutMode,
                'open_drawer_on' => $openDrawerOn,
                'orientation' => $orientation,
            ];
        }

        $profile = PrintProfile::query()
            ->where('store_id', $storeId)
            ->where('document_kind', $kindStr)
            ->first();

        if (!$profile) {
            $profile = new PrintProfile();
            $profile->id = (string) Str::uuid7();
            $profile->store_id = $storeId;
            $profile->document_kind = $kindStr;
        }

        $profile->printer_id = $data['printer_id'];
        $profile->template_id = $data['template_id'] ?? null;
        $profile->driver_name = $data['driver_name'] ?? 'escpos';
        $profile->cut_mode = $data['cut_mode'] ?? 'partial';
        $profile->open_drawer_on = $data['open_drawer_on'] ?? 'never';
        $profile->orientation = $data['orientation'] ?? 'portrait';
        $profile->save();

        return $profile->load(['printer', 'template']);
    }
}
