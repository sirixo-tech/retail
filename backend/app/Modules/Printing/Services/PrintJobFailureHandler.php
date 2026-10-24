<?php

namespace App\Modules\Printing\Services;

use App\Modules\Printing\Enums\PrintJobStatus;
use App\Modules\Printing\Events\PrintJobFailedPermanently;
use App\Modules\Printing\Models\PrintJob;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PrintJobFailureHandler
{
    /**
     * Handle print job failure with automatic retry logic.
     */
    public function handleFailure(PrintJob $job, string $failureReason): void
    {
        Log::warning("Print job {$job->id} failed", [
            'job_id' => $job->id,
            'tenant_id' => $job->tenant_id,
            'store_id' => $job->store_id,
            'failure_reason' => $failureReason,
            'attempt' => $job->retry_count ?? 0,
        ]);

        $job->status = PrintJobStatus::FAILED->value;
        $job->failure_reason = $failureReason;
        $job->retry_count = ($job->retry_count ?? 0) + 1;
        $job->save();

        if ($this->shouldRetry($job, $failureReason)) {
            $this->scheduleRetry($job);
        } else {
            $this->notifyFailure($job);
        }
    }

    private function shouldRetry(PrintJob $job, string $failureReason): bool
    {
        // Don't retry after 3 attempts
        if ($job->retry_count >= 3) {
            return false;
        }

        // Only retry transient failures
        $retriableReasons = [
            'printer_offline',
            'paper_out',
            'timeout',
            'print_agent_unreachable',
            'busy',
            'device_busy',
        ];

        return in_array(strtolower($failureReason), $retriableReasons);
    }

    private function scheduleRetry(PrintJob $job): void
    {
        // Exponential backoff: 30s, 2m, 10m
        $delays = [30, 120, 600];
        $delay = $delays[min($job->retry_count - 1, count($delays) - 1)];

        DB::table('print_jobs')
            ->where('id', $job->id)
            ->update([
                'status' => PrintJobStatus::QUEUED->value,
                'updated_at' => now()->addSeconds($delay),
            ]);

        Log::info("Print job {$job->id} scheduled for retry in {$delay}s");
    }

    private function notifyFailure(PrintJob $job): void
    {
        event(new PrintJobFailedPermanently($job));
    }
}
