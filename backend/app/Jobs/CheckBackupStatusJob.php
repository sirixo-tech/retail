<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CheckBackupStatusJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(): void
    {
        $backupDir = env('BACKUP_DIR', '/backups');
        $timestampFile = "{$backupDir}/latest_backup_timestamp.txt";

        $lastBackupTime = null;
        if (file_exists($timestampFile)) {
            $lastBackupTime = (int) trim(file_get_contents($timestampFile));
        }

        $maxAgeSeconds = 26 * 3600; // 26 hours
        $isStale = ! $lastBackupTime || (time() - $lastBackupTime > $maxAgeSeconds);

        if ($isStale) {
            $hoursAgo = $lastBackupTime ? round((time() - $lastBackupTime) / 3600, 1) : 'never';
            $message = "ALERT: Database backup has not completed in {$hoursAgo} hours! Immediate inspection required.";

            Log::critical($message, [
                'backup_dir' => $backupDir,
                'last_timestamp' => $lastBackupTime,
            ]);

            $webhookUrl = env('DEVOPS_SLACK_WEBHOOK_URL');
            if ($webhookUrl) {
                try {
                    Http::post($webhookUrl, [
                        'text' => $message,
                        'severity' => 'critical',
                    ]);
                } catch (\Throwable $e) {
                    Log::error('Failed to notify Slack of backup failure: ' . $e->getMessage());
                }
            }
        } else {
            Log::info('Backup check passed. Last backup completed within SLA.');
        }
    }
}
