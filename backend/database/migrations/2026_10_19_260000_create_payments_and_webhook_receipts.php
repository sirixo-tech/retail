<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('store_id');
            $table->uuid('order_id');
            $table->string('provider');
            $table->string('mode');
            $table->bigInteger('amount_paise');
            $table->string('status')->default('created');
            $table->string('capture_token_hash')->nullable();
            $table->timestamps();
            $table->index(['order_id', 'status']);
        });

        Schema::create('webhook_receipts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('provider');
            $table->string('provider_event_id');
            $table->boolean('signature_ok')->default(false);
            $table->json('payload');
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();
            $table->unique(['provider', 'provider_event_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('webhook_receipts');
        Schema::dropIfExists('payments');
    }
};
