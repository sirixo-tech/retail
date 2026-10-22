<?php

namespace Tests\Feature;

use App\Modules\Identity\Models\User;
use App\Modules\Identity\Support\Totp;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class IdentityTest extends TestCase
{
    use RefreshDatabase;

    public function test_platform_admin_can_sign_in(): void
    {
        $this->seed();

        $this->postJson('/api/v1/auth/platform/login', [
            'email' => 'admin@selfx.test',
            'password' => 'password',
        ])->assertOk()->assertJsonPath('data.kind', 'platform');

        $this->getJson('/api/v1/auth/platform/me')
            ->assertOk()
            ->assertJsonPath('data.email', 'admin@selfx.test');
    }

    public function test_wrong_password_does_not_sign_in(): void
    {
        $this->seed();

        $this->postJson('/api/v1/auth/platform/login', [
            'email' => 'admin@selfx.test',
            'password' => 'nope',
        ])->assertUnauthorized()->assertJsonPath('error.code', 'auth.invalid_credentials');
    }

    public function test_wrong_totp_does_not_create_a_session(): void
    {
        $this->seed();
        $user = User::query()->where('email', 'admin@selfx.test')->firstOrFail();
        $user->update([
            'two_factor_secret' => 'JBSWY3DPEHPK3PXP',
            'two_factor_confirmed_at' => now(),
        ]);

        $this->postJson('/api/v1/auth/platform/login', [
            'email' => 'admin@selfx.test',
            'password' => 'password',
        ])->assertOk()->assertJsonPath('data.two_factor', true);

        $this->postJson('/api/v1/auth/platform/two-factor/challenge', ['code' => '000000'])
            ->assertUnauthorized();

        $this->getJson('/api/v1/auth/platform/me')->assertUnauthorized();

        $code = Totp::current('JBSWY3DPEHPK3PXP');
        $this->postJson('/api/v1/auth/platform/two-factor/challenge', ['code' => $code])
            ->assertOk()
            ->assertJsonPath('data.email', 'admin@selfx.test');
    }
}
