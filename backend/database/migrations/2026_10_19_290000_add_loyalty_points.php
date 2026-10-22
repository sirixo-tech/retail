<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->integer('loyalty_points')->default(0);
        });

        Schema::create('loyalty_entries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('customer_id');
            $table->uuid('sale_id')->nullable();
            $table->string('direction');
            $table->integer('points');
            $table->timestamp('created_at')->useCurrent();
            $table->index(['customer_id', 'created_at']);
            $table->index(['sale_id', 'direction']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loyalty_entries');
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn('loyalty_points');
        });
    }
};
