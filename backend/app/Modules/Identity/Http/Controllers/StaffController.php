<?php

namespace App\Modules\Identity\Http\Controllers;

use App\Modules\Identity\Models\StaffProfile;
use App\Modules\Identity\Models\User;
use App\Modules\Plans\Models\PlanFeature;
use App\Modules\Tenancy\Models\Store;
use App\Support\ApiResponse;
use App\Support\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class StaffController
{
    /** @var array<string, list<string>> */
    public const DEFAULT_ROLE_PERMISSIONS = [
        'owner' => [
            '*',
            'pos.sell', 'pos.discount', 'pos.returns', 'pos.void', 'pos.shift', 'pos.access', 'pos.void_bill', 'pos.open_close_shift', 'pos.cash_movement',
            'catalog.view', 'catalog.manage', 'products.view', 'products.create', 'products.edit', 'products.delete', 'products.import_export', 'products.price_override',
            'inventory.view', 'inventory.adjust', 'inventory.adjust_stock', 'inventory.stock_count', 'inventory.transfers',
            'purchases.manage', 'purchases.view', 'purchases.create_grn', 'purchases.returns', 'purchases.pay_supplier',
            'orders.manage', 'orders.delivery', 'orders.view', 'orders.manage_status', 'orders.assign_delivery',
            'storefront.manage',
            'customers.view', 'customers.khata', 'customers.edit', 'customers.manage_khata', 'customers.manage_loyalty',
            'staff.manage', 'staff.view', 'staff.roles_permissions', 'staff.attendance',
            'reports.view', 'reports.sales', 'reports.inventory', 'reports.profit_loss', 'reports.tax_gst', 'reports.export',
            'settings.manage', 'settings.store', 'settings.gateways', 'settings.printer', 'settings.billing',
        ],
        'manager' => [
            'pos.sell', 'pos.discount', 'pos.returns', 'pos.void', 'pos.shift', 'pos.access', 'pos.void_bill', 'pos.open_close_shift', 'pos.cash_movement',
            'catalog.view', 'catalog.manage', 'products.view', 'products.create', 'products.edit', 'products.import_export', 'products.price_override',
            'inventory.view', 'inventory.adjust', 'inventory.adjust_stock', 'inventory.stock_count', 'inventory.transfers',
            'purchases.manage', 'purchases.view', 'purchases.create_grn', 'purchases.returns', 'purchases.pay_supplier',
            'orders.manage', 'orders.delivery', 'orders.view', 'orders.manage_status', 'orders.assign_delivery',
            'customers.view', 'customers.khata', 'customers.edit', 'customers.manage_khata', 'customers.manage_loyalty',
            'staff.manage', 'staff.view', 'staff.attendance',
            'reports.view', 'reports.sales', 'reports.inventory', 'reports.profit_loss', 'reports.tax_gst', 'reports.export',
            'settings.printer',
        ],
        'cashier' => [
            'pos.sell', 'pos.discount', 'pos.shift', 'pos.access', 'pos.open_close_shift', 'pos.cash_movement',
            'catalog.view', 'products.view',
            'orders.manage', 'orders.view', 'orders.manage_status',
            'customers.view', 'customers.khata', 'customers.edit', 'customers.manage_khata', 'customers.manage_loyalty',
            'staff.attendance',
        ],
        'inventory' => [
            'catalog.view', 'catalog.manage', 'products.view', 'products.create', 'products.edit', 'products.import_export',
            'inventory.view', 'inventory.adjust', 'inventory.adjust_stock', 'inventory.stock_count', 'inventory.transfers',
            'purchases.manage', 'purchases.view', 'purchases.create_grn', 'purchases.returns',
            'reports.view', 'reports.inventory',
            'staff.attendance',
        ],
        'delivery' => [
            'orders.manage', 'orders.delivery', 'orders.view', 'orders.manage_status',
            'customers.view',
            'staff.attendance',
        ],
    ];

    public function index(Request $request): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $rows = DB::table('staff_profiles')
            ->join('users', 'users.id', '=', 'staff_profiles.user_id')
            ->leftJoin('model_has_roles', function ($join) use ($tenantId) {
                $join->on('model_has_roles.model_id', '=', 'users.id')->where('model_has_roles.tenant_id', '=', $tenantId);
            })
            ->leftJoin('roles', 'roles.id', '=', 'model_has_roles.role_id')
            ->where('staff_profiles.tenant_id', $tenantId)
            ->orderBy('users.name')
            ->get([
                'users.id',
                'users.name',
                'users.email',
                'users.status',
                'users.created_at',
                'roles.name as role',
                'staff_profiles.pin_hash',
            ])
            ->map(fn ($r) => [
                'id' => $r->id,
                'name' => $r->name,
                'email' => $r->email,
                'status' => $r->status,
                'role' => $r->role ?? 'cashier',
                'has_pin' => ! empty($r->pin_hash),
                'created_at' => $r->created_at,
            ]);

        return ApiResponse::ok($rows);
    }

    public function store(Request $request): JsonResponse
    {
        if ($request->session()->get('impersonator_id')) {
            return ApiResponse::error('impersonation.denied', 'Adding staff is blocked while viewing a store.', 403);
        }
        $tenantId = (string) $request->session()->get('tenant_id');
        if (! $this->canManageStaff($request->user()->id, $tenantId)) {
            return ApiResponse::error('permission.denied', 'You do not have permission to manage store staff.', 403);
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:180'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', 'string', 'max:60'],
        ]);

        $limit = $this->staffLimit($tenantId);
        $count = StaffProfile::query()->where('tenant_id', $tenantId)->count();
        if ($limit >= 0 && $count >= $limit) {
            return ApiResponse::error('entitlement.limit_exceeded', 'The plan has no room for another staff member.', 422, [
                'feature' => 'limit.staff',
                'limit' => $limit,
            ]);
        }

        if (User::query()->where('email', $data['email'])->exists()) {
            return ApiResponse::error('validation.failed', 'That email is already used.', 422);
        }

        $roleName = strtolower(trim($data['role']));
        if ($roleName === 'owner') {
            return ApiResponse::error('validation.failed', 'The owner role cannot be manually assigned to staff.', 422);
        }
        $roleId = DB::table('roles')->where('tenant_id', $tenantId)->where('name', $roleName)->value('id');
        if (! $roleId) {
            if (in_array($roleName, ['manager', 'cashier', 'inventory', 'delivery'], true)) {
                $roleId = (string) Str::uuid7();
                DB::table('roles')->insert([
                    'id' => $roleId,
                    'tenant_id' => $tenantId,
                    'name' => $roleName,
                    'guard_name' => 'web',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            } else {
                return ApiResponse::error('validation.failed', 'That role is not set up for this store.', 422);
            }
        }

        $user = User::query()->create([
            'kind' => 'staff',
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'must_change_password' => true,
            'status' => 'active',
        ]);
        StaffProfile::query()->create([
            'user_id' => $user->id,
            'tenant_id' => $tenantId,
            'display_name' => $data['name'],
            'status' => 'active',
        ]);
        DB::table('model_has_roles')->insert([
            'id' => (string) Str::uuid7(),
            'role_id' => $roleId,
            'model_id' => $user->id,
            'model_type' => User::class,
            'tenant_id' => $tenantId,
            'store_id' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        AuditLog::write($tenantId, $request->user()->id, 'staff.created', $user->id);

        return ApiResponse::ok([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $roleName,
        ], 201);
    }

    public function update(Request $request, string $staff): JsonResponse
    {
        if ($request->session()->get('impersonator_id')) {
            return ApiResponse::error('impersonation.denied', 'Editing staff is blocked while viewing a store.', 403);
        }
        $tenantId = (string) $request->session()->get('tenant_id');
        $profile = StaffProfile::query()->where('tenant_id', $tenantId)->where('user_id', $staff)->first();
        if (! $profile) {
            return ApiResponse::error('resource.not_found', 'Staff member not found.', 404);
        }

        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'email' => ['sometimes', 'required', 'email', 'max:180'],
            'role' => ['sometimes', 'required', 'string', 'max:60'],
            'status' => ['sometimes', 'required', 'in:active,suspended'],
            'password' => ['nullable', 'string', 'min:8'],
        ]);

        $user = User::query()->find($staff);
        if (! $user) {
            return ApiResponse::error('resource.not_found', 'User not found.', 404);
        }

        if (isset($data['name'])) {
            $user->name = $data['name'];
            $profile->display_name = $data['name'];
        }
        if (isset($data['email']) && $data['email'] !== $user->email) {
            if (User::query()->where('email', $data['email'])->where('id', '!=', $user->id)->exists()) {
                return ApiResponse::error('validation.failed', 'That email is already used.', 422);
            }
            $user->email = $data['email'];
        }
        if (isset($data['status'])) {
            $user->status = $data['status'];
            $profile->status = $data['status'];
        }
        if (! empty($data['password'])) {
            $user->password = $data['password'];
        }
        $user->save();
        $profile->save();

        if (isset($data['role'])) {
            $roleName = strtolower(trim($data['role']));
            $roleId = DB::table('roles')->where('tenant_id', $tenantId)->where('name', $roleName)->value('id');
            if ($roleId) {
                DB::table('model_has_roles')
                    ->where('tenant_id', $tenantId)
                    ->where('model_id', $user->id)
                    ->update(['role_id' => $roleId, 'updated_at' => now()]);
            }
        }

        return ApiResponse::ok(['id' => $user->id, 'updated' => true]);
    }

    public function destroy(Request $request, string $staff): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        if ($staff === $request->user()->id) {
            return ApiResponse::error('validation.failed', 'You cannot remove your own account.', 422);
        }
        $deleted = StaffProfile::query()->where('tenant_id', $tenantId)->where('user_id', $staff)->delete();
        if (! $deleted) {
            return ApiResponse::error('resource.not_found', 'Staff member not found.', 404);
        }
        DB::table('model_has_roles')->where('tenant_id', $tenantId)->where('model_id', $staff)->delete();

        return ApiResponse::ok(['id' => $staff, 'deleted' => true]);
    }

    public function roles(Request $request): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $store = Store::query()->where('tenant_id', $tenantId)->orderByDesc('is_default')->first();
        $savedPerms = is_array($store?->settings['role_permissions'] ?? null) ? $store->settings['role_permissions'] : [];
        $savedMeta = is_array($store?->settings['role_meta'] ?? null) ? $store->settings['role_meta'] : [];

        $counts = DB::table('model_has_roles')
            ->where('tenant_id', $tenantId)
            ->selectRaw('role_id, count(*) as total')
            ->groupBy('role_id')
            ->pluck('total', 'role_id');

        $roles = DB::table('roles')
            ->where('tenant_id', $tenantId)
            ->orderBy('created_at')
            ->get()
            ->map(function ($r) use ($savedPerms, $savedMeta, $counts) {
                $name = $r->name;
                $perms = $savedPerms[$name] ?? (self::DEFAULT_ROLE_PERMISSIONS[$name] ?? ['pos.sell', 'pos.access', 'catalog.view', 'products.view', 'orders.manage']);
                $meta = $savedMeta[$name] ?? [];

                return [
                    'id' => $r->id,
                    'code' => $name,
                    'name' => $meta['label'] ?? ucfirst(str_replace('_', ' ', $name)),
                    'label' => $meta['label'] ?? ucfirst(str_replace('_', ' ', $name)),
                    'description' => $meta['description'] ?? $this->defaultRoleDescription($name),
                    'system' => in_array($name, ['owner', 'manager', 'cashier', 'inventory', 'delivery'], true),
                    'is_system' => in_array($name, ['owner', 'manager', 'cashier', 'inventory', 'delivery'], true),
                    'staff_count' => (int) ($counts[$r->id] ?? 0),
                    'permissions' => array_values(array_unique((array) $perms)),
                ];
            });

        return ApiResponse::ok($roles);
    }

    public function storeRole(Request $request): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $data = $request->validate([
            'code' => ['nullable', 'string', 'max:60'],
            'name' => ['required', 'string', 'max:60'],
            'description' => ['nullable', 'string', 'max:200'],
            'permissions' => ['required', 'array'],
        ]);

        $rawCode = ! empty($data['code']) ? $data['code'] : $data['name'];
        $slug = Str::snake(strtolower(trim($rawCode)));
        if (DB::table('roles')->where('tenant_id', $tenantId)->where('name', $slug)->exists()) {
            return ApiResponse::error('conflict.duplicate', 'A role with that name already exists.', 422);
        }

        $id = (string) Str::uuid7();
        DB::table('roles')->insert([
            'id' => $id,
            'tenant_id' => $tenantId,
            'name' => $slug,
            'guard_name' => 'web',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $store = Store::query()->where('tenant_id', $tenantId)->orderByDesc('is_default')->first();
        if ($store) {
            $settings = $store->settings ?? [];
            $settings['role_permissions'][$slug] = array_values($data['permissions']);
            $settings['role_meta'][$slug] = [
                'label' => trim($data['name']),
                'description' => trim((string) ($data['description'] ?? 'Custom store role')),
            ];
            $store->settings = $settings;
            $store->save();
        }

        return ApiResponse::ok(['id' => $id, 'code' => $slug, 'name' => $slug], 201);
    }

    public function updateRole(Request $request, string $role): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $row = DB::table('roles')->where('tenant_id', $tenantId)->where(function ($q) use ($role) {
            $q->where('id', $role)->orWhere('name', $role);
        })->first();

        if (! $row) {
            return ApiResponse::error('resource.not_found', 'Role not found.', 404);
        }

        $data = $request->validate([
            'name' => ['nullable', 'string', 'max:60'],
            'label' => ['nullable', 'string', 'max:60'],
            'description' => ['nullable', 'string', 'max:200'],
            'permissions' => ['required', 'array'],
        ]);

        $label = $data['label'] ?? ($data['name'] ?? null);

        $store = Store::query()->where('tenant_id', $tenantId)->orderByDesc('is_default')->first();
        if ($store) {
            $settings = $store->settings ?? [];
            $settings['role_permissions'][$row->name] = array_values($data['permissions']);
            $existingMeta = $settings['role_meta'][$row->name] ?? [];
            $settings['role_meta'][$row->name] = [
                'label' => $label ?? ($existingMeta['label'] ?? ucfirst($row->name)),
                'description' => $data['description'] ?? ($existingMeta['description'] ?? $this->defaultRoleDescription($row->name)),
            ];
            $store->settings = $settings;
            $store->save();
        }

        return ApiResponse::ok(['id' => $row->id, 'code' => $row->name, 'name' => $row->name, 'updated' => true]);
    }

    public function destroyRole(Request $request, string $role): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $row = DB::table('roles')->where('tenant_id', $tenantId)->where('id', $role)->first();
        if (! $row) {
            return ApiResponse::error('resource.not_found', 'Role not found.', 404);
        }
        if (in_array($row->name, ['owner', 'manager', 'cashier', 'inventory', 'delivery'], true)) {
            return ApiResponse::error('validation.failed', 'Default system roles cannot be deleted.', 422);
        }
        if (DB::table('model_has_roles')->where('role_id', $row->id)->exists()) {
            return ApiResponse::error('conflict.in_use', 'Reassign staff members before deleting this role.', 422);
        }
        DB::table('roles')->where('id', $row->id)->delete();

        return ApiResponse::ok(['id' => $row->id, 'deleted' => true]);
    }

    public function pin(Request $request): JsonResponse
    {
        if ($request->session()->get('impersonator_id')) {
            return ApiResponse::error('impersonation.denied', 'PIN changes are blocked while viewing a store.', 403);
        }
        $data = $request->validate([
            'pin' => ['required', 'regex:/^[0-9]{4,6}$/'],
        ]);
        $updated = DB::table('staff_profiles')
            ->where('user_id', $request->user()->id)
            ->where('tenant_id', $request->session()->get('tenant_id'))
            ->update([
                'pin_hash' => Hash::make($data['pin']),
                'updated_at' => now(),
            ]);
        if (! $updated) {
            return ApiResponse::error('resource.not_found', 'Staff profile not found.', 404);
        }

        return ApiResponse::ok(['saved' => true]);
    }

    // Platform Super Admins Management
    public function platformAdmins(): JsonResponse
    {
        $rows = User::query()
            ->where('kind', 'platform')
            ->orderBy('created_at')
            ->get(['id', 'name', 'email', 'status', 'two_factor_confirmed_at', 'created_at', 'updated_at'])
            ->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'status' => $u->status,
                'two_factor_enabled' => $u->two_factor_confirmed_at !== null,
                'created_at' => $u->created_at,
                'updated_at' => $u->updated_at,
            ]);

        return ApiResponse::ok($rows);
    }

    public function storePlatformAdmin(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:180'],
            'password' => ['required', 'string', 'min:8'],
            'status' => ['nullable', 'in:active,suspended'],
        ]);

        if (User::query()->where('email', $data['email'])->exists()) {
            return ApiResponse::error('validation.failed', 'That email address is already registered.', 422);
        }

        $admin = User::query()->create([
            'kind' => 'platform',
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'must_change_password' => false,
            'status' => $data['status'] ?? 'active',
        ]);

        return ApiResponse::ok([
            'id' => $admin->id,
            'name' => $admin->name,
            'email' => $admin->email,
            'status' => $admin->status,
        ], 201);
    }

    public function updatePlatformAdmin(Request $request, string $adminId): JsonResponse
    {
        $admin = User::query()->where('kind', 'platform')->find($adminId);
        if (! $admin) {
            return ApiResponse::error('resource.not_found', 'Super Admin not found.', 404);
        }

        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'email' => ['sometimes', 'required', 'email', 'max:180'],
            'password' => ['nullable', 'string', 'min:8'],
            'status' => ['sometimes', 'required', 'in:active,suspended'],
        ]);

        if (isset($data['email']) && $data['email'] !== $admin->email) {
            if (User::query()->where('email', $data['email'])->where('id', '!=', $admin->id)->exists()) {
                return ApiResponse::error('validation.failed', 'That email address is already registered.', 422);
            }
            $admin->email = $data['email'];
        }
        if (isset($data['name'])) {
            $admin->name = $data['name'];
        }
        if (isset($data['status'])) {
            $admin->status = $data['status'];
        }
        if (! empty($data['password'])) {
            $admin->password = $data['password'];
            $admin->must_change_password = false;
        }
        $admin->save();

        return ApiResponse::ok(['id' => $admin->id, 'updated' => true]);
    }

    public function destroyPlatformAdmin(Request $request, string $adminId): JsonResponse
    {
        if ($request->user()?->id === $adminId) {
            return ApiResponse::error('validation.failed', 'You cannot delete your own active Super Admin account.', 422);
        }
        $count = User::query()->where('kind', 'platform')->count();
        if ($count <= 1) {
            return ApiResponse::error('validation.failed', 'At least one Super Admin account must remain active.', 422);
        }
        User::query()->where('kind', 'platform')->where('id', $adminId)->delete();

        return ApiResponse::ok(['id' => $adminId, 'deleted' => true]);
    }

    private function defaultRoleDescription(string $name): string
    {
        return match ($name) {
            'owner' => 'Full administrative access to all store modules, billing, staff, and security settings.',
            'manager' => 'Store operations manager with POS, catalog, inventory, purchases, orders, and reports access.',
            'cashier' => 'Counter billing specialist with POS terminal, shift register, customer lookup, and order pickup.',
            'inventory' => 'Stock & warehouse controller with product catalog, GRN purchases, stock counts, and transfers.',
            'delivery' => 'Fulfilment & rider coordinator with online order pick-list, dispatch, and delivery OTP handover.',
            default => 'Custom store role with tailored module permissions.',
        };
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

    private function canManageStaff(string $userId, string $tenantId): bool
    {
        if ($this->isOwner($userId, $tenantId)) {
            return true;
        }

        $role = DB::table('model_has_roles')
            ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
            ->where('model_has_roles.model_id', $userId)
            ->where('model_has_roles.tenant_id', $tenantId)
            ->value('roles.name');

        if (! $role) {
            return false;
        }

        $store = Store::query()->where('tenant_id', $tenantId)->orderByDesc('is_default')->first();
        $perms = $store?->settings['role_permissions'][$role] ?? (self::DEFAULT_ROLE_PERMISSIONS[$role] ?? []);

        return in_array('staff.manage', (array) $perms, true) || in_array('*', (array) $perms, true);
    }

    private function staffLimit(string $tenantId): int
    {
        return app(\App\Modules\Plans\Support\Entitlement::class)->value($tenantId, 'limit.staff');
    }
}
