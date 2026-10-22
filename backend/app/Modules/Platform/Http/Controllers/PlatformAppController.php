<?php

namespace App\Modules\Platform\Http\Controllers;

use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PlatformAppController
{
    private function defaultApps(): array
    {
        return [
            [
                'id' => (string) Str::uuid(),
                'key' => 'selfx-desktop-pos',
                'name' => 'SelfX Desktop POS Terminal',
                'tag' => 'System',
                'category' => 'Retail POS',
                'description' => 'High-speed Windows & macOS checkout terminal with offline SQLite sync, laser barcode scanner, weighing scale COM port, and thermal receipt printing.',
                'is_active' => true,
                'platforms' => ['windows', 'macos'],
                'download_links' => [],
                'in_app_updates' => [],
                'sort_order' => 1,
                'icon' => 'monitor',
                'color' => '#ea580c',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => (string) Str::uuid(),
                'key' => 'selfx-android-pos',
                'name' => 'SelfX Android Handheld POS',
                'tag' => 'System',
                'category' => 'Mobile Billing',
                'description' => 'Mobile billing and counter companion for Android handheld terminals (Sunmi, PAX, iMin) with camera barcode scanner and thermal printing.',
                'is_active' => true,
                'platforms' => ['android'],
                'download_links' => [],
                'in_app_updates' => [],
                'sort_order' => 2,
                'icon' => 'smartphone',
                'color' => '#10b981',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => (string) Str::uuid(),
                'key' => 'selfx-warehouse-scanner',
                'name' => 'SelfX Warehouse & Stock Scanner',
                'tag' => 'System',
                'category' => 'Inventory & Warehouse',
                'description' => 'Rugged barcode, QR, and batch-expiry handheld scanner for Goods Received Notes (GRN), inter-branch stock transfers, and store counts.',
                'is_active' => true,
                'platforms' => ['android', 'windows'],
                'download_links' => [],
                'in_app_updates' => [],
                'sort_order' => 3,
                'icon' => 'package',
                'color' => '#f59e0b',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => (string) Str::uuid(),
                'key' => 'selfx-store-manager',
                'name' => 'SelfX Store Manager Mobile',
                'tag' => 'System',
                'category' => 'Executive Analytics',
                'description' => 'Real-time executive store dashboard, live register cash counts, low-stock warnings, and staff shift oversight.',
                'is_active' => true,
                'platforms' => ['android'],
                'download_links' => [],
                'in_app_updates' => [],
                'sort_order' => 4,
                'icon' => 'analytics',
                'color' => '#ec4899',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => (string) Str::uuid(),
                'key' => 'selfx-kiosk',
                'name' => 'SelfX Customer Self-Checkout Kiosk',
                'tag' => 'System',
                'category' => 'Self-Checkout',
                'description' => 'Touchscreen retail kiosk enabling customers to scan item barcodes, apply loyalty discounts, and pay via dynamic UPI / card.',
                'is_active' => true,
                'platforms' => ['android', 'windows'],
                'download_links' => [],
                'in_app_updates' => [],
                'sort_order' => 5,
                'icon' => 'tablet',
                'color' => '#6366f1',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];
    }

    public function index(): JsonResponse
    {
        $count = DB::table('platform_apps')->count();
        if ($count === 0) {
            $this->seedDefaults();
        }

        $apps = DB::table('platform_apps')
            ->orderBy('sort_order')
            ->get()
            ->map(function ($row) {
                return [
                    'id' => $row->id,
                    'key' => $row->key,
                    'name' => $row->name,
                    'tag' => $row->tag,
                    'category' => $row->category,
                    'description' => $row->description,
                    'is_active' => (bool) $row->is_active,
                    'platforms' => json_decode($row->platforms ?? '[]', true) ?: [],
                    'download_links' => json_decode($row->download_links ?? '[]', true) ?: [],
                    'in_app_updates' => json_decode($row->in_app_updates ?? '[]', true) ?: [],
                    'sort_order' => (int) $row->sort_order,
                    'icon' => $row->icon ?? 'monitor',
                    'color' => $row->color ?? null,
                    'page_copy' => $row->page_copy,
                    'created_at' => $row->created_at,
                    'updated_at' => $row->updated_at,
                ];
            });

        $pageCopy = DB::table('platform_settings')->value('address'); // or separate field

        return ApiResponse::ok([
            'apps' => $apps,
            'summary' => [
                'total_apps' => $apps->count(),
                'live_links' => $apps->reduce(fn ($acc, $app) => $acc + count($app['download_links']), 0),
                'updates_ready' => $apps->reduce(fn ($acc, $app) => $acc + count($app['in_app_updates']), 0),
            ],
            'page_copy' => [
                'title' => 'Download Companion Apps',
                'description' => 'Download official native apps, desktop bridges, and tablet kiosk installers for your retail store counters.',
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'key' => ['nullable', 'string', 'max:80'],
            'tag' => ['nullable', 'string', 'max:30'],
            'category' => ['nullable', 'string', 'max:60'],
            'description' => ['nullable', 'string', 'max:500'],
            'is_active' => ['nullable', 'boolean'],
            'platforms' => ['nullable', 'array'],
            'download_links' => ['nullable', 'array'],
            'in_app_updates' => ['nullable', 'array'],
            'icon' => ['nullable', 'string', 'max:50'],
            'color' => ['nullable', 'string', 'max:50'],
        ]);

        $id = (string) Str::uuid();
        $baseKey = !empty($data['key']) ? Str::slug($data['key']) : Str::slug($data['name']);
        if (empty($baseKey)) {
            $baseKey = 'app-' . time();
        }
        $key = $baseKey;
        $counter = 1;
        while (DB::table('platform_apps')->where('key', $key)->exists()) {
            $key = $baseKey . '-' . $counter;
            $counter++;
        }

        DB::table('platform_apps')->insert([
            'id' => $id,
            'key' => $key,
            'name' => $data['name'],
            'tag' => $data['tag'] ?? 'Custom',
            'category' => $data['category'] ?? 'app-' . time(),
            'description' => $data['description'] ?? 'Custom retail companion app',
            'is_active' => isset($data['is_active']) ? (bool) $data['is_active'] : true,
            'platforms' => json_encode($data['platforms'] ?? ['android']),
            'download_links' => json_encode($data['download_links'] ?? []),
            'in_app_updates' => json_encode($data['in_app_updates'] ?? []),
            'icon' => $data['icon'] ?? 'monitor',
            'color' => $data['color'] ?? null,
            'sort_order' => (DB::table('platform_apps')->max('sort_order') ?? 0) + 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return ApiResponse::ok(['id' => $id, 'key' => $key], 201);
    }

    public function destroy(string $id): JsonResponse
    {
        DB::table('platform_apps')->where('id', $id)->orWhere('key', $id)->delete();
        return ApiResponse::ok(['deleted' => true]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'name' => ['nullable', 'string', 'max:120'],
            'category' => ['nullable', 'string', 'max:60'],
            'description' => ['nullable', 'string', 'max:500'],
            'is_active' => ['nullable', 'boolean'],
            'platforms' => ['nullable', 'array'],
            'download_links' => ['nullable', 'array'],
            'in_app_updates' => ['nullable', 'array'],
            'sort_order' => ['nullable', 'integer'],
            'icon' => ['nullable', 'string', 'max:50'],
            'color' => ['nullable', 'string', 'max:50'],
        ]);

        $update = ['updated_at' => now()];
        if (isset($data['name'])) $update['name'] = $data['name'];
        if (isset($data['category'])) $update['category'] = $data['category'];
        if (isset($data['description'])) $update['description'] = $data['description'];
        if (isset($data['is_active'])) $update['is_active'] = $data['is_active'];
        if (isset($data['platforms'])) $update['platforms'] = json_encode($data['platforms']);
        if (isset($data['download_links'])) $update['download_links'] = json_encode($data['download_links']);
        if (isset($data['in_app_updates'])) $update['in_app_updates'] = json_encode($data['in_app_updates']);
        if (isset($data['sort_order'])) $update['sort_order'] = $data['sort_order'];
        if (array_key_exists('icon', $data)) $update['icon'] = $data['icon'];
        if (array_key_exists('color', $data)) $update['color'] = $data['color'];

        DB::table('platform_apps')->where('id', $id)->orWhere('key', $id)->update($update);

        return ApiResponse::ok(['updated' => true]);
    }

    public function toggle(Request $request, string $id): JsonResponse
    {
        $app = DB::table('platform_apps')->where('id', $id)->orWhere('key', $id)->first();
        if (!$app) {
            return ApiResponse::error('not_found', 'App not found', 404);
        }

        $nextState = !$app->is_active;
        DB::table('platform_apps')->where('id', $app->id)->update([
            'is_active' => $nextState,
            'updated_at' => now(),
        ]);

        return ApiResponse::ok(['is_active' => $nextState]);
    }

    public function restoreDefaults(): JsonResponse
    {
        DB::table('platform_apps')->truncate();
        $this->seedDefaults();

        return ApiResponse::ok(['restored' => true]);
    }

    private function seedDefaults(): void
    {
        $defaults = $this->defaultApps();
        foreach ($defaults as $app) {
            DB::table('platform_apps')->insert([
                'id' => $app['id'],
                'key' => $app['key'],
                'name' => $app['name'],
                'tag' => $app['tag'],
                'category' => $app['category'],
                'description' => $app['description'],
                'is_active' => $app['is_active'],
                'platforms' => json_encode($app['platforms']),
                'download_links' => json_encode($app['download_links']),
                'in_app_updates' => json_encode($app['in_app_updates']),
                'sort_order' => $app['sort_order'],
                'icon' => $app['icon'] ?? 'monitor',
                'color' => $app['color'] ?? null,
                'created_at' => $app['created_at'],
                'updated_at' => $app['updated_at'],
            ]);
        }
    }

    public function checkUpdate(Request $request): JsonResponse
    {
        $appKey = $request->query('app');
        $platform = strtolower((string) $request->query('platform', 'android'));
        $currentVersion = (string) $request->query('version', '1.0.0');

        $app = DB::table('platform_apps')
            ->where('is_active', true)
            ->where(function ($q) use ($appKey) {
                $q->where('key', $appKey)->orWhere('name', $appKey);
            })
            ->first();

        if (!$app) {
            return ApiResponse::ok(['update_available' => false]);
        }

        $updates = json_decode($app->in_app_updates ?? '[]', true) ?: [];
        $target = null;
        foreach ($updates as $up) {
            if (strtolower($up['platform'] ?? '') === $platform) {
                $target = $up;
                break;
            }
        }

        if (!$target || empty($target['version'])) {
            return ApiResponse::ok(['update_available' => false]);
        }

        $latestVersion = $target['version'];
        $hasUpdate = version_compare($latestVersion, $currentVersion, '>');

        $downloadLinks = json_decode($app->download_links ?? '[]', true) ?: [];
        $downloadUrl = null;
        foreach ($downloadLinks as $dl) {
            if (strtolower($dl['platform'] ?? '') === $platform) {
                $downloadUrl = $dl['url'];
                break;
            }
        }

        return ApiResponse::ok([
            'update_available' => $hasUpdate,
            'current_version' => $currentVersion,
            'latest_version' => $latestVersion,
            'force_update' => (bool) ($target['force'] ?? false),
            'notes' => $target['notes'] ?? '',
            'download_url' => $downloadUrl,
        ]);
    }

    public function uploadInstaller(Request $request, string $id): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'max:512000'],
            'platform' => ['required', 'string'],
        ]);

        $app = DB::table('platform_apps')->where('id', $id)->orWhere('key', $id)->first();
        $appKey = $app ? $app->key : 'app-' . time();
        $platform = Str::slug($request->input('platform', 'general'));

        $file = $request->file('file');
        $originalName = $file->getClientOriginalName();
        $cleanName = preg_replace('/[^a-zA-Z0-9_\.-]/', '-', $originalName);
        $filename = time() . '-' . $cleanName;

        $targetDir = public_path("media/app-downloads/{$appKey}/{$platform}");
        if (!file_exists($targetDir)) {
            mkdir($targetDir, 0755, true);
        }

        $file->move($targetDir, $filename);

        $url = "/media/app-downloads/{$appKey}/{$platform}/{$filename}";
        $sizeBytes = @filesize($targetDir . '/' . $filename);
        $sizeFormatted = $sizeBytes ? round($sizeBytes / 1048576, 1) . ' MB' : 'Installer';

        return ApiResponse::ok([
            'url' => $url,
            'filename' => $filename,
            'size' => $sizeFormatted,
        ]);
    }
}
