<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(ValidateCsrfToken::class);
    }

    protected function changeRequiredPassword(string $current = 'first-pass-1', string $next = 'second-pass-1'): void
    {
        $this->postJson('/api/v1/auth/password', [
            'current_password' => $current,
            'password' => $next,
        ])->assertOk();
    }
}
