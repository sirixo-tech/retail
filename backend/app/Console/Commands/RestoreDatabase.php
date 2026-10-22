<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

class RestoreDatabase extends Command
{
    protected $signature = 'db:restore 
                            {file? : Specific path or filename of backup to restore} 
                            {--latest : Automatically restore the most recent backup} 
                            {--force : Force restore without interactive confirmation}';

    protected $description = 'Restores the database from a backup snapshot with pre-restore safety snapshots and verification';

    public function handle(): int
    {
        $backupDir = storage_path('app/backups');
        $dbPath = database_path('database.sqlite');

        if (! File::isDirectory($backupDir)) {
            $this->error("Backups directory does not exist at: {$backupDir}");
            return Command::FAILURE;
        }

        $allBackups = collect(File::files($backupDir))
            ->filter(fn ($f) => str_starts_with($f->getFilename(), 'db_backup_') && str_ends_with($f->getFilename(), '.sqlite'))
            ->sortByDesc(fn ($f) => $f->getMTime())
            ->values();

        if ($allBackups->isEmpty()) {
            $this->error("No backup files found in {$backupDir}. Run 'php artisan db:backup' first.");
            return Command::FAILURE;
        }

        $selectedFile = null;
        $argumentFile = $this->argument('file');

        if ($argumentFile) {
            if (File::exists($argumentFile)) {
                $selectedFile = $argumentFile;
            } elseif (File::exists("{$backupDir}/{$argumentFile}")) {
                $selectedFile = "{$backupDir}/{$argumentFile}";
            } else {
                $this->error("Backup file not found: {$argumentFile}");
                return Command::FAILURE;
            }
        } elseif ($this->option('latest')) {
            $selectedFile = $allBackups->first()->getPathname();
        } else {
            // Interactive Selection
            $choices = [];
            foreach ($allBackups as $index => $file) {
                $size = number_format($file->getSize() / 1024, 2) . ' KB';
                $date = date('Y-m-d H:i:s', $file->getMTime());
                $choices[$file->getFilename()] = "{$file->getFilename()} ({$size}, {$date})";
            }

            $chosenFilename = $this->choice(
                'Select a backup snapshot to restore:',
                array_keys($choices),
                0
            );

            $selectedFile = "{$backupDir}/{$chosenFilename}";
        }

        // Integrity verification
        if (! File::exists($selectedFile) || File::size($selectedFile) < 100) {
            $this->error("Invalid or corrupted backup snapshot: {$selectedFile}");
            return Command::FAILURE;
        }

        // Verify SQLite header magic bytes
        $handle = fopen($selectedFile, 'rb');
        $header = fread($handle, 16);
        fclose($handle);

        if (! str_starts_with($header, 'SQLite format 3')) {
            $this->error("The selected file is not a valid SQLite database format.");
            return Command::FAILURE;
        }

        $fileSizeFormatted = number_format(File::size($selectedFile) / 1024, 2) . ' KB';
        $checksum = hash_file('sha256', $selectedFile);

        $this->warn("About to restore database from:");
        $this->line("  File: {$selectedFile}");
        $this->line("  Size: {$fileSizeFormatted}");
        $this->line("  SHA-256: {$checksum}");

        if (! $this->option('force') && ! $this->confirm('This will overwrite current live database tables. Do you want to proceed?', false)) {
            $this->info("Restore cancelled by user.");
            return Command::SUCCESS;
        }

        // Create safety pre-restore snapshot
        if (File::exists($dbPath)) {
            $safetySnapshot = "{$backupDir}/pre_restore_safety_" . now()->format('Y-m-d_His') . ".sqlite";
            $this->info("Creating safety pre-restore backup at: {$safetySnapshot}");
            try {
                copy($dbPath, $safetySnapshot);
            } catch (\Throwable $e) {
                $this->error("Could not create safety snapshot: " . $e->getMessage());
                return Command::FAILURE;
            }
        }

        // Atomic Restore
        $this->info("Applying backup snapshot to live database...");
        try {
            // Flush WAL checkpoint on current live DB if accessible
            if (File::exists($dbPath)) {
                try {
                    $liveDb = new \PDO("sqlite:{$dbPath}");
                    $liveDb->exec('PRAGMA wal_checkpoint(TRUNCATE);');
                    unset($liveDb);
                } catch (\Throwable $e) {
                    // ignore if locked
                }
            }

            copy($selectedFile, $dbPath);

            // Clean up any stale wal/shm companion files
            @unlink("{$dbPath}-wal");
            @unlink("{$dbPath}-shm");

            // Verify live DB after copy
            $restoredDb = new \PDO("sqlite:{$dbPath}");
            $tableCount = (int) $restoredDb->query("SELECT count(*) FROM sqlite_master WHERE type='table'")->fetchColumn();
            unset($restoredDb);

            $this->info("Database restore completed successfully! ({$tableCount} tables restored)");
            Log::info("Database restored from backup: {$selectedFile}", ['tables' => $tableCount, 'checksum' => $checksum]);

            // Clear cache
            Artisan::call('optimize:clear');
            $this->line("Application cache and views refreshed.");

            return Command::SUCCESS;
        } catch (\Throwable $e) {
            $this->error("Database restore failed: " . $e->getMessage());
            Log::critical("Database restore failed: " . $e->getMessage(), ['exception' => $e]);
            return Command::FAILURE;
        }
    }
}
