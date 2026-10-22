<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('impersonation_tickets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('token_hash');
            $table->uuid('tenant_id');
            $table->uuid('impersonator_id');
            $table->uuid('user_id');
            $table->timestamp('expires_at');
            $table->timestamp('used_at')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->unique('token_hash');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('impersonation_tickets');
    }
};
