<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('phone_otps', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('phone', 20);
            $table->string('purpose', 40);
            $table->uuid('tenant_id')->nullable();
            $table->string('code_hash');
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->timestamp('expires_at');
            $table->timestamp('verified_at')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['phone', 'purpose', 'created_at']);
        });

        Schema::create('api_request_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('method', 12);
            $table->string('path', 255);
            $table->unsignedSmallInteger('status');
            $table->unsignedInteger('duration_ms');
            $table->string('ip', 45)->nullable();
            $table->uuid('actor_id')->nullable();
            $table->text('response_excerpt')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index('created_at');
        });

        Schema::table('impersonation_tickets', function (Blueprint $table) {
            $table->timestamp('stopped_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('impersonation_tickets', function (Blueprint $table) {
            $table->dropColumn('stopped_at');
        });
        Schema::dropIfExists('api_request_logs');
        Schema::dropIfExists('phone_otps');
    }
};
