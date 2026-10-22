<?php

namespace Tests\Feature;

use Tests\TestCase;

class HealthTest extends TestCase
{
    public function test_live_returns_the_envelope(): void
    {
        $this->get('/health/live')
            ->assertOk()
            ->assertJsonPath('data.status', 'ok')
            ->assertJsonPath('error', null);
    }

    public function test_ready_passes_when_the_database_is_up(): void
    {
        $this->get('/health/ready')
            ->assertOk()
            ->assertJsonPath('data.status', 'ok')
            ->assertJsonPath('data.checks.database.ok', true);
    }

    public function test_root_names_the_api(): void
    {
        $this->get('/')
            ->assertOk()
            ->assertJsonPath('data.name', 'SelfX Retail API');
    }
}
