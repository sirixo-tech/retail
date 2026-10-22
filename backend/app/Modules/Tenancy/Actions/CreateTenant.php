<?php

namespace App\Modules\Tenancy\Actions;

use App\Modules\Plans\Models\Plan;
use App\Modules\Plans\Models\PlanFeature;
use App\Modules\Plans\Models\PlanPrice;
use App\Modules\Plans\Models\Subscription;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CreateTenant
{
    public function __construct(private ProvisionTenant $provision)
    {
    }

    /**
     * @param  array<string, mixed>  $input
     */
    public function handle(array $input, ?string $idempotencyKey): Tenant
    {
        if ($idempotencyKey) {
            $existing = Tenant::query()->where('idempotency_key', $idempotencyKey)->first();
            if ($existing) {
                return $existing->load('subscription.plan', 'provisionSteps');
            }
        }

        $slug = strtolower((string) $input['slug']);
        $this->assertSlug($slug);

        $plan = Plan::query()->where('code', $input['plan_code'])->firstOrFail();
        $price = PlanPrice::query()
            ->where('plan_id', $plan->id)
            ->where('cycle', $input['cycle'] ?? 'monthly')
            ->where('active', true)
            ->firstOrFail();

        if ($input['kind'] === 'organization' && ! $this->allowsMultiStore($plan)) {
            throw ValidationException::withMessages([
                'kind' => 'This plan does not include more than one store.',
            ]);
        }

        $tenant = DB::transaction(function () use ($input, $slug, $plan, $price, $idempotencyKey) {
            $tenant = Tenant::query()->create([
                'kind' => $input['kind'],
                'name' => $input['business_name'],
                'legal_name' => $input['legal_name'] ?? $input['business_name'],
                'slug' => $slug,
                'email' => $input['email'],
                'phone_e164' => $input['phone'] ?? null,
                'gstin' => $input['gstin'] ?? null,
                'status' => 'provisioning',
                'timezone' => 'Asia/Kolkata',
                'currency' => 'INR',
                'provision_status' => 'running',
                'idempotency_key' => $idempotencyKey,
            ]);

            $trialDays = (int) $price->trial_days;
            Subscription::query()->create([
                'tenant_id' => $tenant->id,
                'plan_id' => $plan->id,
                'plan_price_id' => $price->id,
                'status' => $trialDays > 0 ? 'trialing' : 'active',
                'trial_ends_at' => $trialDays > 0 ? now()->addDays($trialDays) : null,
                'current_period_start' => now(),
                'current_period_end' => now()->addMonth(),
            ]);

            return $tenant;
        });

        $this->provision->run(
            $tenant,
            (string) $input['owner_name'],
            (string) $input['email'],
            (string) $input['password'],
        );

        return $tenant->fresh()->load('subscription.plan', 'provisionSteps');
    }

    private function assertSlug(string $slug): void
    {
        if (DB::table('reserved_slugs')->where('slug', $slug)->exists() || Tenant::query()->where('slug', $slug)->exists()) {
            throw ValidationException::withMessages([
                'slug' => 'That store address is reserved or already used.',
            ]);
        }
    }

    private function allowsMultiStore(Plan $plan): bool
    {
        return PlanFeature::query()
            ->where('plan_id', $plan->id)
            ->whereHas('feature', fn ($q) => $q->where('key', 'module.multi_store'))
            ->where('value', 1)
            ->exists();
    }
}
