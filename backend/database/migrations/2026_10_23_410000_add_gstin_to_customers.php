<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('customers')) {
            Schema::table('customers', function (Blueprint $table) {
                if (! Schema::hasColumn('customers', 'gstin')) {
                    $table->string('gstin', 15)->nullable()->after('email');
                    $table->index('gstin', 'idx_customers_gstin');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('customers')) {
            Schema::table('customers', function (Blueprint $table) {
                $table->dropIndex('idx_customers_gstin');
                $table->dropColumn('gstin');
            });
        }
    }
};
