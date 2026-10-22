<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('staff_profiles', function (Blueprint $table) {
            $table->string('pin_hash')->nullable();
        });

        Schema::table('goods_receipt_lines', function (Blueprint $table) {
            $table->date('expires_on')->nullable();
            $table->string('batch_number')->nullable();
        });

        Schema::create('tenant_feature_overrides', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('feature_id');
            $table->bigInteger('value');
            $table->timestamps();
            $table->unique(['tenant_id', 'feature_id']);
        });

        Schema::create('customer_favourites', function (Blueprint $table) {
            $table->uuid('tenant_id');
            $table->string('phone_e164');
            $table->uuid('store_item_id');
            $table->timestamp('created_at')->useCurrent();
            $table->primary(['tenant_id', 'phone_e164', 'store_item_id']);
        });

        Schema::create('api_keys', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->string('name');
            $table->string('prefix', 12);
            $table->string('key_hash');
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();
            $table->index(['tenant_id', 'revoked_at']);
        });

        Schema::create('webhook_endpoints', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->string('url');
            $table->string('status')->default('active');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('webhook_endpoints');
        Schema::dropIfExists('api_keys');
        Schema::dropIfExists('customer_favourites');
        Schema::dropIfExists('tenant_feature_overrides');
        Schema::table('goods_receipt_lines', function (Blueprint $table) {
            $table->dropColumn('expires_on');
        });
        Schema::table('staff_profiles', function (Blueprint $table) {
            $table->dropColumn('pin_hash');
        });
    }
};
