<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $productsTable = $this->table('products');

        if (Schema::hasTable($productsTable)) {
            Schema::table($productsTable, function (Blueprint $table) {
                if (! Schema::hasColumn($table->getTable(), 'image_url')) {
                    $table->string('image_url', 500)->nullable();
                }
                if (! Schema::hasColumn($table->getTable(), 'thumbnail_url')) {
                    $table->string('thumbnail_url', 500)->nullable();
                }
                if (! Schema::hasColumn($table->getTable(), 'image_source')) {
                    $table->string('image_source', 100)->nullable();
                }
            });
        }

        if (Schema::hasTable('store_items')) {
            Schema::table('store_items', function (Blueprint $table) {
                if (! Schema::hasColumn('store_items', 'image_url')) {
                    $table->string('image_url', 500)->nullable();
                }
            });
        }
    }

    public function down(): void
    {
        $productsTable = $this->table('products');

        if (Schema::hasTable($productsTable)) {
            Schema::table($productsTable, function (Blueprint $table) {
                $table->dropColumn(['image_url', 'thumbnail_url', 'image_source']);
            });
        }

        if (Schema::hasTable('store_items')) {
            Schema::table('store_items', function (Blueprint $table) {
                $table->dropColumn(['image_url']);
            });
        }
    }

    private function table(string $name): string
    {
        return Schema::getConnection()->getDriverName() === 'pgsql' ? 'catalog.'.$name : 'catalog_'.$name;
    }
};
