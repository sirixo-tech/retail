<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sale_credit_notes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('sale_id');
            $table->string('number');
            $table->bigInteger('total_paise');
            $table->string('reason');
            $table->string('status')->default('issued');
            $table->timestamps();
            $table->unique(['tenant_id', 'number']);
        });

        Schema::create('sale_credit_note_lines', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('credit_note_id');
            $table->uuid('sale_line_id');
            $table->decimal('qty', 14, 3);
            $table->bigInteger('total_paise');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sale_credit_note_lines');
        Schema::dropIfExists('sale_credit_notes');
    }
};
