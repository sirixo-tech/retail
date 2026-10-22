<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('supplier_payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('supplier_id');
            $table->bigInteger('amount_paise');
            $table->string('note')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('customer_segments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->string('name');
            $table->timestamps();
            $table->unique(['tenant_id', 'name']);
        });

        Schema::create('customer_segment_members', function (Blueprint $table) {
            $table->uuid('segment_id');
            $table->uuid('customer_id');
            $table->timestamp('created_at')->useCurrent();
            $table->primary(['segment_id', 'customer_id']);
        });

        Schema::create('customer_feedback', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('customer_id');
            $table->unsignedTinyInteger('rating');
            $table->string('comment')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index('customer_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_feedback');
        Schema::dropIfExists('customer_segment_members');
        Schema::dropIfExists('customer_segments');
        Schema::dropIfExists('supplier_payments');
    }
};
