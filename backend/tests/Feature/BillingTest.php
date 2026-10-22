<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BillingTest extends TestCase
{
    use RefreshDatabase;

    public function test_professional_invoice_is_issued_once_and_starter_is_free(): void
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
            'plan_code' => 'professional',
        ])->assertCreated();

        $this->postJson('/api/v1/auth/platform/logout')->assertOk();
        $this->postJson('/api/v1/auth/staff/login', [
            'email' => 'owner@annapurna.store',
            'password' => 'first-pass-1',
            'slug' => 'annapurna',
        ])->assertOk();
        $this->changeRequiredPassword();

        $this->getJson('/api/v1/billing/subscription')->assertOk()->assertJsonPath('data.plan_code', 'professional');
        $usage = $this->getJson('/api/v1/billing/usage')->assertOk()->json('data');
        $this->assertSame(5000, collect($usage)->firstWhere('key', 'limit.products')['limit']);

        $first = $this->postJson('/api/v1/billing/invoices')->assertCreated();
        $this->assertTrue((bool) $first->json('data.specimen'));
        $this->assertSame(149900, $first->json('data.subtotal_paise'));
        $second = $this->postJson('/api/v1/billing/invoices')->assertOk();
        $this->assertSame($first->json('data.id'), $second->json('data.id'));
    }
}
