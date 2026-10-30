<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('integration_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('store_id');
            $table->string('provider', 40);
            $table->string('action', 80);
            $table->string('direction', 20)->default('outbound');
            $table->string('status', 20);
            $table->text('message');
            $table->timestamp('created_at')->useCurrent();
            $table->index(['store_id', 'provider', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('integration_logs');
    }
};
