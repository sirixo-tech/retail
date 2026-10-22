<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sessions', function (Blueprint $table) {
            $table->uuid('tenant_id')->nullable()->index();
            $table->uuid('impersonator_id')->nullable();
        });

        Schema::create('login_attempts', function (Blueprint $table) {
            $table->id();
            $table->string('email')->nullable();
            $table->string('ip', 45)->nullable();
            $table->boolean('succeeded')->default(false);
            $table->timestamp('created_at')->useCurrent();
            $table->index(['email', 'created_at']);
        });

        Schema::create('two_factor_recovery_codes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('code_hash');
            $table->timestamp('used_at')->nullable();
            $table->timestamps();
        });

        Schema::create('staff_profiles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->uuid('tenant_id');
            $table->string('display_name');
            $table->string('status')->default('active');
            $table->timestamps();
            $table->unique(['tenant_id', 'user_id']);
        });

        Schema::create('reserved_slugs', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
        });

        Schema::create('tenants', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('kind');
            $table->string('name');
            $table->string('legal_name')->nullable();
            $table->string('slug');
            $table->string('email');
            $table->string('phone_e164')->nullable();
            $table->string('gstin')->nullable();
            $table->string('pan')->nullable();
            $table->string('status')->default('provisioning');
            $table->string('timezone')->default('Asia/Kolkata');
            $table->string('currency', 3)->default('INR');
            $table->string('db_target')->default('default');
            $table->string('provision_status')->default('pending');
            $table->string('idempotency_key')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->unique('slug');
            $table->unique('idempotency_key');
        });

        Schema::create('features', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('key')->unique();
            $table->string('name');
            $table->string('value_type');
            $table->string('description')->nullable();
            $table->boolean('show_on_pricing')->default(false);
            $table->timestamps();
        });

        Schema::create('plans', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code')->unique();
            $table->string('name');
            $table->string('status')->default('active');
            $table->unsignedSmallInteger('sort')->default(0);
            $table->boolean('is_public')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('plan_prices', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('plan_id')->constrained('plans')->cascadeOnDelete();
            $table->string('cycle');
            $table->bigInteger('amount_paise');
            $table->bigInteger('compare_at_paise')->nullable();
            $table->string('currency', 3)->default('INR');
            $table->unsignedSmallInteger('trial_days')->default(0);
            $table->boolean('active')->default(true);
            $table->timestamps();
            $table->unique(['plan_id', 'cycle']);
        });

        Schema::create('plan_features', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('plan_id')->constrained('plans')->cascadeOnDelete();
            $table->foreignUuid('feature_id')->constrained('features')->cascadeOnDelete();
            $table->bigInteger('value');
            $table->timestamps();
            $table->unique(['plan_id', 'feature_id']);
        });

        Schema::create('subscriptions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('plan_id')->constrained('plans');
            $table->foreignUuid('plan_price_id')->constrained('plan_prices');
            $table->string('status');
            $table->timestamp('trial_ends_at')->nullable();
            $table->timestamp('current_period_start');
            $table->timestamp('current_period_end');
            $table->boolean('cancel_at_period_end')->default(false);
            $table->timestamp('grace_ends_at')->nullable();
            $table->timestamps();
            $table->unique('tenant_id');
        });

        Schema::create('stores', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('name');
            $table->string('code');
            $table->string('public_slug');
            $table->string('gstin')->nullable();
            $table->string('address_line')->nullable();
            $table->string('city')->nullable();
            $table->string('state_code', 4)->nullable();
            $table->string('pincode', 12)->nullable();
            $table->decimal('lat', 9, 6)->nullable();
            $table->decimal('lng', 9, 6)->nullable();
            $table->string('timezone')->default('Asia/Kolkata');
            $table->string('gst_pricing_mode')->default('inclusive');
            $table->boolean('round_to_rupee')->default(true);
            $table->string('status')->default('active');
            $table->boolean('is_default')->default(false);
            $table->json('settings')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['tenant_id', 'code']);
            $table->unique('public_slug');
        });

        Schema::table('staff_profiles', function (Blueprint $table) {
            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
        });

        Schema::create('counters', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('store_id')->constrained('stores')->cascadeOnDelete();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('name');
            $table->string('code');
            $table->string('status')->default('active');
            $table->timestamps();
            $table->unique(['store_id', 'code']);
        });

        Schema::create('invoice_series', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('store_id')->constrained('stores')->cascadeOnDelete();
            $table->foreignUuid('counter_id')->constrained('counters')->cascadeOnDelete();
            $table->string('fiscal_year', 8);
            $table->string('prefix');
            $table->unsignedInteger('next_number')->default(1);
            $table->timestamps();
            $table->unique(['counter_id', 'fiscal_year']);
        });

        Schema::create('tenant_provision_steps', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('step');
            $table->string('status')->default('pending');
            $table->unsignedSmallInteger('attempts')->default(0);
            $table->text('last_error')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->unique(['tenant_id', 'step']);
        });

        Schema::create('storefronts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('store_id')->nullable()->constrained('stores')->nullOnDelete();
            $table->string('scope');
            $table->string('name');
            $table->string('accent_token')->default('green');
            $table->string('status')->default('active');
            $table->timestamps();
        });

        Schema::create('roles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->nullable();
            $table->string('name');
            $table->string('guard_name')->default('web');
            $table->timestamps();
            $table->unique(['tenant_id', 'name', 'guard_name']);
        });

        Schema::create('model_has_roles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('role_id')->constrained('roles')->cascadeOnDelete();
            $table->uuid('model_id');
            $table->string('model_type');
            $table->uuid('tenant_id')->nullable();
            $table->uuid('store_id')->nullable();
            $table->timestamps();
            $table->index(['model_id', 'tenant_id', 'store_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('model_has_roles');
        Schema::dropIfExists('roles');
        Schema::dropIfExists('storefronts');
        Schema::dropIfExists('tenant_provision_steps');
        Schema::dropIfExists('invoice_series');
        Schema::dropIfExists('counters');
        Schema::dropIfExists('staff_profiles');
        Schema::dropIfExists('stores');
        Schema::dropIfExists('subscriptions');
        Schema::dropIfExists('plan_features');
        Schema::dropIfExists('plan_prices');
        Schema::dropIfExists('plans');
        Schema::dropIfExists('features');
        Schema::dropIfExists('tenants');
        Schema::dropIfExists('reserved_slugs');
        Schema::dropIfExists('two_factor_recovery_codes');
        Schema::dropIfExists('login_attempts');
    }
};
