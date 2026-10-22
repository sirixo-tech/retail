<?php

namespace Tests\Feature;

use App\Modules\Catalog\Models\Category;
use App\Modules\Catalog\Models\Product;
use App\Modules\Catalog\Models\TaxClass;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CatalogTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
        $this->postJson('/api/v1/auth/platform/login', [
            'email' => 'admin@selfx.test',
            'password' => 'password',
        ])->assertOk();
    }

    public function test_dry_run_writes_rows_and_no_products(): void
    {
        $before = Product::query()->count();

        $this->postJson('/api/v1/platform/catalog/imports', [
            'filename' => 'sample.csv',
            'commit' => false,
            'csv' => "name,gtin\nBasmati rice 5kg,8901001000018\nBad row,8901001000010\nBasmati rice again,8901001000018\n",
        ])->assertOk()
            ->assertJsonPath('data.stats.valid', 1)
            ->assertJsonPath('data.stats.errors', 2);

        $this->assertSame($before, Product::query()->count());
    }

    public function test_commit_creates_a_draft_and_publish_requires_category_and_tax(): void
    {
        $response = $this->postJson('/api/v1/platform/catalog/imports', [
            'commit' => true,
            'csv' => "name,gtin\nBasmati rice 5kg,8901001000018\n",
        ])->assertOk();

        $this->assertSame(1, Product::query()->count());
        $id = Product::query()->value('id');

        $this->postJson("/api/v1/platform/catalog/products/{$id}/publish")
            ->assertStatus(422);

        $product = Product::query()->findOrFail($id);
        $product->update([
            'category_id' => Category::query()->where('slug', 'staples')->value('id'),
            'tax_class_id' => TaxClass::query()->where('hsn', '1006')->value('id'),
        ]);

        $this->postJson("/api/v1/platform/catalog/products/{$id}/publish")
            ->assertOk()
            ->assertJsonPath('data.status', 'published');

        $this->assertNotEmpty($response->json('data.id'));
    }

    public function test_staff_cannot_publish(): void
    {
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

        $this->postJson('/api/v1/platform/catalog/products', [
            'name' => 'Milk',
            'gtin' => '8901001000025',
        ])->assertForbidden();
    }

    public function test_digital_link_resolves_after_publish(): void
    {
        $product = $this->postJson('/api/v1/platform/catalog/products', [
            'name' => 'Toned milk 1L',
            'gtin' => '8901001000025',
            'category_id' => Category::query()->where('slug', 'dairy')->value('id'),
            'tax_class_id' => TaxClass::query()->where('hsn', '0401')->value('id'),
            'description' => 'Toned milk in a one litre pouch, packed for the same day.',
        ])->assertCreated()->json('data.id');

        $this->postJson("/api/v1/platform/catalog/products/{$product}/publish")->assertOk();

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

        $this->getJson('/api/v1/catalog/barcode/'.rawurlencode('https://id.gs1.org/01/8901001000025'))
            ->assertOk()
            ->assertJsonPath('data.name', 'Toned milk 1L');
    }
}
