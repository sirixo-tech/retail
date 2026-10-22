<?php

namespace App\Modules\Identity\Http\Controllers;

use App\Modules\Identity\Actions\LoginUser;
use App\Modules\Identity\Models\User;
use App\Modules\Tenancy\Models\Tenant;
use App\Support\ApiResponse;
use App\Support\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ImpersonationController
{
    public function __construct(private LoginUser $login)
    {
    }

    public function start(Tenant $tenant): JsonResponse
    {
        if ($tenant->status === 'suspended') {
            return ApiResponse::error('auth.suspended', 'This store is suspended.', 403);
        }
        $ownerId = DB::table('model_has_roles')
            ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
            ->where('model_has_roles.tenant_id', $tenant->id)
            ->where('roles.name', 'owner')
            ->value('model_has_roles.model_id');
        $owner = $ownerId ? User::query()->find($ownerId) : null;
        if (! $owner) {
            return ApiResponse::error('resource.not_found', 'This store has no owner.', 404);
        }
        $token = Str::random(48);
        DB::table('impersonation_tickets')->insert([
            'id' => (string) Str::uuid7(),
            'token_hash' => hash('sha256', $token),
            'tenant_id' => $tenant->id,
            'impersonator_id' => request()->user()->id,
            'user_id' => $owner->id,
            'expires_at' => now()->addMinutes(2),
            'used_at' => null,
            'created_at' => now(),
        ]);
        AuditLog::write($tenant->id, request()->user()->id, 'impersonation.started', $owner->id);

        return ApiResponse::ok([
            'ticket' => $token,
            'tenant' => $tenant->name,
        ]);
    }

    public function accept(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ticket' => ['required', 'string'],
        ]);
        $row = DB::table('impersonation_tickets')
            ->where('token_hash', hash('sha256', $data['ticket']))
            ->whereNull('used_at')
            ->first();
        if (! $row || now()->greaterThan($row->expires_at)) {
            return ApiResponse::error('auth.invalid_code', 'That viewing link has expired.', 401);
        }
        $owner = User::query()->find($row->user_id);
        if (! $owner) {
            return ApiResponse::error('resource.not_found', 'Owner not found.', 404);
        }
        DB::table('impersonation_tickets')->where('id', $row->id)->update(['used_at' => now()]);
        Auth::login($owner);
        $request->session()->regenerate();
        $request->session()->put('tenant_id', $row->tenant_id);
        $request->session()->put('impersonator_id', $row->impersonator_id);

        return ApiResponse::ok($this->login->profile($owner));
    }

    public function stop(Request $request): JsonResponse
    {
        $impersonatorId = $request->session()->get('impersonator_id');
        if (! $impersonatorId) {
            return ApiResponse::error('conflict.transition', 'You are not viewing a store.', 409);
        }
        $admin = User::query()->find($impersonatorId);
        if (! $admin) {
            return ApiResponse::error('resource.not_found', 'The platform account was not found.', 404);
        }
        AuditLog::write((string) $request->session()->get('tenant_id'), $admin->id, 'impersonation.stopped', $request->user()->id);
        Auth::login($admin);
        $request->session()->regenerate();
        $request->session()->forget(['tenant_id', 'impersonator_id']);

        return ApiResponse::ok($this->login->profile($admin));
    }
}
