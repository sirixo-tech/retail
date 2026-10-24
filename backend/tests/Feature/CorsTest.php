<?php

namespace Tests\Feature;

use Tests\TestCase;

class CorsTest extends TestCase
{
    public function test_cors_preflight_allows_localhost_with_credentials(): void
    {
        $response = $this->call(
            'OPTIONS',
            '/api/v1/auth/staff/login',
            [],
            [],
            [],
            [
                'HTTP_ORIGIN' => 'http://localhost:60824',
                'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'POST',
                'HTTP_ACCESS_CONTROL_REQUEST_HEADERS' => 'content-type,x-requested-with',
            ]
        );

        $response->assertStatus(204);
        $this->assertSame('http://localhost:60824', $response->headers->get('Access-Control-Allow-Origin'));
        $this->assertSame('true', $response->headers->get('Access-Control-Allow-Credentials'));
    }

    public function test_cors_preflight_allows_sirixo_domains(): void
    {
        $response = $this->call(
            'OPTIONS',
            '/api/v1/auth/staff/login',
            [],
            [],
            [],
            [
                'HTTP_ORIGIN' => 'https://retail.sirixo.com',
                'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'POST',
            ]
        );

        $response->assertStatus(204);
        $this->assertSame('https://retail.sirixo.com', $response->headers->get('Access-Control-Allow-Origin'));
        $this->assertSame('true', $response->headers->get('Access-Control-Allow-Credentials'));
    }
}
