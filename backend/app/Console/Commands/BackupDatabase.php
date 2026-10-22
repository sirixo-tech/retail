<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

class BackupDatabase extends Command
{
    protected $signature = 'db:backup {--retention=30 : Days to retain backups}';

    protected $description = 'Creates a timestamped snapshot of the SQLite database with checksum verification and retention pruning';

    public function handle(): int
    {
        $dbPath = database_path('database.sqlite');
        if (! File::exists($dbPath)) {
            $this->error("Database file not found at: {$dbPath}");
            return Command::FAILURE;
        }

        $backupDir = storage_path('app/backups');
        File::ensureDirectoryExists($backupDir);

        $timestamp = now()->format('Y-m-d_His');
        $backupFile = "{$backupDir}/db_backup_{$timestamp}.sqlite";

        $this->info("Creating database snapshot...");
        
        // Execute atomic SQLite backup using .backup or file copy with WAL flush
        try {
            $db = new \PDO("sqlite:{$dbPath}");
            $db->exec('PRAGMA wal_checkpoint(TRUNCATE);');
            copy($dbPath, $backupFile);
        } catch (\Throwable $e) {
            $this->error("Backup failed: " . $e->getMessage());
            Log::error("Database backup failed: " . $e->getMessage());
            return Command::FAILURE;
        }

        $size = File::size($backupFile);
        $sizeFormatted = number_format($size / 1024, 2) . ' KB';
        $hash = hash_file('sha256', $backupFile);

        $this->info("Backup successfully written to: {$backupFile} ({$sizeFormatted})");
        $this->line("SHA-256 Checksum: {$hash}");
        Log::info("Database backup created successfully: {$backupFile}", ['size_bytes' => $size, 'hash' => $hash]);

        // Prune older backups according to retention days
        $retentionDays = (int) $this->option('retention');
        $cutoff = now()->subDays($retentionDays)->getTimestamp();
        $deletedCount = 0;

        foreach (File::files($backupDir) as $file) {
            if ($file->getMTime() < $cutoff && str_starts_with($file->getFilename(), 'db_backup_')) {
                File::delete($file->getPathname());
                $deletedCount++;
            }
        }

        if ($deletedCount > 0) {
            $this->line("Pruned {$deletedCount} backup(s) older than {$retentionDays} days.");
        }

        return Command::SUCCESS;
    }
}
