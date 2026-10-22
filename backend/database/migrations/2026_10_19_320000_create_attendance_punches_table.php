<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_punches', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('user_id');
            $table->timestamp('punched_in_at');
            $table->timestamp('punched_out_at')->nullable();
            $table->timestamps();
            $table->index(['tenant_id', 'punched_in_at']);
            $table->index(['user_id', 'punched_out_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_punches');
    }
};
