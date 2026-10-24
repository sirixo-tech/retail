<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $productsTable = $this->table('products');
        $identifiersTable = $this->table('identifiers');

        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            DB::statement("CREATE INDEX IF NOT EXISTS idx_products_name_search ON {$productsTable} USING gin(to_tsvector('english', name))");
        }

        Schema::table($productsTable, function (Blueprint $table) use ($productsTable) {
            $table->index(['status', 'category_id'], 'idx_products_status_category');
            $table->index('brand_id', 'idx_products_brand');
            $table->index('reference_mrp_paise', 'idx_products_reference_mrp');
        });

        Schema::table($identifiersTable, function (Blueprint $table) {
            // value_normalised index if not exists
            if (! $this->hasIndex($table->getTable(), 'idx_identifiers_normalized')) {
                $table->index('value_normalised', 'idx_identifiers_normalized');
            }
        });
    }

    public function down(): void
    {
        $productsTable = $this->table('products');
        $identifiersTable = $this->table('identifiers');

        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            DB::statement("DROP INDEX IF EXISTS idx_products_name_search");
        }

        Schema::table($productsTable, function (Blueprint $table) {
            $table->dropIndex('idx_products_status_category');
            $table->dropIndex('idx_products_brand');
            $table->dropIndex('idx_products_reference_mrp');
        });

        Schema::table($identifiersTable, function (Blueprint $table) {
            $table->dropIndex('idx_identifiers_normalized');
        });
    }

    private function table(string $name): string
    {
        return Schema::getConnection()->getDriverName() === 'pgsql' ? 'catalog.'.$name : 'catalog_'.$name;
    }

    private function hasIndex(string $table, string $indexName): bool
    {
        try {
            $indexes = Schema::getIndexes($table);
            foreach ($indexes as $index) {
                if ($index['name'] === $indexName) {
                    return true;
                }
            }
        } catch (\Throwable) {
            // fallback
        }
        return false;
    }
};
