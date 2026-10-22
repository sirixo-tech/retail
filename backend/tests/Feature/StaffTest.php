<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StaffTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_add_a_cashier_and_the_cashier_cannot_add_staff(): void
    {
        $this->seed();
        $this->postJson('/api/v1/auth/platform/login', [
            'email' => 'admin@selfx.test',
            'password' => 'password',
        ])->assertOk();
        $this->postJson('/api/v1/platform/tenants', [
            'owner_name' => 'Ananya Shah',
            'email' => 'owner@annapurna.store',
            'password' => 'first-pass-1',
            'business_name' => 'Annapurna',
            'slug' => 'annapurna',
            'kind' => 'single_store',
            'plan_code' => 'starter',
        ])->assertCreated();
        $this->postJson('/api/v1/auth/platform/logout')->assertOk();
        $this->postJson('/api/v1/auth/staff/login', [
            'email' => 'owner@annapurna.store',
            'password' => 'first-pass-1',
            'slug' => 'annapurna',
        ])->assertOk();
        $this->changeRequiredPassword();

        $this->postJson('/api/v1/staff', [
            'name' => 'Ravi',
            'email' => 'ravi@annapurna.store',
            'password' => 'cashier-pass-1',
            'role' => 'cashier',
        ])->assertCreated()->assertJsonPath('data.role', 'cashier');

        $this->postJson('/api/v1/auth/staff/logout')->assertOk();
        $this->postJson('/api/v1/auth/staff/login', [
            'email' => 'ravi@annapurna.store',
            'password' => 'cashier-pass-1',
            'slug' => 'annapurna',
        ])->assertOk()->assertJsonPath('data.must_change_password', true);
        $this->changeRequiredPassword('cashier-pass-1', 'changed-pass-1');

        $this->postJson('/api/v1/staff', [
            'name' => 'Another',
            'email' => 'other@annapurna.store',
            'password' => 'cashier-pass-1',
            'role' => 'cashier',
        ])->assertForbidden()->assertJsonPath('error.code', 'permission.denied');
    }

    public function test_staff_must_change_password_before_other_routes(): void
    {
        $this->seed();
        $this->postJson('/api/v1/auth/platform/login', [
            'email' => 'admin@selfx.test',
            'password' => 'password',
        ])->assertOk();
        $this->postJson('/api/v1/platform/tenants', [
            'owner_name' => 'Ananya Shah',
            'email' => 'owner@annapurna.store',
            'password' => 'first-pass-1',
            'business_name' => 'Annapurna',
            'slug' => 'annapurna',
            'kind' => 'single_store',
            'plan_code' => 'starter',
        ])->assertCreated();
        $this->postJson('/api/v1/auth/platform/logout')->assertOk();
        $this->postJson('/api/v1/auth/staff/login', [
            'email' => 'owner@annapurna.store',
            'password' => 'first-pass-1',
            'slug' => 'annapurna',
        ])->assertOk();
        $this->changeRequiredPassword();
        $this->postJson('/api/v1/staff', [
            'name' => 'Ravi',
            'email' => 'ravi@annapurna.store',
            'password' => 'cashier-pass-1',
            'role' => 'cashier',
        ])->assertCreated();

        $this->postJson('/api/v1/auth/staff/logout')->assertOk();
        $this->postJson('/api/v1/auth/staff/login', [
            'email' => 'ravi@annapurna.store',
            'password' => 'cashier-pass-1',
            'slug' => 'annapurna',
        ])->assertOk()->assertJsonPath('data.must_change_password', true);

        $this->getJson('/api/v1/staff')
            ->assertForbidden()
            ->assertJsonPath('error.code', 'auth.password_change_required');
        $this->postJson('/api/v1/auth/password', [
            'current_password' => 'wrong-pass-1',
            'password' => 'changed-pass-1',
        ])->assertStatus(422);
        $this->postJson('/api/v1/auth/staff/logout')->assertOk();

        $this->postJson('/api/v1/auth/staff/login', [
            'email' => 'ravi@annapurna.store',
            'password' => 'cashier-pass-1',
            'slug' => 'annapurna',
        ])->assertOk();
        $this->postJson('/api/v1/auth/password', [
            'current_password' => 'cashier-pass-1',
            'password' => 'changed-pass-1',
        ])->assertOk()->assertJsonPath('data.must_change_password', false);

        $this->getJson('/api/v1/staff')->assertOk();
    }
}
