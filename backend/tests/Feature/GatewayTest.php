<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GatewayTest extends TestCase
{
    use RefreshDatabase;

    public function test_checkout_uses_only_an_enabled_method(): void
    {
        $this->seed();
        $this->postJson('/api/v1/auth/platform/login', [
            'email' => 'admin@selfx.test',
            'password' => 'password',
        ])->assertOk();
        $this->postJson('/api/v1/platform/tenants', [
            'owner_name' => 'Owner',
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

        $this->patchJson('/api/v1/gateways/cod', ['status' => 'disabled'])->assertOk();
        $this->postJson('/api/v1/auth/staff/logout')->assertOk();

        $this->postJson('/api/v1/public/stores/annapurna/checkout', [
            'customer_name' => 'Meera',
            'customer_phone' => '9876543210',
            'fulfillment' => 'delivery',
            'payment_method' => 'cod',
            'pincode' => '500081',
            'lines' => [['store_item_id' => '00000000-0000-4000-8000-000000000001', 'qty' => 1]],
        ])->assertStatus(422)->assertJsonPath('error.message', 'That payment method is not turned on for this store.');
    }
}
