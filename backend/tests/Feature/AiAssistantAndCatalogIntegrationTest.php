<?php

namespace Tests\Feature;

use App\Modules\Catalog\Models\Product;
use App\Modules\Tenancy\Models\Store;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AiAssistantAndCatalogIntegrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_platform_can_manage_catalog_source_and_pull(): void
    {
        $this->postJson('/api/v1/auth/platform/login', [
            'email' => 'admin@selfx.test',
            'password' => 'password',
        ])->assertOk();

        // 1. Update source configuration
        $this->postJson('/api/v1/platform/catalog/sources/open_food_facts', [
            'is_enabled' => true,
            'licence_note' => 'ODbL open license',
            'config' => [
                'api_key' => 'test-key',
                'endpoint' => 'https://world.openfoodfacts.org/api/v2/search',
            ],
        ])->assertOk()
            ->assertJsonPath('data.is_enabled', true)
            ->assertJsonPath('data.has_api_key', true)
            ->assertJsonMissingPath('data.config.api_key');

        \Illuminate\Support\Facades\Http::fake([
            'https://world.openfoodfacts.org/*' => \Illuminate\Support\Facades\Http::response([
                'products' => [[
                    'product_name' => 'Amul Pure Ghee 1L',
                    'code' => '8901001000018',
                    'categories_tags' => ['en:dairy'],
                    'brands' => 'Amul',
                    'image_front_url' => 'https://images.openfoodfacts.org/example.jpg',
                ]],
            ], 200),
        ]);

        $this->postJson('/api/v1/platform/catalog/sources/open_food_facts/pull')->assertStatus(422);
        $this->postJson('/api/v1/platform/catalog/sources/gs1/pull', ['confirm' => true])->assertStatus(422);
        $pull = $this->postJson('/api/v1/platform/catalog/sources/open_food_facts/pull', ['confirm' => true])->assertStatus(202);
        $this->assertSame('queued', $pull->json('data.status'));
        $draft = Product::query()->where('name', 'Amul Pure Ghee 1L')->first();
        $this->assertNotNull($draft);
        $this->assertSame('draft', $draft->status);
        $this->assertNull($draft->tax_class_id);
        $this->postJson('/api/v1/platform/catalog/sources/open_food_facts/pull', ['confirm' => true])->assertStatus(202);
        $this->assertSame(1, Product::query()->where('source', 'open_food_facts')->count());
    }

    public function test_tenant_ai_assistant_responds_with_store_sales_and_guidance(): void
    {
        // Platform creates tenant
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

        // Login as tenant owner
        $this->postJson('/api/v1/auth/staff/login', [
            'email' => 'owner@annapurna.store',
            'password' => 'first-pass-1',
            'slug' => 'annapurna',
        ])->assertOk();

        $this->changeRequiredPassword();

        // Ask Tenant AI Assistant
        $response = $this->postJson('/api/v1/ai/assistant', [
            'message' => 'How much did we sell today?',
        ])->assertOk();

        $this->assertNotEmpty($response->json('data.reply'));
    }

    public function test_storefront_public_ai_assistant_recommends_items_and_hours(): void
    {
        // Platform creates tenant & store
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

        $store = Store::query()->first();
        $slug = $store?->public_slug ?? 'annapurna-main';

        // 1. Inquire about hours
        $hoursResponse = $this->postJson("/api/v1/public/stores/{$slug}/ai", [
            'message' => 'What are your store hours and delivery timings?',
        ])->assertOk();

        $this->assertStringContainsString('Operating & Delivery Timings', $hoursResponse->json('data.reply'));

        // 2. Ask for recommendations
        $recResponse = $this->postJson("/api/v1/public/stores/{$slug}/ai", [
            'message' => 'What items do you recommend?',
        ])->assertOk();

        $this->assertNotEmpty($recResponse->json('data.reply'));
    }

    public function test_platform_can_manage_ai_settings_and_test_connection(): void
    {
        $this->postJson('/api/v1/auth/platform/login', [
            'email' => 'admin@selfx.test',
            'password' => 'password',
        ])->assertOk();

        // 1. Get initial settings
        $getRes = $this->getJson('/api/v1/platform/ai/settings')->assertOk();
        $this->assertNotEmpty($getRes->json('data.providers'));

        // 2. Update AI settings
        $updateRes = $this->putJson('/api/v1/platform/ai/settings', [
            'active_provider' => 'gemini',
            'gemini_api_key' => 'AIzaSyFakeTestKeyForGemini123456789',
            'gemini_model' => 'gemini-1.5-pro',
            'temperature' => 0.4,
            'max_tokens' => 1200,
            'monthly_token_budget' => 20000000,
            'per_tenant_daily_limit' => 1000,
            'fallback_to_local_rag' => true,
        ])->assertOk();

        $this->assertSame('gemini', $updateRes->json('data.active_provider'));
        $this->assertSame('gemini-1.5-pro', $updateRes->json('data.gemini_model'));

        // 3. Test connection with local RAG
        $testLocal = $this->postJson('/api/v1/platform/ai/test', [
            'provider' => 'local_rag',
        ])->assertOk();

        $this->assertTrue($testLocal->json('data.success'));
        $this->assertSame('local_rag', $testLocal->json('data.provider'));
    }
}
