<?php

namespace Tests\Feature;

use App\Modules\Tenancy\Models\Store;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class UsersReportAndEnhancedFeaturesTest extends TestCase
{
    use RefreshDatabase;

    private function setupTenantSession(): string
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
            'business_name' => 'Annapurna Stores',
            'slug' => 'annapurna',
            'kind' => 'single_store',
            'plan_code' => 'professional',
        ])->assertCreated();

        $storeId = (string) Store::query()->value('id');
        $this->postJson('/api/v1/auth/platform/logout')->assertOk();

        $this->postJson('/api/v1/auth/staff/login', [
            'email' => 'owner@annapurna.store',
            'password' => 'first-pass-1',
            'slug' => 'annapurna',
        ])->assertOk();
        $this->changeRequiredPassword();

        return $storeId;
    }

    public function test_users_report_returns_live_kpis_and_activity_mix(): void
    {
        $storeId = $this->setupTenantSession();

        $response = $this->getJson('/api/v1/reports/users');

        $response->assertOk()
            ->assertJsonPath('data.kpis.team_members_active', 1)
            ->assertJsonPath('data.kpis.documents_created', 0)
            ->assertJsonPath('data.activity_mix.0.name', 'Sales');
    }

    public function test_notifications_filters_summary_and_deletion(): void
    {
        $this->setupTenantSession();
        $tenantId = (string) session('tenant_id');

        $logId = (string) \Illuminate\Support\Str::uuid7();
        DB::table('notification_logs')->insert([
            'id' => $logId,
            'tenant_id' => $tenantId,
            'channel' => 'sms',
            'template' => 'order.placed',
            'status' => 'not_configured',
            'detail' => 'Online order placed: ON-000026 (Delivery with Live GPS)',
            'created_at' => now(),
        ]);

        $response = $this->getJson('/api/v1/notifications?with_summary=1');

        $response->assertOk()
            ->assertJsonPath('data.summary.total', 1)
            ->assertJsonPath('data.summary.not_configured', 1)
            ->assertJsonPath('data.items.0.channel', 'sms');

        // Delete single notification
        $del = $this->deleteJson("/api/v1/notifications/{$logId}");
        $del->assertOk()->assertJsonPath('data.deleted', true);
    }

    public function test_coupon_management_lifecycle(): void
    {
        $this->setupTenantSession();

        // Create coupon
        $create = $this->postJson('/api/v1/coupons', [
            'code' => 'SAVE25',
            'kind' => 'percent',
            'value' => 25,
            'max_redemptions' => 100,
        ]);
        $create->assertCreated();
        $couponId = $create->json('data.id');

        // Toggle status
        $toggle = $this->postJson("/api/v1/coupons/{$couponId}/toggle");
        $toggle->assertOk()->assertJsonPath('data.status', 'paused');

        // Fetch with summary
        $index = $this->getJson('/api/v1/coupons?with_summary=1');
        $index->assertOk()
            ->assertJsonPath('data.summary.total_coupons', 1)
            ->assertJsonPath('data.summary.active_coupons', 0);

        // Delete coupon
        $delete = $this->deleteJson("/api/v1/coupons/{$couponId}");
        $delete->assertOk()->assertJsonPath('data.deleted', true);
    }
}
