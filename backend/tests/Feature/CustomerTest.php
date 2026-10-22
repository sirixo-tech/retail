<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CustomerTest extends TestCase
{
    use RefreshDatabase;

    public function test_two_tenants_can_share_a_phone_and_a_sale_keeps_its_customer(): void
    {
        $this->seed();
        $this->postJson('/api/v1/auth/platform/login', [
            'email' => 'admin@selfx.test',
            'password' => 'password',
        ])->assertOk();

        foreach (['annapurna', 'second'] as $slug) {
            $this->postJson('/api/v1/platform/tenants', [
                'owner_name' => 'Owner',
                'email' => "owner@{$slug}.store",
                'password' => 'first-pass-1',
                'business_name' => $slug,
                'slug' => $slug,
                'kind' => 'single_store',
                'plan_code' => 'starter',
            ])->assertCreated();
        }

        $this->postJson('/api/v1/auth/platform/logout')->assertOk();
        $this->postJson('/api/v1/auth/staff/login', [
            'email' => 'owner@annapurna.store',
            'password' => 'first-pass-1',
            'slug' => 'annapurna',
        ])->assertOk();
        $this->changeRequiredPassword();

        $first = $this->postJson('/api/v1/customers', [
            'name' => 'Meera',
            'phone' => '9876543210',
        ])->assertCreated();

        $this->postJson('/api/v1/auth/staff/logout')->assertOk();
        $this->postJson('/api/v1/auth/staff/login', [
            'email' => 'owner@second.store',
            'password' => 'first-pass-1',
            'slug' => 'second',
        ])->assertOk();
        $this->changeRequiredPassword();

        $second = $this->postJson('/api/v1/customers', [
            'name' => 'Meera',
            'phone' => '9876543210',
        ])->assertCreated();

        $this->assertNotSame($first->json('data.id'), $second->json('data.id'));
        $this->getJson('/api/v1/customers?q=98765')->assertOk()->assertJsonCount(1, 'data');

        $this->getJson('/api/v1/customers/'.$first->json('data.id').'/sales')->assertNotFound();
        $this->assertSame(2, DB::table('customers')->count());
    }
}
