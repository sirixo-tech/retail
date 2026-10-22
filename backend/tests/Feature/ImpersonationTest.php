<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ImpersonationTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_platform_admin_can_view_a_store_and_cannot_change_its_secrets(): void
    {
        $this->seed();
        $this->postJson('/api/v1/auth/platform/login', [
            'email' => 'admin@selfx.test',
            'password' => 'password',
        ])->assertOk();
        $tenant = $this->postJson('/api/v1/platform/tenants', [
            'owner_name' => 'Ananya Shah',
            'email' => 'owner@annapurna.store',
            'password' => 'first-pass-1',
            'business_name' => 'Annapurna Stores',
            'slug' => 'annapurna',
            'kind' => 'single_store',
            'plan_code' => 'starter',
        ])->assertCreated();

        $ticket = $this->postJson('/api/v1/platform/tenants/'.$tenant->json('data.id').'/impersonate')
            ->assertOk()
            ->json('data.ticket');
        $this->postJson('/api/v1/auth/impersonation/accept', ['ticket' => $ticket])
            ->assertOk()
            ->assertJsonPath('data.impersonation.tenant_name', 'Annapurna Stores');
        $this->postJson('/api/v1/auth/impersonation/accept', ['ticket' => $ticket])->assertStatus(401);

        $this->getJson('/api/v1/customers')->assertOk();
        $this->postJson('/api/v1/auth/password', [
            'current_password' => 'first-pass-1',
            'password' => 'second-pass-1',
        ])->assertForbidden()->assertJsonPath('error.code', 'impersonation.denied');
        $this->postJson('/api/v1/staff/pin', ['pin' => '1234'])->assertForbidden();
        $this->putJson('/api/v1/gateways/razorpay/credentials', [
            'key_id' => 'rzp_test_x',
            'key_secret' => 'secret-value',
        ])->assertForbidden();

        $this->postJson('/api/v1/auth/impersonation/stop')
            ->assertOk()
            ->assertJsonPath('data.kind', 'platform')
            ->assertJsonPath('data.impersonation', null);
        $this->getJson('/api/v1/platform/tenants')->assertOk();
    }
}
