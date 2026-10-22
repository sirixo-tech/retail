<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AttendanceTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_person_punches_in_once_and_the_owner_sees_the_whole_day(): void
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

        $this->postJson('/api/v1/attendance/out')->assertStatus(409);
        $this->postJson('/api/v1/attendance/in')->assertCreated();
        $this->postJson('/api/v1/attendance/in')->assertStatus(409)->assertJsonPath('error.code', 'conflict.punched_in');
        $this->postJson('/api/v1/attendance/out')->assertOk();
        $this->postJson('/api/v1/attendance/out')->assertStatus(409)->assertJsonPath('error.code', 'conflict.punched_out');
        $this->assertNotNull(DB::table('attendance_punches')->value('punched_out_at'));

        $this->postJson('/api/v1/auth/staff/logout')->assertOk();
        $this->postJson('/api/v1/auth/staff/login', [
            'email' => 'ravi@annapurna.store',
            'password' => 'cashier-pass-1',
            'slug' => 'annapurna',
        ])->assertOk();
        $this->changeRequiredPassword('cashier-pass-1', 'cashier-pass-2');
        $this->postJson('/api/v1/attendance/in')->assertCreated();
        $this->getJson('/api/v1/attendance')->assertOk()->assertJsonCount(1, 'data');

        $this->postJson('/api/v1/auth/staff/logout')->assertOk();
        $this->postJson('/api/v1/auth/staff/login', [
            'email' => 'owner@annapurna.store',
            'password' => 'second-pass-1',
            'slug' => 'annapurna',
        ])->assertOk();
        $this->getJson('/api/v1/attendance')->assertOk()->assertJsonCount(2, 'data');
    }
}
