<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AuditLog
{
    public static function write(?string $tenantId, ?string $actorId, string $action, ?string $subjectId = null): void
    {
        DB::table('audit_logs')->insert([
            'id' => (string) Str::uuid7(),
            'tenant_id' => $tenantId,
            'actor_id' => $actorId,
            'action' => $action,
            'subject_id' => $subjectId,
            'created_at' => now(),
        ]);
    }
}
