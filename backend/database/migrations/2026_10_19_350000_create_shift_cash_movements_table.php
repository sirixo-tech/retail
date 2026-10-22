<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shift_cash_movements', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('shift_id');
            $table->uuid('user_id');
            $table->string('direction');
            $table->bigInteger('amount_paise');
            $table->string('reason');
            $table->timestamp('created_at')->useCurrent();
            $table->index('shift_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shift_cash_movements');
    }
};
