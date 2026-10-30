<?php

namespace App\Modules\Tenancy\Actions;

use App\Modules\Identity\Models\StaffProfile;
use App\Modules\Identity\Models\User;
use App\Modules\Tenancy\Models\ProvisionStep;
use App\Modules\Tenancy\Models\Store;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Throwable;

class ProvisionTenant
{
    /** @var list<string> */
    public const STEPS = [
        'owner_user',
        'default_store',
        'default_counter',
        'invoice_series',
        'roles',
        'owner_assignment',
        'storefront',
        'settings',
        'welcome_email',
        'mark_active',
    ];

    public function run(Tenant $tenant, string $ownerName, string $ownerEmail, ?string $password = null): void
    {
        foreach (self::STEPS as $step) {
            if ($this->done($tenant, $step)) {
                continue;
            }

            $row = ProvisionStep::query()->firstOrCreate(
                ['tenant_id' => $tenant->id, 'step' => $step],
                ['status' => 'pending'],
            );
            $row->increment('attempts');

            try {
                DB::transaction(function () use ($tenant, $step, $ownerName, $ownerEmail, $password): void {
                    $this->{$this->method($step)}($tenant, $ownerName, $ownerEmail, $password);
                });
                $row->update([
                    'status' => 'completed',
                    'last_error' => null,
                    'completed_at' => now(),
                ]);
            } catch (Throwable $e) {
                $row->update(['status' => 'failed', 'last_error' => $e->getMessage()]);
                $tenant->update(['provision_status' => 'failed']);
                throw $e;
            }
        }
    }

    private function method(string $step): string
    {
        return Str::camel($step);
    }

    private function done(Tenant $tenant, string $step): bool
    {
        return ProvisionStep::query()
            ->where('tenant_id', $tenant->id)
            ->where('step', $step)
            ->where('status', 'completed')
            ->exists();
    }

    private function ownerUser(Tenant $tenant, string $ownerName, string $ownerEmail, ?string $password): void
    {
        if (StaffProfile::query()->where('tenant_id', $tenant->id)->exists()) {
            return;
        }

        if (User::query()->where('email', $ownerEmail)->exists()) {
            throw new \RuntimeException('That email is already used.');
        }

        $user = User::query()->create([
            'kind' => 'staff',
            'name' => $ownerName,
            'email' => $ownerEmail,
            'phone_e164' => $tenant->phone_e164,
            'password' => $password ?? Str::password(20),
            'must_change_password' => true,
            'status' => 'active',
        ]);

        StaffProfile::query()->create([
            'user_id' => $user->id,
            'tenant_id' => $tenant->id,
            'display_name' => $ownerName,
            'status' => 'active',
        ]);
    }

    private function defaultStore(Tenant $tenant, string $ownerName, string $ownerEmail, ?string $password): void
    {
        Store::query()->firstOrCreate(
            ['tenant_id' => $tenant->id, 'code' => 'MAIN'],
            [
                'name' => $tenant->name,
                'public_slug' => $tenant->slug,
                'gstin' => $tenant->gstin,
                'timezone' => $tenant->timezone,
                'status' => 'active',
                'is_default' => true,
                'settings' => ['reservation_hours' => 24],
            ],
        );
    }

    private function defaultCounter(Tenant $tenant, string $ownerName, string $ownerEmail, ?string $password): void
    {
        $store = $this->store($tenant);
        DB::table('counters')->insertOrIgnore([
            'id' => (string) Str::uuid7(),
            'store_id' => $store->id,
            'tenant_id' => $tenant->id,
            'name' => 'Counter 1',
            'code' => 'C1',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function invoiceSeries(Tenant $tenant, string $ownerName, string $ownerEmail, ?string $password): void
    {
        $store = $this->store($tenant);
        $counterId = DB::table('counters')->where('store_id', $store->id)->where('code', 'C1')->value('id');
        $fy = $this->fiscalYear();

        DB::table('invoice_series')->insertOrIgnore([
            'id' => (string) Str::uuid7(),
            'tenant_id' => $tenant->id,
            'store_id' => $store->id,
            'counter_id' => $counterId,
            'fiscal_year' => $fy,
            'prefix' => $fy.'-'.$store->code.'-C1',
            'next_number' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function roles(Tenant $tenant, string $ownerName, string $ownerEmail, ?string $password): void
    {
        foreach (['owner', 'manager', 'cashier', 'inventory', 'delivery'] as $name) {
            $exists = DB::table('roles')
                ->where('tenant_id', $tenant->id)
                ->where('name', $name)
                ->exists();
            if ($exists) {
                continue;
            }
            DB::table('roles')->insert([
                'id' => (string) Str::uuid7(),
                'tenant_id' => $tenant->id,
                'name' => $name,
                'guard_name' => 'web',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    private function ownerAssignment(Tenant $tenant, string $ownerName, string $ownerEmail, ?string $password): void
    {
        $profile = StaffProfile::query()->where('tenant_id', $tenant->id)->firstOrFail();
        $roleId = DB::table('roles')->where('tenant_id', $tenant->id)->where('name', 'owner')->value('id');
        $exists = DB::table('model_has_roles')
            ->where('role_id', $roleId)
            ->where('model_id', $profile->user_id)
            ->exists();
        if ($exists) {
            return;
        }
        DB::table('model_has_roles')->insert([
            'id' => (string) Str::uuid7(),
            'role_id' => $roleId,
            'model_id' => $profile->user_id,
            'model_type' => User::class,
            'tenant_id' => $tenant->id,
            'store_id' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function storefront(Tenant $tenant, string $ownerName, string $ownerEmail, ?string $password): void
    {
        $store = $this->store($tenant);
        $exists = DB::table('storefronts')->where('store_id', $store->id)->exists();
        if ($exists) {
            return;
        }
        DB::table('storefronts')->insert([
            'id' => (string) Str::uuid7(),
            'tenant_id' => $tenant->id,
            'store_id' => $store->id,
            'scope' => 'store',
            'name' => $tenant->name,
            'accent_token' => 'green',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function settings(Tenant $tenant, string $ownerName, string $ownerEmail, ?string $password): void
    {
        $store = $this->store($tenant);
        $settings = $store->settings ?? [];
        $settings['reservation_hours'] = $settings['reservation_hours'] ?? 24;
        $store->update(['settings' => $settings]);
        foreach (['cod', 'pay_at_store'] as $provider) {
            $exists = DB::table('payment_gateways')
                ->where('store_id', $store->id)
                ->where('provider', $provider)
                ->where('mode', 'live')
                ->exists();
            if ($exists) {
                continue;
            }
            DB::table('payment_gateways')->insert([
                'id' => (string) Str::uuid7(),
                'tenant_id' => $tenant->id,
                'store_id' => $store->id,
                'provider' => $provider,
                'mode' => 'live',
                'status' => 'active',
                'is_default' => $provider === 'pay_at_store',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    private function welcomeEmail(Tenant $tenant, string $ownerName, string $ownerEmail, ?string $password): void
    {
        Mail::raw(
            "Your SelfX store {$tenant->name} is ready. Sign in at {$tenant->slug}.retail.selfx.in and set a new password.",
            function ($message) use ($ownerEmail, $tenant): void {
                $message->to($ownerEmail)->subject("{$tenant->name} is ready on SelfX");
            },
        );
    }

    private function markActive(Tenant $tenant, string $ownerName, string $ownerEmail, ?string $password): void
    {
        $tenant->update([
            'status' => 'active',
            'provision_status' => 'completed',
        ]);
    }

    private function store(Tenant $tenant): Store
    {
        return Store::query()->where('tenant_id', $tenant->id)->where('code', 'MAIN')->firstOrFail();
    }

    private function fiscalYear(): string
    {
        $now = now('Asia/Kolkata');
        $start = $now->month >= 4 ? $now->year : $now->year - 1;

        return substr((string) $start, -2).substr((string) ($start + 1), -2);
    }
}
