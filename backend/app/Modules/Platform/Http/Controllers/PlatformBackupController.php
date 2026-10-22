<?php

namespace App\Modules\Platform\Http\Controllers;

use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class PlatformBackupController
{
    public function index(): JsonResponse
    {
        $backupDir = storage_path('app/backups');
        if (! File::isDirectory($backupDir)) {
            File::ensureDirectoryExists($backupDir);
        }

        $files = collect(File::files($backupDir))
            ->filter(fn ($f) => str_starts_with($f->getFilename(), 'db_backup_') && str_ends_with($f->getFilename(), '.sqlite'))
            ->sortByDesc(fn ($f) => $f->getMTime())
            ->values()
            ->map(function ($file) {
                $sizeBytes = $file->getSize();
                return [
                    'filename' => $file->getFilename(),
                    'size_bytes' => $sizeBytes,
                    'size_formatted' => number_format($sizeBytes / 1024, 2) . ' KB',
                    'created_at' => date('c', $file->getMTime()),
                    'checksum' => hash_file('sha256', $file->getPathname()),
                ];
            });

        return ApiResponse::ok([
            'backups' => $files,
            'total_count' => $files->count(),
            'database_driver' => config('database.default'),
            'auto_retention_days' => 30,
        ]);
    }

    public function store(): JsonResponse
    {
        try {
            $exitCode = Artisan::call('db:backup', ['--retention' => 30]);
            $output = Artisan::output();

            if ($exitCode !== 0) {
                return ApiResponse::error('backup.failed', 'Database backup failed: ' . trim($output), 500);
            }

            return ApiResponse::ok([
                'message' => 'Database snapshot created successfully.',
                'output' => trim($output),
            ], 201);
        } catch (\Throwable $e) {
            return ApiResponse::error('backup.failed', $e->getMessage(), 500);
        }
    }

    public function download(string $filename): BinaryFileResponse|JsonResponse
    {
        // Sanitize filename to prevent directory traversal
        $safeName = basename($filename);
        $filePath = storage_path("app/backups/{$safeName}");

        if (! File::exists($filePath) || ! str_ends_with($safeName, '.sqlite')) {
            return ApiResponse::error('resource.not_found', 'Backup snapshot not found.', 404);
        }

        return response()->download($filePath, $safeName, [
            'Content-Type' => 'application/x-sqlite3',
        ]);
    }

    public function restore(Request $request): JsonResponse
    {
        $data = $request->validate([
            'filename' => ['required', 'string'],
        ]);

        $safeName = basename($data['filename']);
        $filePath = storage_path("app/backups/{$safeName}");

        if (! File::exists($filePath)) {
            return ApiResponse::error('resource.not_found', 'Backup snapshot not found.', 404);
        }

        try {
            $exitCode = Artisan::call('db:restore', [
                'file' => $safeName,
                '--force' => true,
            ]);
            $output = Artisan::output();

            if ($exitCode !== 0) {
                return ApiResponse::error('restore.failed', 'Database restore failed: ' . trim($output), 500);
            }

            return ApiResponse::ok([
                'message' => 'Database successfully restored from snapshot.',
                'output' => trim($output),
            ]);
        } catch (\Throwable $e) {
            return ApiResponse::error('restore.failed', $e->getMessage(), 500);
        }
    }
}
