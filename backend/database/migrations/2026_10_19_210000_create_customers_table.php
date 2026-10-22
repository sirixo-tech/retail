<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->string('name');
            $table->string('phone_e164')->nullable();
            $table->string('email')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['tenant_id', 'name']);
            $table->unique(['tenant_id', 'phone_e164']);
        });

        Schema::table('sales', function (Blueprint $table) {
            $table->uuid('customer_id')->nullable()->after('shift_id');
        });
    }

    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropColumn('customer_id');
        });
        Schema::dropIfExists('customers');
    }
};
