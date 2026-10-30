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

    public function test_created_staff_role_permissions_are_accessible_on_login(): void
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

        // 1. Owner signs in
        $this->postJson('/api/v1/auth/staff/login', [
            'email' => 'owner@annapurna.store',
            'password' => 'first-pass-1',
            'slug' => 'annapurna',
        ])->assertOk();
        $this->changeRequiredPassword();

        // 2. Roles API returns code, name, and permissions
        $rolesRes = $this->getJson('/api/v1/roles')->assertOk();
        $rolesRes->assertJsonFragment(['code' => 'inventory']);
        $rolesRes->assertJsonFragment(['code' => 'cashier']);

        // 3. Create a custom role with specific module permissions
        $this->postJson('/api/v1/roles', [
            'code' => 'store_auditor',
            'name' => 'Store Auditor',
            'description' => 'Inventory auditor role',
            'permissions' => ['catalog.view', 'inventory.view', 'reports.view'],
        ])->assertCreated();

        // 4. Create a staff member assigned the custom role
        $this->postJson('/api/v1/staff', [
            'name' => 'Kavita Auditor',
            'email' => 'kavita@annapurna.store',
            'password' => 'auditor-pass-1',
            'role' => 'store_auditor',
        ])->assertCreated()->assertJsonPath('data.role', 'store_auditor');

        // 5. Staff signs in with credentials
        $this->postJson('/api/v1/auth/staff/logout')->assertOk();
        $loginRes = $this->postJson('/api/v1/auth/staff/login', [
            'email' => 'kavita@annapurna.store',
            'password' => 'auditor-pass-1',
            'slug' => 'annapurna',
        ])->assertOk();

        $this->changeRequiredPassword('auditor-pass-1', 'changed-pass-1');

        // 6. Verify profile & /api/v1/auth/staff/me returns role and permissions
        $meRes = $this->getJson('/api/v1/auth/staff/me')->assertOk();
        $meRes->assertJsonPath('data.role', 'store_auditor');
        
        $permissions = $meRes->json('data.permissions');
        $this->assertContains('catalog.view', $permissions);
        $this->assertContains('inventory.view', $permissions);
        $this->assertContains('reports.view', $permissions);
        // Cashier/POS permissions not assigned to auditor should not be present
        $this->assertNotContains('pos.void', $permissions);
    }
}
