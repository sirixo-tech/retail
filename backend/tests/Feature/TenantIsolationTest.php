<?php

namespace Tests\Feature;

use App\Modules\Customers\Models\Customer;
use App\Modules\Identity\Models\StaffProfile;
use App\Modules\Identity\Models\User;
use App\Modules\Orders\Models\Order;
use App\Modules\Pos\Models\Sale;
use App\Modules\Printing\Models\DocumentTemplate;
use App\Modules\Printing\Models\Printer;
use App\Modules\Tenancy\Models\Store;
use App\Modules\Tenancy\Models\Tenant;
use App\Support\Tenancy\RlsHelper;
use App\Support\Tenancy\TenantContext;
use App\Support\Tenancy\TenantScope;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class TenantIsolationTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenantA;
    private Tenant $tenantB;
    private User $staffUserA;
    private User $staffUserB;
    private Store $storeA;
    private Store $storeB;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();

        // Create Tenant A
        $this->tenantA = Tenant::create([
            'id' => (string) Str::uuid7(),
            'kind' => 'single_store',
            'name' => 'Store Alpha',
            'slug' => 'store-alpha',
            'email' => 'alpha@test.com',
            'status' => 'active',
        ]);

        $this->storeA = Store::withoutGlobalScope(TenantScope::class)->create([
            'id' => (string) Str::uuid7(),
            'tenant_id' => $this->tenantA->id,
            'name' => 'Store Alpha Branch',
            'code' => 'ALPHA-1',
            'public_slug' => 'alpha-store',
            'status' => 'active',
            'is_default' => true,
        ]);

        $this->staffUserA = User::create([
            'id' => (string) Str::uuid7(),
            'kind' => 'staff',
            'name' => 'Staff Alpha',
            'email' => 'staff.alpha@test.com',
            'password' => bcrypt('password123'),
            'status' => 'active',
            'must_change_password' => false,
        ]);

        StaffProfile::withoutGlobalScope(TenantScope::class)->create([
            'id' => (string) Str::uuid7(),
            'user_id' => $this->staffUserA->id,
            'tenant_id' => $this->tenantA->id,
            'display_name' => 'Staff Alpha',
            'status' => 'active',
        ]);

        // Create Tenant B
        $this->tenantB = Tenant::create([
            'id' => (string) Str::uuid7(),
            'kind' => 'single_store',
            'name' => 'Store Beta',
            'slug' => 'store-beta',
            'email' => 'beta@test.com',
            'status' => 'active',
        ]);

        $this->storeB = Store::withoutGlobalScope(TenantScope::class)->create([
            'id' => (string) Str::uuid7(),
            'tenant_id' => $this->tenantB->id,
            'name' => 'Store Beta Branch',
            'code' => 'BETA-1',
            'public_slug' => 'beta-store',
            'status' => 'active',
            'is_default' => true,
        ]);

        $this->staffUserB = User::create([
            'id' => (string) Str::uuid7(),
            'kind' => 'staff',
            'name' => 'Staff Beta',
            'email' => 'staff.beta@test.com',
            'password' => bcrypt('password123'),
            'status' => 'active',
            'must_change_password' => false,
        ]);

        StaffProfile::withoutGlobalScope(TenantScope::class)->create([
            'id' => (string) Str::uuid7(),
            'user_id' => $this->staffUserB->id,
            'tenant_id' => $this->tenantB->id,
            'display_name' => 'Staff Beta',
            'status' => 'active',
        ]);
    }

    public function test_automatic_eloquent_scoping_prevents_cross_tenant_data_leakage(): void
    {
        /** @var TenantContext $context */
        $context = app(TenantContext::class);

        // Populate data for Tenant A
        $context->actingAsTenant($this->tenantA->id, function () {
            Sale::create([
                'id' => (string) Str::uuid7(),
                'store_id' => $this->storeA->id,
                'counter_id' => (string) Str::uuid7(),
                'shift_id' => (string) Str::uuid7(),
                'number' => 'INV-A-001',
                'client_uuid' => (string) Str::uuid7(),
                'gst_pricing_mode' => 'inclusive',
                'subtotal_paise' => 50000,
                'total_paise' => 50000,
            ]);

            Customer::create([
                'id' => (string) Str::uuid7(),
                'name' => 'Customer Alpha',
                'phone_e164' => '+919876543210',
            ]);
        });

        // Populate data for Tenant B
        $context->actingAsTenant($this->tenantB->id, function () {
            Sale::create([
                'id' => (string) Str::uuid7(),
                'store_id' => $this->storeB->id,
                'counter_id' => (string) Str::uuid7(),
                'shift_id' => (string) Str::uuid7(),
                'number' => 'INV-B-001',
                'client_uuid' => (string) Str::uuid7(),
                'gst_pricing_mode' => 'inclusive',
                'subtotal_paise' => 80000,
                'total_paise' => 80000,
            ]);

            Customer::create([
                'id' => (string) Str::uuid7(),
                'name' => 'Customer Beta',
                'phone_e164' => '+919876543211',
            ]);
        });

        // Querying under Tenant A context: ONLY Tenant A records must be returned
        $context->actingAsTenant($this->tenantA->id, function () {
            $sales = Sale::all();
            $this->assertCount(1, $sales);
            $this->assertEquals('INV-A-001', $sales->first()->number);
            $this->assertEquals($this->tenantA->id, $sales->first()->tenant_id);

            $customers = Customer::all();
            $this->assertCount(1, $customers);
            $this->assertEquals('Customer Alpha', $customers->first()->name);

            // Attempting to look up Tenant B's sale directly by ID returns null
            $tenantBSaleId = DB::table('sales')->where('tenant_id', $this->tenantB->id)->value('id');
            $this->assertNotNull($tenantBSaleId);
            $leakAttempt = Sale::where('id', $tenantBSaleId)->first();
            $this->assertNull($leakAttempt, 'Tenant A must NOT be able to query Tenant B sale by ID');
        });

        // Querying under Tenant B context: ONLY Tenant B records must be returned
        $context->actingAsTenant($this->tenantB->id, function () {
            $sales = Sale::all();
            $this->assertCount(1, $sales);
            $this->assertEquals('INV-B-001', $sales->first()->number);
            $this->assertEquals($this->tenantB->id, $sales->first()->tenant_id);

            $customers = Customer::all();
            $this->assertCount(1, $customers);
            $this->assertEquals('Customer Beta', $customers->first()->name);

            // Attempting to look up Tenant A's customer directly returns null
            $tenantACustomerId = DB::table('customers')->where('tenant_id', $this->tenantA->id)->value('id');
            $this->assertNotNull($tenantACustomerId);
            $leakAttempt = Customer::where('id', $tenantACustomerId)->first();
            $this->assertNull($leakAttempt, 'Tenant B must NOT be able to query Tenant A customer by ID');
        });
    }

    public function test_super_admin_can_bypass_tenant_scope_explicitly(): void
    {
        /** @var TenantContext $context */
        $context = app(TenantContext::class);

        $context->actingAsTenant($this->tenantA->id, function () {
            Customer::create([
                'id' => (string) Str::uuid7(),
                'name' => 'Customer Alpha',
                'phone_e164' => '+919999999991',
            ]);
        });

        $context->actingAsTenant($this->tenantB->id, function () {
            Customer::create([
                'id' => (string) Str::uuid7(),
                'name' => 'Customer Beta',
                'phone_e164' => '+919999999992',
            ]);
        });

        // withoutGlobalScope(TenantScope::class) returns all tenants' data
        $allCustomers = Customer::withoutGlobalScope(TenantScope::class)->get();
        $this->assertGreaterThanOrEqual(2, $allCustomers->count());

        // withoutTenancy scope macro also works
        $macroCustomers = Customer::withoutTenancy()->get();
        $this->assertEquals($allCustomers->count(), $macroCustomers->count());
    }

    public function test_shared_reference_data_with_null_tenant_id_is_accessible(): void
    {
        /** @var TenantContext $context */
        $context = app(TenantContext::class);

        // Seed a global template with tenant_id = NULL
        $globalTemplateId = (string) Str::uuid7();
        DocumentTemplate::withoutGlobalScope(TenantScope::class)->create([
            'id' => $globalTemplateId,
            'tenant_id' => null,
            'kind' => 'receipt',
            'locale' => 'en',
            'content' => ['header' => 'Default Store'],
            'version' => 1,
            'is_locked' => true,
        ]);

        // When acting as Tenant A, the global template is accessible
        $context->actingAsTenant($this->tenantA->id, function () use ($globalTemplateId) {
            $found = DocumentTemplate::where('id', $globalTemplateId)->first();
            $this->assertNotNull($found, 'Global template with NULL tenant_id must be accessible to Tenant A');
            $this->assertNull($found->tenant_id);
        });
    }

    public function test_middleware_rejects_session_tenant_mismatch_with_403_forbidden(): void
    {
        // Staff user A logs in and receives valid session
        $this->postJson('/api/v1/auth/staff/login', [
            'email' => 'staff.alpha@test.com',
            'password' => 'password123',
            'slug' => 'store-alpha',
        ])->assertOk();

        // Valid request to staff endpoint succeeds
        $this->getJson('/api/v1/auth/staff/me')->assertOk();

        // Tamper with the session tenant_id to point to Tenant B
        session(['tenant_id' => $this->tenantB->id]);

        // Subsequent request must be rejected with 403 Forbidden
        $response = $this->getJson('/api/v1/auth/staff/me');
        $response->assertStatus(403);
        $response->assertJsonPath('error.code', 'auth.tenant_mismatch');
    }

    public function test_middleware_auto_populates_missing_session_tenant_from_staff_profile(): void
    {
        // Authenticate staff user A
        $this->actingAs($this->staffUserA);

        // Session tenant_id is not set
        session()->forget('tenant_id');
        $this->assertNull(session('tenant_id'));

        // Middleware auto-detects active staff profile and sets tenant_id
        $this->getJson('/api/v1/auth/staff/me')->assertOk();
        $this->assertEquals($this->tenantA->id, session('tenant_id'));
    }

    public function test_public_storefront_resolves_store_without_authentication(): void
    {
        // Unauthenticated request to public storefront resolves store correctly
        $response = $this->getJson('/api/v1/public/stores/alpha-store');
        $response->assertOk();
        $response->assertJsonPath('data.slug', 'alpha-store');

        $responseB = $this->getJson('/api/v1/public/stores/beta-store');
        $responseB->assertOk();
        $responseB->assertJsonPath('data.slug', 'beta-store');
    }

    public function test_tenant_context_helper_acting_and_each_tenant(): void
    {
        $context = app(TenantContext::class);
        $this->assertNull($context->id());

        $executed = false;
        $context->actingAsTenant($this->tenantA->id, function () use (&$executed, $context) {
            $this->assertEquals($this->tenantA->id, $context->id());
            $executed = true;
        });

        $this->assertTrue($executed);
        // After callback, tenant ID must be restored to previous state
        $this->assertNull($context->id());

        // Test Tenant::acting static wrapper
        $staticExecuted = false;
        Tenant::acting($this->tenantB->id, function () use (&$staticExecuted, $context) {
            $this->assertEquals($this->tenantB->id, $context->id());
            $staticExecuted = true;
        });
        $this->assertTrue($staticExecuted);
        $this->assertNull($context->id());

        // Test Tenant::eachTenant
        $visitedTenantIds = [];
        Tenant::eachTenant(function ($tenant) use (&$visitedTenantIds, $context) {
            $visitedTenantIds[] = $tenant->id;
            $this->assertEquals($tenant->id, $context->id());
        });

        $this->assertContains($this->tenantA->id, $visitedTenantIds);
        $this->assertContains($this->tenantB->id, $visitedTenantIds);
    }

    public function test_rls_helper_contains_all_tenant_tables(): void
    {
        $this->assertContains('sales', RlsHelper::TENANT_TABLES);
        $this->assertContains('orders', RlsHelper::TENANT_TABLES);
        $this->assertContains('customers', RlsHelper::TENANT_TABLES);
        $this->assertContains('stores', RlsHelper::TENANT_TABLES);
        $this->assertContains('store_items', RlsHelper::TENANT_TABLES);
        $this->assertContains('printers', RlsHelper::TENANT_TABLES);
        $this->assertContains('print_jobs', RlsHelper::TENANT_TABLES);
        $this->assertContains('subscriptions', RlsHelper::TENANT_TABLES);
    }
}
