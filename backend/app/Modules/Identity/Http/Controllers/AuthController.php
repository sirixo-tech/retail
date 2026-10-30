<?php

namespace App\Modules\Identity\Http\Controllers;

use App\Modules\Identity\Actions\LoginUser;
use App\Modules\Identity\Models\User;
use App\Modules\Notifications\SmsGateway;
use App\Support\ApiResponse;
use App\Support\PhoneNumber;
use App\Support\PlatformConfig;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\RateLimiter;
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
            'otp' => ['nullable', 'string', 'max:20'],
            'firebase_id_token' => ['nullable', 'string', 'max:4000'],
            'slug' => ['nullable', 'string', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', 'max:40'],
            'store_type' => ['nullable', 'string', 'max:60'],
        ]);

        if (! empty($data['firebase_id_token'])) {
            $firebase = app(SmsGateway::class)->publicFirebase();
            if (! empty($firebase['active'])) {
                $lookup = Http::timeout(12)->post(
                    'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key='.urlencode((string) $firebase['api_key']),
                    ['idToken' => $data['firebase_id_token']],
                );
                $verifiedPhone = PhoneNumber::digits((string) $lookup->json('users.0.phoneNumber'));
                if ($lookup->successful() && strlen($verifiedPhone) === 10) {
                    $data['phone'] = $verifiedPhone;
                } else {
                    return ApiResponse::error('auth.invalid_code', 'That Firebase sign-in could not be verified.', 422);
                }
            }
        } elseif (! empty($data['otp'])) {
            $phone = PhoneNumber::digits((string) ($data['phone'] ?? ''));
            $row = DB::table('phone_otps')
                ->where('phone', $phone)
                ->where('purpose', 'register')
                ->where('expires_at', '>', now())
                ->orderByDesc('created_at')
                ->first();

            if ($row && $row->verified_at) {
                $data['phone'] = $phone;
            } elseif ($row && ! $row->verified_at) {
                $expected = hash_hmac('sha256', (string) $data['otp'], (string) config('app.key'));
                if (! hash_equals((string) $row->code_hash, $expected)) {
                    return ApiResponse::error('auth.invalid_code', 'That mobile code is not valid.', 422);
                }
                DB::table('phone_otps')->where('id', $row->id)->update(['verified_at' => now()]);
                $data['phone'] = $phone;
            } else {
                return ApiResponse::error('auth.invalid_code', 'That mobile code is not valid.', 422);
            }
        }

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

        $primaryStore = $tenant->stores()->first();
        $primaryCounter = $primaryStore
            ? DB::table('counters')->where('store_id', $primaryStore->id)->orderBy('code')->first()
            : null;

        if ($ownerProfile && $ownerProfile->user) {
            Auth::login($ownerProfile->user);
            $request->session()->regenerate();
            $request->session()->put('tenant_id', $tenant->id);
            if ($primaryStore) {
                $request->session()->put('store_id', $primaryStore->id);
                $request->session()->put('active_store_id', $primaryStore->id);
            }
            if ($primaryCounter) {
                $request->session()->put('active_terminal_id', $primaryCounter->id);
            }
        }

        $profile = ($ownerProfile && $ownerProfile->user) ? $this->login->profile($ownerProfile->user) : [];

        // Centralized Notification Mailer: New Tenant Welcome & Platform Company Alert
        try {
            $mailer = app(\App\Modules\Notifications\PlatformMailer::class);
            $consoleUrl = 'https://retail.sirixo.com/login';
            $adminTenantUrl = 'https://retail.sirixo.com/tenants';

            // Welcome email to newly onboarded merchant
            if (! empty($data['email'])) {
                $mailer->sendTemplate(
                    'tenant_welcome',
                    $data['email'],
                    [
                        'owner_name' => $data['owner_name'],
                        'owner_email' => $data['email'],
                        'tenant_name' => $businessName,
                        'console_url' => $consoleUrl,
                        'platform_name' => 'SelfX Retail Cloud',
                        'action_label' => 'Open Retail Console',
                        'action_url' => $consoleUrl,
                    ],
                    $tenant->id,
                    $tenant->id
                );
            }

            // Company alert to Platform Headquarters
            $companyEmail = $mailer->getCompanyNotificationEmail();
            if ($companyEmail) {
                $mailer->sendTemplate(
                    'company_merchant_registered',
                    $companyEmail,
                    [
                        'tenant_name' => $businessName,
                        'owner_name' => $data['owner_name'],
                        'owner_email' => $data['email'],
                        'owner_phone' => $data['phone'] ?? 'N/A',
                        'plan_name' => ucfirst($planCode),
                        'registered_at' => now()->format('d M Y, h:i A'),
                        'admin_tenant_url' => $adminTenantUrl,
                        'action_label' => 'View in Super Admin',
                        'action_url' => $adminTenantUrl,
                    ],
                    $tenant->id,
                    $tenant->id
                );
            }
        } catch (\Throwable) {
            // Non-blocking notification dispatch
        }

        return ApiResponse::ok(array_merge($profile, [
            'store_id' => $tenant->id,
            'branch_id' => $primaryStore?->id,
            'terminal_id' => $primaryCounter?->id,
            'tenant' => [
                'id' => $tenant->id,
                'store_id' => $tenant->id,
                'name' => $tenant->name,
                'slug' => $tenant->slug,
                'email' => $tenant->email,
            ],
            'branch' => $primaryStore ? [
                'id' => $primaryStore->id,
                'branch_id' => $primaryStore->id,
                'store_id' => $tenant->id,
                'name' => $primaryStore->name,
                'code' => $primaryStore->code,
            ] : null,
            'message' => 'Workspace created successfully! Welcome to your SelfX retail store.',
        ]), 201);
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
            'branch_id' => ['nullable', 'string'],
            'terminal_id' => ['nullable', 'string'],
            'terminal_pin' => ['nullable', 'digits_between:4,6'],
        ]);

        return $this->login->staff(
            $data['email'],
            $data['password'],
            (string) $request->ip(),
            ! empty($data['slug']) ? strtolower($data['slug']) : null,
            $data['store_id'] ?? null,
            $data['branch_id'] ?? null,
            $data['terminal_id'] ?? null,
            $data['terminal_pin'] ?? null,
        );
    }

    public function switchStore(Request $request): JsonResponse
    {
        $data = $request->validate([
            'store_id' => ['nullable', 'string'],
            'branch_id' => ['nullable', 'string'],
            'terminal_id' => ['nullable', 'string'],
            'pin' => ['nullable', 'digits_between:4,6'],
        ]);

        $targetId = $data['branch_id'] ?? $data['store_id'] ?? null;
        if (! $targetId) {
            return ApiResponse::error('validation.failed', 'Select a branch.', 422);
        }

        return $this->login->switchStore($targetId, $data['terminal_id'] ?? null, $data['pin'] ?? null);
    }

    public function selectTerminal(Request $request): JsonResponse
    {
        $data = $request->validate([
            'terminal_id' => ['nullable', 'string'],
            'counter_id' => ['nullable', 'string'],
            'pin' => ['nullable', 'digits_between:4,6'],
        ]);

        $terminalId = $data['terminal_id'] ?? $data['counter_id'] ?? null;
        if (! $terminalId) {
            return ApiResponse::error('validation.failed', 'Select a terminal.', 422);
        }

        return $this->login->selectTerminal($terminalId, $data['pin'] ?? null);
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

    public function methods(): JsonResponse
    {
        $methods = PlatformConfig::authMethods();

        return ApiResponse::ok([
            'email_password' => $methods['email_password'],
            'phone_otp' => $methods['phone_otp'],
            'firebase' => app(SmsGateway::class)->publicFirebase(),
        ]);
    }

    public function maps(): JsonResponse
    {
        return ApiResponse::ok(['api_key' => PlatformConfig::mapsKey()]);
    }

    public function requestPhoneOtp(Request $request): JsonResponse
    {
        if (! PlatformConfig::authMethods()['phone_otp']) {
            return ApiResponse::error('auth.method_disabled', 'Mobile sign-in is turned off by the platform.', 403);
        }
        $data = $request->validate([
            'phone' => ['required', 'string', 'max:20'],
            'purpose' => ['required', 'in:staff,platform,register,customer'],
            'slug' => ['nullable', 'string', 'max:80'],
        ]);
        $phone = PhoneNumber::digits($data['phone']);
        if (strlen($phone) !== 10) {
            return ApiResponse::error('validation.failed', 'Enter a 10-digit mobile number.', 422);
        }
        if (RateLimiter::tooManyAttempts('phone-otp:'.$phone, 5)) {
            return ApiResponse::error('auth.locked', 'Too many codes were requested. Wait a few minutes.', 423);
        }
        RateLimiter::hit('phone-otp:'.$phone, 600);

        $user = $this->userByPhone($phone, $data['purpose']);
        if (in_array($data['purpose'], ['staff', 'platform'], true) && ! $user) {
            return ApiResponse::error('auth.invalid_credentials', 'No account uses that mobile number.', 404);
        }

        $gateway = app(SmsGateway::class);
        $active = $gateway->active();
        if ($active && $active['key'] === 'firebase' && $gateway->credentialsReady('firebase', $active['config'])) {
            return ApiResponse::ok([
                'status' => 'firebase',
                'firebase' => $gateway->publicFirebase(),
            ]);
        }

        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        DB::table('phone_otps')->insert([
            'id' => (string) Str::uuid7(),
            'phone' => $phone,
            'purpose' => $data['purpose'],
            'tenant_id' => $user ? $this->tenantIdFor($user) : null,
            'code_hash' => hash_hmac('sha256', $code, (string) config('app.key')),
            'attempts' => 0,
            'expires_at' => now()->addMinutes(10),
            'created_at' => now(),
        ]);
        $sent = $gateway->send($phone, 'Your SelfX sign-in code is '.$code.'. It expires in 10 minutes.');
        $payload = ['status' => $sent['status']];
        if (app()->environment('local', 'testing') && in_array($sent['status'], ['not_configured', 'logged'], true)) {
            $payload['code'] = $code;
        }
        if ($sent['status'] === 'failed') {
            return ApiResponse::error('sms.failed', $sent['detail'], 502);
        }

        return ApiResponse::ok($payload);
    }

    public function verifyPhoneOtp(Request $request): JsonResponse
    {
        if (! PlatformConfig::authMethods()['phone_otp']) {
            return ApiResponse::error('auth.method_disabled', 'Mobile sign-in is turned off by the platform.', 403);
        }
        $data = $request->validate([
            'phone' => ['required', 'string', 'max:20'],
            'code' => ['required', 'digits:6'],
            'purpose' => ['required', 'in:staff,platform,register,customer'],
            'slug' => ['nullable', 'string', 'max:80'],
            'store_id' => ['nullable', 'string'],
            'branch_id' => ['nullable', 'string'],
            'terminal_id' => ['nullable', 'string'],
            'terminal_pin' => ['nullable', 'digits_between:4,6'],
        ]);
        $phone = PhoneNumber::digits($data['phone']);
        $row = $this->latestOtp($phone, $data['purpose']);
        if (! $row || ! $this->otpMatches($row, $data['code'])) {
            return ApiResponse::error('auth.invalid_code', 'That code is not valid.', 422);
        }
        DB::table('phone_otps')->where('id', $row->id)->update(['verified_at' => now()]);
        if ($data['purpose'] === 'register' || $data['purpose'] === 'customer') {
            return ApiResponse::ok(['verified' => true]);
        }
        $user = $this->userByPhone($phone, $data['purpose']);
        if (! $user) {
            return ApiResponse::error('auth.invalid_credentials', 'No account uses that mobile number.', 404);
        }

        return $this->login->loginVerified(
            $user,
            (string) $request->ip(),
            $data['slug'] ?? null,
            $data['store_id'] ?? null,
            $data['branch_id'] ?? null,
            $data['terminal_id'] ?? null,
            $data['terminal_pin'] ?? null,
        );
    }

    public function firebasePhone(Request $request): JsonResponse
    {
        if (! PlatformConfig::authMethods()['phone_otp']) {
            return ApiResponse::error('auth.method_disabled', 'Mobile sign-in is turned off by the platform.', 403);
        }
        $data = $request->validate([
            'id_token' => ['required', 'string', 'max:4000'],
            'purpose' => ['required', 'in:staff,platform,register,customer'],
            'slug' => ['nullable', 'string', 'max:80'],
            'store_id' => ['nullable', 'string'],
            'branch_id' => ['nullable', 'string'],
            'terminal_id' => ['nullable', 'string'],
            'terminal_pin' => ['nullable', 'digits_between:4,6'],
        ]);
        $firebase = app(SmsGateway::class)->publicFirebase();
        if (empty($firebase['active'])) {
            return ApiResponse::error('sms.not_configured', 'Firebase Phone Auth is not the active provider.', 422);
        }
        $lookup = Http::timeout(12)->post(
            'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key='.urlencode((string) $firebase['api_key']),
            ['idToken' => $data['id_token']],
        );
        $phone = PhoneNumber::digits((string) $lookup->json('users.0.phoneNumber'));
        if (! $lookup->successful() || strlen($phone) !== 10) {
            return ApiResponse::error('auth.invalid_code', 'That Firebase sign-in could not be checked.', 401);
        }
        if ($data['purpose'] === 'register' || $data['purpose'] === 'customer') {
            DB::table('phone_otps')->insert([
                'id' => (string) Str::uuid7(),
                'phone' => $phone,
                'purpose' => $data['purpose'],
                'tenant_id' => null,
                'code_hash' => hash_hmac('sha256', 'firebase_verified', (string) config('app.key')),
                'attempts' => 0,
                'verified_at' => now(),
                'expires_at' => now()->addMinutes(30),
                'created_at' => now(),
            ]);

            return ApiResponse::ok(['verified' => true, 'phone' => $phone]);
        }
        $user = $this->userByPhone($phone, $data['purpose']);
        if (! $user) {
            return ApiResponse::error('auth.invalid_credentials', 'No account uses that mobile number.', 404);
        }

        return $this->login->loginVerified(
            $user,
            (string) $request->ip(),
            $data['slug'] ?? null,
            $data['store_id'] ?? null,
            $data['branch_id'] ?? null,
            $data['terminal_id'] ?? null,
            $data['terminal_pin'] ?? null,
        );
    }

    private function userByPhone(string $phone, string $purpose): ?User
    {
        if (! in_array($purpose, ['staff', 'platform'], true)) {
            return null;
        }
        $kind = $purpose === 'platform' ? 'platform' : 'staff';

        return User::query()
            ->where('kind', $kind)
            ->where('status', 'active')
            ->get()
            ->first(fn (User $user) => PhoneNumber::digits((string) $user->phone_e164) === $phone);
    }

    private function tenantIdFor(User $user): ?string
    {
        $tenantId = DB::table('staff_profiles')->where('user_id', $user->id)->value('tenant_id');

        return $tenantId ? (string) $tenantId : null;
    }

    private function latestOtp(string $phone, string $purpose): ?object
    {
        return DB::table('phone_otps')
            ->where('phone', $phone)
            ->where('purpose', $purpose)
            ->whereNull('verified_at')
            ->orderByDesc('created_at')
            ->first();
    }

    private function otpMatches(object $row, string $code): bool
    {
        if (now()->greaterThan($row->expires_at) || (int) $row->attempts >= 5) {
            return false;
        }
        $expected = hash_hmac('sha256', $code, (string) config('app.key'));
        if (! hash_equals((string) $row->code_hash, $expected)) {
            DB::table('phone_otps')->where('id', $row->id)->update(['attempts' => (int) $row->attempts + 1]);

            return false;
        }

        return true;
    }
}
