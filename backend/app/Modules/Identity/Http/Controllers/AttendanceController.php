<?php

namespace App\Modules\Identity\Http\Controllers;

use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AttendanceController
{
    public function index(Request $request): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $query = DB::table('attendance_punches')
            ->join('users', 'users.id', '=', 'attendance_punches.user_id')
            ->where('attendance_punches.tenant_id', $tenantId)
            ->where('attendance_punches.punched_in_at', '>=', now()->startOfDay())
            ->orderByDesc('attendance_punches.punched_in_at');
        if (! $this->isOwner($request->user()->id, $tenantId)) {
            $query->where('attendance_punches.user_id', $request->user()->id);
        }
        $rows = $query->get([
            'attendance_punches.id',
            'users.name',
            'attendance_punches.punched_in_at',
            'attendance_punches.punched_out_at',
        ]);

        return ApiResponse::ok($rows);
    }

    public function in(Request $request): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $open = $this->openPunch($request->user()->id, $tenantId);
        if ($open) {
            return ApiResponse::error('conflict.punched_in', 'You are already punched in.', 409);
        }
        $id = (string) Str::uuid7();
        DB::table('attendance_punches')->insert([
            'id' => $id,
            'tenant_id' => $tenantId,
            'user_id' => $request->user()->id,
            'punched_in_at' => now(),
            'punched_out_at' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return ApiResponse::ok(['id' => $id, 'punched_in_at' => now()->toIso8601String()], 201);
    }

    public function out(Request $request): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $open = $this->openPunch($request->user()->id, $tenantId);
        if (! $open) {
            return ApiResponse::error('conflict.punched_out', 'You are not punched in.', 409);
        }
        DB::table('attendance_punches')->where('id', $open->id)->update([
            'punched_out_at' => now(),
            'updated_at' => now(),
        ]);

        return ApiResponse::ok(['id' => $open->id, 'punched_out_at' => now()->toIso8601String()]);
    }

    private function openPunch(string $userId, string $tenantId): ?object
    {
        return DB::table('attendance_punches')
            ->where('tenant_id', $tenantId)
            ->where('user_id', $userId)
            ->whereNull('punched_out_at')
            ->first();
    }

    private function isOwner(string $userId, string $tenantId): bool
    {
        return DB::table('model_has_roles')
            ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
            ->where('model_has_roles.model_id', $userId)
            ->where('model_has_roles.tenant_id', $tenantId)
            ->where('roles.name', 'owner')
            ->exists();
    }
}
