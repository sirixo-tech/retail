<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CustomerImportTest extends TestCase
{
    use RefreshDatabase;

    public function test_import_creates_new_customers_and_skips_a_mobile_already_on_file(): void
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
        $this->postJson('/api/v1/auth/platform/logout')->assertOk();
        $this->postJson('/api/v1/auth/staff/login', [
            'email' => 'owner@annapurna.store',
            'password' => 'first-pass-1',
            'slug' => 'annapurna',
        ])->assertOk();
        $this->changeRequiredPassword();

        $csv = "name,phone\nMeera,9876543210\nRavi,9876543211\nMeera again,98765 43210\n,123\n";
        $first = $this->postJson('/api/v1/customers/import', ['csv' => $csv])->assertOk();
        $this->assertSame(2, $first->json('data.created'));
        $this->assertSame(1, $first->json('data.skipped'));
        $this->assertSame(1, $first->json('data.invalid'));
        $this->assertSame(2, DB::table('customers')->count());

        $second = $this->postJson('/api/v1/customers/import', [
            'csv' => "Ravi,9876543211\nLeela,9876543212",
        ])->assertOk();
        $this->assertSame(1, $second->json('data.created'));
        $this->assertSame(1, $second->json('data.skipped'));
        $this->assertSame(3, DB::table('customers')->count());
    }
}
