<?php

use App\Support\Tenancy\RlsHelper;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('catalog_subscriptions')) {
            Schema::create('catalog_subscriptions', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id');
                $table->uuid('master_product_id');
                $table->uuid('store_item_id');
                $table->boolean('auto_update_price')->default(false);
                $table->boolean('auto_update_name')->default(true);
                $table->boolean('auto_update_description')->default(true);
                $table->boolean('auto_update_tax')->default(true);
                $table->timestamp('subscribed_at')->nullable();
                $table->timestamp('last_synced_at')->nullable();
                $table->timestamps();

                $table->unique(['store_item_id', 'master_product_id']);
                $table->index('master_product_id', 'idx_catalog_subs_product');
                $table->index('tenant_id', 'idx_catalog_subs_tenant');
            });

            RlsHelper::enableRls('catalog_subscriptions');
        }
    }

    public function down(): void
    {
        RlsHelper::disableRls('catalog_subscriptions');
        Schema::dropIfExists('catalog_subscriptions');
    }
};
