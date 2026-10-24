<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('store_items')) {
            Schema::table('store_items', function (Blueprint $table) {
                if (! Schema::hasColumn('store_items', 'enable_batch_tracking')) {
                    $table->boolean('enable_batch_tracking')->default(false)->after('track_stock');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('store_items')) {
            Schema::table('store_items', function (Blueprint $table) {
                $table->dropColumn('enable_batch_tracking');
            });
        }
    }
};
