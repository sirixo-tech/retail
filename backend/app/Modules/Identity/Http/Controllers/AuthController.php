<?php

namespace App\Modules\Identity\Http\Controllers;

use App\Modules\Identity\Actions\LoginUser;
use App\Modules\Identity\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

class AuthController
{
    public function __construct(private LoginUser $login)
    {
    }

    public function registerTenant(Request $request): JsonResponse
    {
        $data = $request->validate([
            'business_name' => ['required', 'string', 'max:160'],
            'owner_name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:180'],
            'password' => ['required', 'string', 'min:8'],
            'phone' => ['nullable', 'string', 'max:20'],
            'slug' => ['nullable', 'string', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', 'max:40'],
            'store_type' => ['nullable', 'string', 'max:60'],
        ]);

        $businessName = trim($data['business_name']);
        $slug = ! empty($data['slug'])
            ? strtolower(trim($data['slug']))
            : Str::slug($businessName);

        if (empty($slug)) {
            $slug = 'store-'.strtolower(Str::random(6));
        }

        // Deduplicate slug if exists
        $baseSlug = $slug;
        $counter = 1;
        while (\App\Modules\Tenancy\Models\Tenant::query()->where('slug', $slug)->exists() || DB::table('reserved_slugs')->where('slug', $slug)->exists()) {
            $slug = $baseSlug.'-'.(++$counter);
        }

        // Select default starter or first public plan
        $starterPlan = \App\Modules\Plans\Models\Plan::query()->where('code', 'starter')->orWhere('is_public', true)->first();
        $planCode = $starterPlan ? $starterPlan->code : 'starter';

        /** @var \App\Modules\Tenancy\Actions\CreateTenant $createTenant */
        $createTenant = app(\App\Modules\Tenancy\Actions\CreateTenant::class);

        $tenant = $createTenant->handle([
            'owner_name' => $data['owner_name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'business_name' => $businessName,
            'legal_name' => $businessName,
            'phone' => $data['phone'] ?? null,
            'slug' => $slug,
            'kind' => 'single_store',
            'plan_code' => $planCode,
            'cycle' => 'monthly',
        ], (string) Str::uuid());

        // Automatically log the newly registered user in so they have an active session
        $ownerProfile = \App\Modules\Identity\Models\StaffProfile::query()
            ->where('tenant_id', $tenant->id)
            ->with('user')
            ->first();

        if ($ownerProfile && $ownerProfile->user) {
            Auth::login($ownerProfile->user);
            $request->session()->regenerate();
            $request->session()->put('tenant_id', $tenant->id);
            $primaryStore = $tenant->stores()->first();
            if ($primaryStore) {
                $request->session()->put('store_id', $primaryStore->id);
            }
        }

        return ApiResponse::ok([
            'tenant' => [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'slug' => $tenant->slug,
                'email' => $tenant->email,
            ],
            'message' => 'Workspace created successfully! Welcome to your SelfX retail store.',
        ], 201);
    }

    public function platformLogin(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        return $this->login->platform($data['email'], $data['password'], (string) $request->ip());
    }

    public function staffLogin(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'slug' => ['nullable', 'string'],
            'store_id' => ['nullable', 'string'],
        ]);

        return $this->login->staff(
            $data['email'],
            $data['password'],
            (string) $request->ip(),
            ! empty($data['slug']) ? strtolower($data['slug']) : null,
            $data['store_id'] ?? null
        );
    }

    public function switchStore(Request $request): JsonResponse
    {
        $data = $request->validate([
            'store_id' => ['required', 'string'],
        ]);

        return $this->login->switchStore($data['store_id']);
    }

    public function challenge(Request $request): JsonResponse
    {
        $data = $request->validate(['code' => ['required', 'digits:6']]);

        return $this->login->challenge($data['code']);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return ApiResponse::ok(['ok' => true]);
    }

    public function me(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return ApiResponse::ok($this->login->profile($user));
    }

    public function changePassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);

        /** @var User $user */
        $user = $request->user();
        $user->update([
            'password' => $data['password'],
            'must_change_password' => false,
        ]);

        return ApiResponse::ok($this->login->profile($user->fresh()));
    }

    public function updatePassword(Request $request): JsonResponse
    {
        if ($request->session()->get('impersonator_id')) {
            return ApiResponse::error('impersonation.denied', 'Password changes are blocked while viewing a store.', 403);
        }
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8'],
        ]);

        /** @var User $user */
        $user = $request->user();
        if (! Hash::check($data['current_password'], (string) $user->password)) {
            return ApiResponse::error('validation.failed', 'The current password is wrong.', 422, [
                'current_password' => ['The current password is wrong.'],
            ]);
        }

        $user->update([
            'password' => $data['password'],
            'must_change_password' => false,
        ]);

        return ApiResponse::ok($this->login->profile($user->fresh()));
    }
}
