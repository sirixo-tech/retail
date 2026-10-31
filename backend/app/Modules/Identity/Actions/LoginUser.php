<?php

namespace App\Modules\Identity\Actions;

use App\Modules\Identity\Http\Controllers\StaffController;
use App\Modules\Identity\Models\User;
use App\Modules\Identity\Support\Totp;
use App\Modules\Tenancy\Models\Store;
use App\Support\ApiResponse;
use App\Support\PlatformConfig;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class LoginUser
{
    public function platform(string $email, string $password, string $ip): JsonResponse
    {
        if (! PlatformConfig::authMethods()['email_password']) {
            return ApiResponse::error('auth.method_disabled', 'Email sign-in is turned off by the platform.', 403);
        }

        return $this->attempt($email, $password, $ip, 'platform', null);
    }

    public function staff(
        string $email,
        string $password,
        string $ip,
        ?string $slug = null,
        ?string $storeId = null,
        ?string $branchId = null,
        ?string $terminalId = null,
        ?string $terminalPin = null
    ): JsonResponse {
        if (! PlatformConfig::authMethods()['email_password']) {
            return ApiResponse::error('auth.method_disabled', 'Email sign-in is turned off by the platform.', 403);
        }

        return $this->attempt($email, $password, $ip, 'staff', $slug, $storeId, $branchId, $terminalId, $terminalPin);
    }

    public function loginVerified(
        User $user,
        string $ip,
        ?string $slug = null,
        ?string $storeId = null,
        ?string $branchId = null,
        ?string $terminalId = null,
        ?string $terminalPin = null
    ): JsonResponse {
        if ($user->status !== 'active') {
            return ApiResponse::error('auth.disabled', 'This account is not active.', 403);
        }

        return $this->establish($user, $ip, (string) $user->kind, $slug, $storeId, $branchId, $terminalId, $terminalPin);
    }

    private function attempt(
        string $email,
        string $password,
        string $ip,
        string $kind,
        ?string $slug,
        ?string $storeId = null,
        ?string $branchId = null,
        ?string $terminalId = null,
        ?string $terminalPin = null
    ): JsonResponse {
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

        if (! $user || ! $passwordOk) {
            $altKind = $kind === 'staff' ? 'platform' : 'staff';
            $altUser = User::query()->where('email', $email)->where('kind', $altKind)->first();
            if ($altUser && $altUser->password && Hash::check($password, $altUser->password)) {
                return $this->attempt($email, $password, $ip, $altKind, $slug, $storeId, $branchId, $terminalId, $terminalPin);
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

        return $this->establish($user, $ip, $kind, $slug, $storeId, $branchId, $terminalId, $terminalPin);
    }

    private function establish(
        User $user,
        string $ip,
        string $kind,
        ?string $slug,
        ?string $storeId = null,
        ?string $branchId = null,
        ?string $terminalId = null,
        ?string $terminalPin = null
    ): JsonResponse {
        $email = (string) $user->email;

        if ($kind === 'staff') {
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
            $selectedStoreId = null;

            // 1. Check explicit branch_id first
            if ($branchId) {
                $branchRow = DB::table('stores')
                    ->where(fn ($q) => $q->where('id', $branchId)->orWhere('code', strtoupper($branchId)))
                    ->whereIn('tenant_id', $profiles->pluck('tenant_id'))
                    ->first();
                if ($branchRow) {
                    $selectedTenantId = $branchRow->tenant_id;
                    $selectedStoreId = $branchRow->id;
                }
            }

            // 2. Check store_id (can be either a branch UUID in `stores` OR a tenant UUID in `tenants`)
            if (! $selectedTenantId && $storeId) {
                $store = DB::table('stores')->where('id', $storeId)->first();
                if ($store && $profiles->contains('tenant_id', $store->tenant_id)) {
                    $selectedTenantId = $store->tenant_id;
                    $selectedStoreId = $store->id;
                } elseif ($profiles->contains('tenant_id', $storeId)) {
                    $selectedTenantId = $storeId;
                }
            }

            // 3. Fallback to slug if provided
            if (! $selectedTenantId && $slug) {
                $matchedProfile = $profiles->firstWhere('tenant_slug', strtolower($slug));
                if ($matchedProfile) {
                    $selectedTenantId = $matchedProfile->tenant_id;
                } else {
                    $st = DB::table('stores')
                        ->where('public_slug', strtolower($slug))
                        ->whereIn('tenant_id', $profiles->pluck('tenant_id'))
                        ->first();
                    if ($st) {
                        $selectedTenantId = $st->tenant_id;
                        $selectedStoreId = $st->id;
                    }
                }
            }

            $stores = DB::table('stores')
                ->whereIn('tenant_id', $profiles->pluck('tenant_id'))
                ->whereNull('deleted_at')
                ->where('status', 'active')
                ->orderByDesc('is_default')
                ->orderBy('name')
                ->get(['id', 'tenant_id', 'name', 'code', 'public_slug', 'city', 'address_line', 'is_default']);

            if ($selectedTenantId && ! $selectedStoreId) {
                $tenantBranches = $stores->where('tenant_id', $selectedTenantId)->values();
                $defaultBranch = $tenantBranches->firstWhere('is_default', 1) ?? $tenantBranches->first();
                $selectedStoreId = $defaultBranch?->id;
            }

            $explicitBranchChosen = (bool) ($branchId || ($storeId && DB::table('stores')->where('id', $storeId)->exists()));

            if (! $selectedTenantId) {
                if ($stores->count() === 1) {
                    $first = $stores->first();
                    $selectedTenantId = $first->tenant_id;
                    $selectedStoreId = $first->id;
                } else {
                    $defaultBranch = $stores->firstWhere('is_default', 1) ?? $stores->first();
                    $selectedTenantId = $defaultBranch->tenant_id;
                    $selectedStoreId = $defaultBranch->id;
                }
            }

            if (! $selectedTenantId) {
                return ApiResponse::error('auth.invalid_credentials', 'Those details do not match.', 401);
            }

            $selectedTerminalId = null;
            if ($terminalId && $selectedStoreId) {
                $counter = DB::table('counters')
                    ->where('store_id', $selectedStoreId)
                    ->where(fn ($q) => $q->where('id', $terminalId)->orWhere('code', strtoupper($terminalId)))
                    ->first();
                if (! $counter) {
                    return ApiResponse::error('resource.not_found', 'Terminal not found for this branch.', 404);
                }
                if (! empty($counter->pin_hash)) {
                    if (! $terminalPin || ! Hash::check($terminalPin, (string) $counter->pin_hash)) {
                        return ApiResponse::error('auth.invalid_pin', 'Valid terminal PIN required for this device.', 401);
                    }
                }
                $selectedTerminalId = $counter->id;
            }

            session([
                'tenant_id' => $selectedTenantId,
                'active_store_id' => $selectedStoreId,
                'active_terminal_id' => $selectedTerminalId,
            ]);

            if (! $explicitBranchChosen && $stores->count() > 1 && ! $user->two_factor_confirmed_at) {
                Auth::login($user);
                session()->regenerate();
                DB::table('login_attempts')->insert([
                    'email' => $email,
                    'ip' => $ip,
                    'succeeded' => true,
                    'created_at' => now(),
                ]);

                $profileData = $this->profile($user);

                return ApiResponse::ok(array_merge($profileData, [
                    'require_branch_selection' => true,
                    'branches' => $profileData['branches'],
                    'profile' => $profileData,
                ]));
            }
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

    public function switchStore(string $branchOrStoreId, ?string $terminalId = null, ?string $pin = null): JsonResponse
    {
        /** @var User|null $user */
        $user = Auth::user();

        $store = DB::table('stores')->where('id', $branchOrStoreId)->first();
        if (! $store) {
            $store = DB::table('stores')
                ->where('tenant_id', $branchOrStoreId)
                ->orderByDesc('is_default')
                ->first();
        }
        if (! $store) {
            return ApiResponse::error('resource.not_found', 'Branch not found.', 404);
        }

        if ($user?->kind !== 'platform') {
            $allowedTenants = DB::table('staff_profiles')->where('user_id', $user?->id)->pluck('tenant_id');
            $tenantId = session('tenant_id');
            if ($store->tenant_id !== $tenantId && ! $allowedTenants->contains($store->tenant_id)) {
                return ApiResponse::error('auth.forbidden', 'Branch does not belong to this store account.', 403);
            }
        }

        $selectedTerminalId = null;
        if ($terminalId) {
            $counter = DB::table('counters')
                ->where('store_id', $store->id)
                ->where(fn ($q) => $q->where('id', $terminalId)->orWhere('code', strtoupper($terminalId)))
                ->first();
            if (! $counter) {
                return ApiResponse::error('resource.not_found', 'Terminal not found on this branch.', 404);
            }
            if (! empty($counter->pin_hash) && (! $pin || ! Hash::check($pin, (string) $counter->pin_hash))) {
                return ApiResponse::error('auth.invalid_pin', 'That terminal PIN is not valid.', 401);
            }
            $selectedTerminalId = $counter->id;
        }

        session([
            'tenant_id' => $store->tenant_id,
            'active_store_id' => $store->id,
            'active_terminal_id' => $selectedTerminalId,
        ]);

        return ApiResponse::ok($this->profile($user));
    }

    public function selectTerminal(string $terminalId, ?string $pin = null): JsonResponse
    {
        /** @var User|null $user */
        $user = Auth::user();
        $tenantId = session('tenant_id');

        $query = DB::table('counters')->where(fn ($q) => $q->where('id', $terminalId)->orWhere('code', strtoupper($terminalId)));
        if ($tenantId && $user?->kind !== 'platform') {
            $query->where('tenant_id', $tenantId);
        }
        $counter = $query->first();
        if (! $counter) {
            return ApiResponse::error('resource.not_found', 'Terminal not found.', 404);
        }

        if (! empty($counter->pin_hash)) {
            if (! $pin || ! Hash::check($pin, (string) $counter->pin_hash)) {
                return ApiResponse::error('auth.invalid_pin', 'That terminal PIN is not valid.', 401);
            }
        }

        session([
            'tenant_id' => $counter->tenant_id,
            'active_store_id' => $counter->store_id,
            'active_terminal_id' => $counter->id,
        ]);

        return ApiResponse::ok($this->profile($user));
    }

    /**
     * @return array<string, mixed>
     */
    public function profile(User $user): array
    {
        $tenantId = session('tenant_id');
        $activeStoreId = session('active_store_id');
        $activeTerminalId = session('active_terminal_id');

        if (! $tenantId && $user->kind === 'platform') {
            $firstTenant = DB::table('tenants')->whereNull('deleted_at')->where('status', '!=', 'suspended')->first();
            if ($firstTenant) {
                $tenantId = $firstTenant->id;
                session(['tenant_id' => $tenantId]);
            }
        }

        $tenant = null;
        if ($tenantId) {
            $tenant = DB::table('tenants')->where('id', $tenantId)->first();
        }

        $store = null;
        if ($tenantId) {
            if ($activeStoreId) {
                $store = DB::table('stores')->where('id', $activeStoreId)->where('tenant_id', $tenantId)->first();
            }
            if (! $store) {
                $store = DB::table('stores')->where('tenant_id', $tenantId)->where('is_default', true)->first()
                    ?? DB::table('stores')->where('tenant_id', $tenantId)->first();
            }
        }

        if (! $store && $user->kind === 'platform') {
            $store = DB::table('stores')->whereNull('deleted_at')->where('status', 'active')->first();
            if ($store) {
                $tenantId = $store->tenant_id;
                $activeStoreId = $store->id;
                session(['tenant_id' => $tenantId, 'active_store_id' => $activeStoreId]);
                $tenant = DB::table('tenants')->where('id', $tenantId)->first();
            }
        }

        $storeRowsQuery = DB::table('stores')
            ->whereNull('deleted_at')
            ->where('status', 'active')
            ->orderByDesc('is_default')
            ->orderBy('name');

        if ($tenantId && $user->kind !== 'platform') {
            $storeRowsQuery->where('tenant_id', $tenantId);
        }

        $storeRows = $storeRowsQuery->get(['id', 'tenant_id', 'name', 'code', 'public_slug', 'city', 'address_line', 'is_default']);
        $countersByStore = DB::table('counters')
            ->whereIn('store_id', $storeRows->pluck('id'))
            ->orderBy('code')
            ->get()
            ->groupBy('store_id');

        $allStores = $storeRows->map(function ($s) use ($countersByStore) {
            $branchTerminals = ($countersByStore->get($s->id) ?? collect())->map(fn ($c) => [
                'id' => $c->id,
                'terminal_id' => $c->id,
                'branch_id' => $s->id,
                'store_id' => $s->tenant_id,
                'name' => $c->name,
                'code' => $c->code,
                'kind' => $c->kind ?? 'pos',
                'status' => $c->status,
                'is_paired' => ! empty($c->paired_at),
                'has_pin' => ! empty($c->pin_hash),
            ])->values()->all();

            return [
                'id' => $s->id,
                'branch_id' => $s->id,
                'store_id' => $s->tenant_id,
                'name' => $s->name,
                'code' => $s->code,
                'public_slug' => $s->public_slug,
                'city' => $s->city,
                'address' => $s->address_line,
                'is_default' => (bool) $s->is_default,
                'terminals' => $branchTerminals,
            ];
        })->all();

        $activeBranchTerminals = [];
        $currentTerminal = null;
        if ($store) {
            $branchMatch = collect($allStores)->firstWhere('id', $store->id);
            $activeBranchTerminals = $branchMatch['terminals'] ?? [];
            if ($activeTerminalId) {
                $currentTerminal = collect($activeBranchTerminals)->firstWhere('id', $activeTerminalId);
            }
            if (! $currentTerminal && count($activeBranchTerminals) > 0) {
                $currentTerminal = collect($activeBranchTerminals)->firstWhere('kind', 'pos') ?? $activeBranchTerminals[0];
            }
        }

        $role = null;
        $hasPosPin = false;
        if ($tenantId) {
            $role = DB::table('model_has_roles')
                ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
                ->where('model_has_roles.model_id', $user->id)
                ->where('model_has_roles.tenant_id', $tenantId)
                ->value('roles.name');

            if (! $role && $user->kind === 'tenant') {
                $role = 'owner';
            }

            $staffPin = DB::table('staff_profiles')
                ->where('user_id', $user->id)
                ->where('tenant_id', $tenantId)
                ->value('pin_hash');
            $hasPosPin = ! empty($staffPin);
        }

        $effectiveRole = $role ?? ($user->kind === 'platform' ? 'platform' : ($user->kind === 'tenant' ? 'owner' : 'cashier'));

        if ($user->kind === 'platform' || $effectiveRole === 'platform' || $effectiveRole === 'owner') {
            $permissions = [
                '*',
                'pos.sell', 'pos.discount', 'pos.returns', 'pos.void', 'pos.shift', 'pos.access', 'pos.refund', 'pos.open_close_shift', 'pos.cash_movement',
                'catalog.view', 'catalog.manage', 'products.manage', 'products.view', 'products.create', 'products.edit', 'products.delete', 'products.import_export', 'products.price_override',
                'inventory.view', 'inventory.adjust', 'inventory.manage', 'inventory.adjust_stock', 'inventory.stock_count', 'inventory.transfers',
                'purchases.manage', 'purchases.view', 'purchases.create_grn', 'purchases.returns', 'purchases.pay_supplier',
                'orders.manage', 'orders.delivery', 'orders.view', 'orders.manage_status', 'orders.assign_delivery',
                'storefront.manage', 'kiosk.manage', 'kiosk.validate_qr',
                'customers.view', 'customers.khata', 'customers.edit', 'customers.manage_khata', 'customers.manage_loyalty',
                'staff.manage', 'staff.view', 'staff.roles_permissions', 'staff.attendance',
                'reports.view', 'reports.sales', 'reports.inventory', 'reports.profit_loss', 'reports.tax_gst', 'reports.export',
                'settings.manage', 'settings.store', 'settings.gateways', 'settings.printer', 'settings.billing',
            ];
        } else {
            // Retrieve tenant-configured role permissions if customized
            $configuredPerms = null;
            if ($store && is_array($store->settings['role_permissions'] ?? null)) {
                $configuredPerms = $store->settings['role_permissions'][$effectiveRole] ?? null;
            }
            if (! $configuredPerms && $tenantId) {
                $defaultStore = Store::query()->where('tenant_id', $tenantId)->orderByDesc('is_default')->first();
                if ($defaultStore && is_array($defaultStore->settings['role_permissions'] ?? null)) {
                    $configuredPerms = $defaultStore->settings['role_permissions'][$effectiveRole] ?? null;
                }
            }

            if (is_array($configuredPerms) && ! empty($configuredPerms)) {
                $rawPerms = $configuredPerms;
            } else {
                $rawPerms = StaffController::DEFAULT_ROLE_PERMISSIONS[$effectiveRole] ?? [
                    'pos.sell', 'pos.access', 'catalog.view', 'products.view', 'orders.manage', 'orders.view', 'customers.view',
                ];
            }
            if ($effectiveRole === 'delivery') {
                foreach (['orders.delivery', 'delivery.dashboard', 'delivery.chat', 'delivery.settings'] as $extra) {
                    $rawPerms[] = $extra;
                }
            }

            // Expand reciprocal aliases for frontend and backend compatibility
            $expanded = [];
            foreach ($rawPerms as $perm) {
                $expanded[] = $perm;
                if ($perm === 'pos.sell' || $perm === 'pos.access') {
                    $expanded[] = 'pos.sell';
                    $expanded[] = 'pos.access';
                }
                if ($perm === 'catalog.view' || $perm === 'products.view') {
                    $expanded[] = 'catalog.view';
                    $expanded[] = 'products.view';
                }
                if ($perm === 'catalog.manage' || $perm === 'products.manage') {
                    $expanded[] = 'catalog.manage';
                    $expanded[] = 'products.manage';
                    $expanded[] = 'products.create';
                    $expanded[] = 'products.edit';
                }
                if ($perm === 'inventory.adjust' || $perm === 'inventory.manage') {
                    $expanded[] = 'inventory.adjust';
                    $expanded[] = 'inventory.manage';
                    $expanded[] = 'inventory.adjust_stock';
                }
                if ($perm === 'purchases.manage' || $perm === 'purchases.view') {
                    $expanded[] = 'purchases.manage';
                    $expanded[] = 'purchases.view';
                    $expanded[] = 'purchases.create_grn';
                }
                if ($perm === 'orders.manage' || $perm === 'orders.view') {
                    $expanded[] = 'orders.manage';
                    $expanded[] = 'orders.view';
                    $expanded[] = 'orders.manage_status';
                }
                if ($perm === 'reports.view' || $perm === 'reports.sales') {
                    $expanded[] = 'reports.view';
                    $expanded[] = 'reports.sales';
                }
                if ($perm === 'settings.manage' || $perm === 'settings.store') {
                    $expanded[] = 'settings.manage';
                    $expanded[] = 'settings.store';
                }
            }
            $permissions = array_values(array_unique($expanded));
        }

        $planFeatures = [];
        if ($tenantId) {
            $sub = DB::table('subscriptions')->where('tenant_id', $tenantId)->first();
            if ($sub) {
                $planFeatures = DB::table('plan_features')
                    ->join('features', 'features.id', '=', 'plan_features.feature_id')
                    ->where('plan_features.plan_id', $sub->plan_id)
                    ->pluck('plan_features.value', 'features.key')
                    ->map(fn ($v) => (int) $v)
                    ->all();
            }
            $overrides = DB::table('tenant_feature_overrides')
                ->join('features', 'features.id', '=', 'tenant_feature_overrides.feature_id')
                ->where('tenant_feature_overrides.tenant_id', $tenantId)
                ->pluck('tenant_feature_overrides.value', 'features.key')
                ->map(fn ($v) => (int) $v)
                ->all();
            $planFeatures = array_merge($planFeatures, $overrides);
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
            'is_super_admin' => $user->kind === 'platform',
            'token' => session()->getId(),
            'session_id' => session()->getId(),
            'token_type' => 'Bearer',
            'abilities' => ['*'],
            'store_id' => $tenant?->id,
            'branch_id' => $store?->id,
            'terminal_id' => $currentTerminal['id'] ?? null,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone_e164,
                'kind' => $user->kind,
                'role' => $role,
                'has_pos_pin' => $hasPosPin,
                'must_change_password' => (bool) $user->must_change_password,
            ],
            'impersonation' => session('impersonator_id') ? [
                'impersonator_id' => session('impersonator_id'),
                'tenant_name' => $tenant->name ?? null,
            ] : null,
            'tenant' => $tenant ? [
                'id' => $tenant->id,
                'store_id' => $tenant->id,
                'name' => $tenant->name,
                'slug' => $tenant->slug,
                'status' => $tenant->status,
                'kind' => $tenant->kind ?? 'single_store',
            ] : null,
            'current_store' => $tenant ? [
                'id' => $tenant->id,
                'store_id' => $tenant->id,
                'name' => $tenant->name,
                'slug' => $tenant->slug,
                'status' => $tenant->status,
                'kind' => $tenant->kind ?? 'single_store',
            ] : null,
            'store' => $store ? [
                'id' => $store->id,
                'branch_id' => $store->id,
                'store_id' => $store->tenant_id,
                'name' => $store->name,
                'code' => $store->code,
                'slug' => $store->public_slug ?? ($tenant->slug ?? null),
                'city' => $store->city,
                'address' => $store->address_line,
                'is_default' => (bool) $store->is_default,
            ] : null,
            'current_branch' => $store ? [
                'id' => $store->id,
                'branch_id' => $store->id,
                'store_id' => $store->tenant_id,
                'name' => $store->name,
                'code' => $store->code,
                'slug' => $store->public_slug ?? ($tenant->slug ?? null),
                'city' => $store->city,
                'address' => $store->address_line,
                'is_default' => (bool) $store->is_default,
            ] : null,
            'current_terminal' => $currentTerminal,
            'stores' => $allStores,
            'allStores' => $allStores,
            'branches' => $allStores,
            'terminals' => $activeBranchTerminals,
            'permissions' => $permissions,
            'plan_features' => $planFeatures,
        ];
    }
}
