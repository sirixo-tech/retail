<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sale_lines', function (Blueprint $table) {
            $table->string('serial')->nullable();
        });
        Schema::table('deliveries', function (Blueprint $table) {
            $table->string('proof_note')->nullable();
        });
        Schema::table('platform_settings', function (Blueprint $table) {
            $table->boolean('ai_enabled')->default(true);
        });

        Schema::create('invoice_number_blocks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('store_id');
            $table->unsignedInteger('start_number');
            $table->unsignedInteger('end_number');
            $table->timestamp('expires_at');
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('customer_otps', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('store_id');
            $table->string('phone');
            $table->string('code_hash');
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->timestamp('expires_at');
            $table->timestamp('verified_at')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['store_id', 'phone']);
        });

        Schema::create('daily_store_metrics', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('store_id');
            $table->date('metric_date');
            $table->unsignedInteger('bills')->default(0);
            $table->bigInteger('sales_paise')->default(0);
            $table->timestamps();
            $table->unique(['store_id', 'metric_date']);
        });

        Schema::create('billing_utrs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->string('utr');
            $table->bigInteger('amount_paise');
            $table->timestamp('created_at')->useCurrent();
            $table->unique('utr');
        });

        Schema::create('saved_reports', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->string('question');
            $table->string('answer');
            $table->string('citation');
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('cms_pages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->nullable();
            $table->string('slug');
            $table->string('title');
            $table->text('body');
            $table->string('status')->default('published');
            $table->timestamps();
            $table->unique('slug');
        });

        Schema::create('report_schedules', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->string('email');
            $table->timestamp('next_run_at')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('storefront_sections', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('store_id');
            $table->unsignedTinyInteger('position');
            $table->string('kind');
            $table->string('title');
            $table->timestamp('created_at')->useCurrent();
            $table->unique(['store_id', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('storefront_sections');
        Schema::dropIfExists('report_schedules');
        Schema::dropIfExists('cms_pages');
        Schema::dropIfExists('saved_reports');
        Schema::dropIfExists('billing_utrs');
        Schema::dropIfExists('daily_store_metrics');
        Schema::dropIfExists('customer_otps');
        Schema::dropIfExists('invoice_number_blocks');
        Schema::table('platform_settings', function (Blueprint $table) {
            $table->dropColumn('ai_enabled');
        });
        Schema::table('deliveries', function (Blueprint $table) {
            $table->dropColumn('proof_note');
        });
        Schema::table('sale_lines', function (Blueprint $table) {
            $table->dropColumn('serial');
        });
    }
};
