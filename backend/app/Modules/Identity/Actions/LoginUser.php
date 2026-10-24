<?php

namespace App\Modules\Identity\Actions;

use App\Modules\Identity\Support\Totp;
use App\Modules\Identity\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class LoginUser
{
    public function platform(string $email, string $password, string $ip): JsonResponse
    {
        return $this->attempt($email, $password, $ip, 'platform', null);
    }

    public function staff(string $email, string $password, string $ip, ?string $slug = null, ?string $storeId = null): JsonResponse
    {
        return $this->attempt($email, $password, $ip, 'staff', $slug, $storeId);
    }

    private function attempt(string $email, string $password, string $ip, string $kind, ?string $slug, ?string $storeId = null): JsonResponse
    {
        $failures = DB::table('login_attempts')
            ->where('email', $email)
            ->where('succeeded', false)
            ->where('created_at', '>=', now()->subHour())
            ->count();

        if ($failures >= 10) {
            return ApiResponse::error('auth.locked', 'Too many attempts. Try again in an hour.', 423);
        }

        $user = User::query()->where('email', $email)->where('kind', $kind)->first();
        $passwordOk = $user && $user->password && Hash::check($password, $user->password);

        // Smart Cross-Role Login: If credentials don't match requested kind, check the alternative kind
        if (! $user || ! $passwordOk) {
            $altKind = $kind === 'staff' ? 'platform' : 'staff';
            $altUser = User::query()->where('email', $email)->where('kind', $altKind)->first();
            if ($altUser && $altUser->password && Hash::check($password, $altUser->password)) {
                return $this->attempt($email, $password, $ip, $altKind, $slug, $storeId);
            }
        }

        if (! $passwordOk || ! $user) {
            DB::table('login_attempts')->insert([
                'email' => $email,
                'ip' => $ip,
                'succeeded' => false,
                'created_at' => now(),
            ]);

            return ApiResponse::error('auth.invalid_credentials', 'Those details do not match.', 401);
        }

        if ($user->status !== 'active') {
            return ApiResponse::error('auth.disabled', 'This account is not active.', 403);
        }

        if ($kind === 'staff') {
            // Find all tenant profiles for this user
            $profiles = DB::table('staff_profiles')
                ->join('tenants', 'tenants.id', '=', 'staff_profiles.tenant_id')
                ->where('staff_profiles.user_id', $user->id)
                ->whereNull('tenants.deleted_at')
                ->where('tenants.status', '!=', 'suspended')
                ->select([
                    'staff_profiles.tenant_id',
                    'tenants.name as tenant_name',
                    'tenants.slug as tenant_slug',
                    'tenants.kind as tenant_kind',
                ])
                ->get();

            if ($profiles->isEmpty()) {
                return ApiResponse::error('auth.invalid_credentials', 'No active store associated with this account.', 401);
            }

            $selectedTenantId = null;
            $selectedStoreId = $storeId;

            if ($storeId) {
                $store = DB::table('stores')->where('id', $storeId)->first();
                if ($store && $profiles->contains('tenant_id', $store->tenant_id)) {
                    $selectedTenantId = $store->tenant_id;
                    $selectedStoreId = $store->id;
                }
            }

            if (! $selectedTenantId && $slug) {
                $matchedProfile = $profiles->firstWhere('tenant_slug', strtolower($slug));
                if ($matchedProfile) {
                    $selectedTenantId = $matchedProfile->tenant_id;
                } else {
                    // Check if slug matches a store public_slug
                    $st = DB::table('stores')->where('public_slug', strtolower($slug))->whereIn('tenant_id', $profiles->pluck('tenant_id'))->first();
                    if ($st) {
                        $selectedTenantId = $st->tenant_id;
                        $selectedStoreId = $st->id;
                    }
                }
            }

            // Get all branches across these tenants
            $stores = DB::table('stores')
                ->whereIn('tenant_id', $profiles->pluck('tenant_id'))
                ->whereNull('deleted_at')
                ->where('status', 'active')
                ->orderByDesc('is_default')
                ->orderBy('name')
                ->get(['id', 'tenant_id', 'name', 'code', 'public_slug', 'city', 'address_line', 'is_default']);

            // If neither slug nor storeId provided:
            if (! $selectedTenantId) {
                if ($stores->count() === 1) {
                    $first = $stores->first();
                    $selectedTenantId = $first->tenant_id;
                    $selectedStoreId = $first->id;
                } else {
                    // Multiple branches exist! If not specified, set default but return branches list so client can present branch selector
                    $defaultBranch = $stores->firstWhere('is_default', 1) ?? $stores->first();
                    $selectedTenantId = $defaultBranch->tenant_id;
                    $selectedStoreId = $defaultBranch->id;

                    session([
                        'tenant_id' => $selectedTenantId,
                        'active_store_id' => $selectedStoreId,
                    ]);

                    Auth::login($user);
                    session()->regenerate();
                    DB::table('login_attempts')->insert([
                        'email' => $email,
                        'ip' => $ip,
                        'succeeded' => true,
                        'created_at' => now(),
                    ]);

                    return ApiResponse::ok([
                        'require_branch_selection' => true,
                        'branches' => $stores->map(fn ($s) => [
                            'id' => $s->id,
                            'name' => $s->name,
                            'code' => $s->code,
                            'public_slug' => $s->public_slug,
                            'city' => $s->city,
                            'address' => $s->address_line,
                            'is_default' => (bool) $s->is_default,
                        ]),
                        'profile' => $this->profile($user),
                    ]);
                }
            }

            if (! $selectedTenantId) {
                return ApiResponse::error('auth.invalid_credentials', 'Those details do not match.', 401);
            }

            session([
                'tenant_id' => $selectedTenantId,
                'active_store_id' => $selectedStoreId,
            ]);
        }

        if ($kind === 'platform' && ! session('tenant_id')) {
            $firstTenant = DB::table('tenants')->whereNull('deleted_at')->where('status', '!=', 'suspended')->first();
            if ($firstTenant) {
                $firstStore = DB::table('stores')->where('tenant_id', $firstTenant->id)->where('is_default', true)->first()
                    ?? DB::table('stores')->where('tenant_id', $firstTenant->id)->first();
                session([
                    'tenant_id' => $firstTenant->id,
                    'active_store_id' => $firstStore?->id,
                ]);
            }
        }

        if ($user->two_factor_confirmed_at) {
            session(['two_factor.pending_user_id' => $user->id]);

            return ApiResponse::ok(['two_factor' => true]);
        }

        Auth::login($user);
        session()->regenerate();
        DB::table('login_attempts')->insert([
            'email' => $email,
            'ip' => $ip,
            'succeeded' => true,
            'created_at' => now(),
        ]);

        return ApiResponse::ok($this->profile($user));
    }

    public function challenge(string $code): JsonResponse
    {
        $userId = session('two_factor.pending_user_id');
        $user = $userId ? User::query()->find($userId) : null;
        if (! $user || ! $user->two_factor_secret || ! Totp::verify($user->two_factor_secret, $code)) {
            return ApiResponse::error('auth.invalid_code', 'That code is not valid.', 401);
        }

        session()->forget('two_factor.pending_user_id');
        Auth::login($user);
        session()->regenerate();

        return ApiResponse::ok($this->profile($user));
    }

    public function switchStore(string $storeId): JsonResponse
    {
        $tenantId = session('tenant_id');
        if (! $tenantId) {
            return ApiResponse::error('auth.unauthorized', 'Not authenticated.', 401);
        }

        $store = DB::table('stores')->where('id', $storeId)->where('tenant_id', $tenantId)->first();
        if (! $store) {
            return ApiResponse::error('resource.not_found', 'Branch not found.', 404);
        }

        session(['active_store_id' => $storeId]);

        /** @var User $user */
        $user = Auth::user();

        return ApiResponse::ok($this->profile($user));
    }

    /**
     * @return array<string, mixed>
     */
    public function profile(User $user): array
    {
        $tenant = null;
        $tenantId = session('tenant_id');
        if ($tenantId) {
            $tenant = DB::table('tenants')->where('id', $tenantId)->first();
        }

        $store = null;
        $activeStoreId = session('active_store_id');
        if ($tenantId) {
            if ($activeStoreId) {
                $store = DB::table('stores')->where('id', $activeStoreId)->where('tenant_id', $tenantId)->first();
            }
            if (! $store) {
                $store = DB::table('stores')->where('tenant_id', $tenantId)->where('is_default', true)->first()
                    ?? DB::table('stores')->where('tenant_id', $tenantId)->first();
            }
        }

        $allStores = [];
        if ($tenantId) {
            $allStores = DB::table('stores')
                ->where('tenant_id', $tenantId)
                ->whereNull('deleted_at')
                ->where('status', 'active')
                ->orderByDesc('is_default')
                ->orderBy('name')
                ->get(['id', 'name', 'code', 'public_slug', 'city', 'address_line', 'is_default'])
                ->map(fn ($s) => [
                    'id' => $s->id,
                    'name' => $s->name,
                    'code' => $s->code,
                    'public_slug' => $s->public_slug,
                    'city' => $s->city,
                    'address' => $s->address_line,
                    'is_default' => (bool) $s->is_default,
                ])
                ->all();
        }

        $role = null;
        if ($tenantId) {
            $role = DB::table('model_has_roles')
                ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
                ->where('model_has_roles.model_id', $user->id)
                ->where('model_has_roles.tenant_id', $tenantId)
                ->value('roles.name');
        }

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'kind' => $user->kind,
            'must_change_password' => $user->must_change_password,
            'locale' => $user->locale,
            'theme' => $user->theme,
            'role' => $role,
            'impersonation' => session('impersonator_id') ? [
                'impersonator_id' => session('impersonator_id'),
                'tenant_name' => $tenant->name ?? null,
            ] : null,
            'tenant' => $tenant ? [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'slug' => $tenant->slug,
                'status' => $tenant->status,
                'kind' => $tenant->kind ?? 'single_store',
            ] : null,
            'store' => $store ? [
                'id' => $store->id,
                'name' => $store->name,
                'code' => $store->code,
                'slug' => $store->public_slug ?? ($tenant->slug ?? null),
                'city' => $store->city,
                'address' => $store->address_line,
                'is_default' => (bool) $store->is_default,
            ] : null,
            'stores' => $allStores,
            'allStores' => $allStores,
        ];
    }
}
