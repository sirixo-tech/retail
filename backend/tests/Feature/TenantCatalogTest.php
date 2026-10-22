<?php

namespace Tests\Feature;

use App\Modules\Tenancy\Models\Store;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class TenantCatalogTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_store_can_keep_its_own_products(): void
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
        $storeId = (string) Store::query()->value('id');
        $this->postJson('/api/v1/auth/platform/logout')->assertOk();
        $this->postJson('/api/v1/auth/staff/login', [
            'email' => 'owner@annapurna.store',
            'password' => 'first-pass-1',
            'slug' => 'annapurna',
        ])->assertOk();
        $this->changeRequiredPassword();

        $category = $this->postJson('/api/v1/catalog/own/categories', [
            'name' => 'Beverages',
            'code' => 'BEV',
        ])->assertCreated();
        $brand = $this->postJson('/api/v1/catalog/own/brands', ['name' => 'AquaPure'])->assertCreated();
        $this->postJson('/api/v1/catalog/own/units', ['name' => 'Piece', 'short_name' => 'pc'])->assertCreated();
        $this->postJson('/api/v1/catalog/own/products', [
            'name' => 'Orange juice 1L',
            'sku' => 'OJ-1',
            'selling_price_paise' => 26000,
            'cost_paise' => 11000,
            'gst_bps' => 500,
            'opening_qty' => 4,
            'category_id' => $category->json('data.id'),
            'brand_id' => $brand->json('data.id'),
        ])->assertCreated();

        $this->getJson("/api/v1/stores/{$storeId}/items")
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Orange juice 1L')
            ->assertJsonPath('data.0.category', 'Beverages')
            ->assertJsonPath('data.0.brand', 'AquaPure');

        $this->postJson('/api/v1/catalog/own/products/import', [
            'csv' => "name,code,cost,category,unit,retail_price,brand\nGround coffee,CF-1,3.20,Beverages,pc,6.90,AquaPure\n",
        ])->assertOk()->assertJsonPath('data.added', 1);

        $this->postJson('/api/v1/catalog/own/products/prices', [
            'csv' => "code,cost,retail_price\nOJ-1,1.20,2.80\n",
        ])->assertOk()->assertJsonPath('data.updated', 1);
        $this->assertSame(1, DB::table('store_item_prices')->where('selling_price_paise', 280)->count());

        $this->postJson('/api/v1/catalog/own/products/opening', [
            'csv' => "product_code,qty\nCF-1,6\n",
        ])->assertOk()->assertJsonPath('data.posted', 1);
        $this->getJson('/api/v1/catalog/own/labels')->assertOk()->assertJsonPath('data.0.sku', 'CF-1');
    }
}
