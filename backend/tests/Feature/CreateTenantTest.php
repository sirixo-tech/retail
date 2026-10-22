<?php

namespace Tests\Feature;

use App\Modules\Tenancy\Models\Store;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CreateTenantTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
        $this->postJson('/api/v1/auth/platform/login', [
            'email' => 'admin@selfx.test',
            'password' => 'password',
        ])->assertOk();
    }

    public function test_creating_a_tenant_provisions_one_store_and_is_idempotent(): void
    {
        $payload = $this->payload();

        $first = $this->postJson('/api/v1/platform/tenants', $payload, ['Idempotency-Key' => 'tenant-1']);
        $first->assertCreated()->assertJsonPath('data.slug', 'annapurna')->assertJsonPath('data.provision_status', 'completed');

        $second = $this->postJson('/api/v1/platform/tenants', $payload, ['Idempotency-Key' => 'tenant-1']);
        $second->assertCreated();

        $this->assertSame($first->json('data.id'), $second->json('data.id'));
        $this->assertSame(1, Tenant::query()->count());
        $this->assertSame(1, Store::query()->count());
    }

    public function test_reserved_slug_is_rejected(): void
    {
        $this->postJson('/api/v1/platform/tenants', $this->payload('admin'))
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'validation.failed');
    }

    public function test_owner_must_change_password_and_then_can(): void
    {
        $this->postJson('/api/v1/platform/tenants', $this->payload())->assertCreated();

        $this->postJson('/api/v1/auth/platform/logout')->assertOk();

        $this->postJson('/api/v1/auth/staff/login', [
            'email' => 'owner@annapurna.store',
            'password' => 'first-pass-1',
            'slug' => 'annapurna',
        ])->assertOk()->assertJsonPath('data.must_change_password', true);

        $this->getJson('/api/v1/orders')
            ->assertForbidden()
            ->assertJsonPath('error.code', 'auth.password_change_required');

        $this->postJson('/api/v1/auth/password', [
            'current_password' => 'first-pass-1',
            'password' => 'second-pass-1',
        ])->assertOk()->assertJsonPath('data.must_change_password', false);

        $this->getJson('/api/v1/orders')->assertOk();
    }

    public function test_public_tenant_registration_flow(): void
    {
        $this->postJson('/api/v1/auth/platform/logout')->assertOk();

        $res = $this->postJson('/api/v1/auth/register-tenant', [
            'business_name' => 'Metro Supermart',
            'owner_name' => 'Rajesh Sharma',
            'email' => 'rajesh@metrosupermart.in',
            'password' => 'SecurePass123!',
            'phone' => '+919876543210',
            'store_type' => 'Supermarket',
        ]);

        $res->assertCreated()
            ->assertJsonPath('data.tenant.name', 'Metro Supermart')
            ->assertJsonPath('data.tenant.slug', 'metro-supermart')
            ->assertJsonPath('data.tenant.email', 'rajesh@metrosupermart.in');

        $this->assertDatabaseHas('tenants', [
            'name' => 'Metro Supermart',
            'slug' => 'metro-supermart',
        ]);
    }

    /**
     * @return array<string, string>
     */
    private function payload(string $slug = 'annapurna'): array
    {
        return [
            'owner_name' => 'Ananya Shah',
            'email' => 'owner@annapurna.store',
            'password' => 'first-pass-1',
            'business_name' => 'Annapurna Stores',
            'slug' => $slug,
            'kind' => 'single_store',
            'plan_code' => 'starter',
            'cycle' => 'monthly',
        ];
    }
}
