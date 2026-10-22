<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ShiftCashTest extends TestCase
{
    use RefreshDatabase;

    public function test_paid_in_and_paid_out_change_the_drawer_and_cannot_overdraw_it(): void
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
            'plan_code' => 'starter',
        ])->assertCreated();
        $storeId = (string) \App\Modules\Tenancy\Models\Store::query()->value('id');
        $this->postJson('/api/v1/auth/platform/logout')->assertOk();
        $this->postJson('/api/v1/auth/staff/login', [
            'email' => 'owner@annapurna.store',
            'password' => 'first-pass-1',
            'slug' => 'annapurna',
        ])->assertOk();
        $this->changeRequiredPassword();
        $this->postJson("/api/v1/stores/{$storeId}/shifts/open", ['opening_cash_paise' => 10000])->assertCreated();

        $this->postJson("/api/v1/stores/{$storeId}/shifts/cash", [
            'direction' => 'in',
            'amount_paise' => 5000,
            'reason' => 'Extra float',
        ])->assertCreated()->assertJsonPath('data.expected_paise', 15000);

        $this->postJson("/api/v1/stores/{$storeId}/shifts/cash", [
            'direction' => 'out',
            'amount_paise' => 2000,
            'reason' => 'Milk vendor',
        ])->assertCreated()->assertJsonPath('data.expected_paise', 13000);

        $this->postJson("/api/v1/stores/{$storeId}/shifts/cash", [
            'direction' => 'out',
            'amount_paise' => 20000,
            'reason' => 'Too much',
        ])->assertStatus(422)->assertJsonPath('error.code', 'conflict.cash_short');

        $this->getJson("/api/v1/stores/{$storeId}/shifts/reading")
            ->assertOk()
            ->assertJsonPath('data.paid_in_paise', 5000)
            ->assertJsonPath('data.paid_out_paise', 2000)
            ->assertJsonPath('data.expected_paise', 13000);

        $this->postJson("/api/v1/stores/{$storeId}/shifts/close", ['actual_cash_paise' => 13000])
            ->assertOk()
            ->assertJsonPath('data.expected_cash_paise', 13000)
            ->assertJsonPath('data.difference_paise', 0);
    }
}
