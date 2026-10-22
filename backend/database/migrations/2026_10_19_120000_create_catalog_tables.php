<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            DB::statement('CREATE SCHEMA IF NOT EXISTS catalog');
        }

        Schema::create($this->table('tax_classes'), function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('hsn', 8);
            $table->unsignedInteger('gst_bps');
            $table->unsignedInteger('cess_bps')->default(0);
            $table->date('effective_from');
            $table->timestamps();
            $table->index(['hsn', 'effective_from']);
        });

        Schema::create($this->table('categories'), function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('parent_id')->nullable();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('path');
            $table->uuid('default_tax_class_id')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->index('parent_id');
        });

        Schema::create($this->table('brands'), function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('slug')->unique();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create($this->table('products'), function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('kind')->default('standard');
            $table->uuid('parent_id')->nullable();
            $table->string('name');
            $table->uuid('brand_id')->nullable();
            $table->uuid('category_id')->nullable();
            $table->uuid('tax_class_id')->nullable();
            $table->text('description')->nullable();
            $table->string('status')->default('draft');
            $table->unsignedTinyInteger('quality_score')->default(0);
            $table->string('source')->default('manual');
            $table->string('licence')->nullable();
            $table->bigInteger('reference_mrp_paise')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['status', 'category_id']);
            $table->index('parent_id');
        });

        Schema::create($this->table('identifiers'), function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('product_id');
            $table->string('type');
            $table->string('value_raw');
            $table->string('value_normalised');
            $table->boolean('is_primary')->default(true);
            $table->timestamps();
            $table->unique('value_normalised');
            $table->index('product_id');
        });

        Schema::create($this->table('product_versions'), function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('product_id');
            $table->unsignedInteger('version');
            $table->json('snapshot');
            $table->timestamp('published_at')->nullable();
            $table->uuid('actor_id')->nullable();
            $table->timestamps();
            $table->unique(['product_id', 'version']);
        });

        Schema::create($this->table('import_batches'), function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('source');
            $table->string('filename')->nullable();
            $table->json('mapping')->nullable();
            $table->string('status');
            $table->boolean('dry_run')->default(true);
            $table->json('stats')->nullable();
            $table->timestamps();
        });

        Schema::create($this->table('import_rows'), function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('batch_id');
            $table->unsignedInteger('row_number');
            $table->json('payload');
            $table->string('status');
            $table->json('errors')->nullable();
            $table->uuid('product_id')->nullable();
            $table->timestamps();
            $table->index(['batch_id', 'status']);
        });

        Schema::create($this->table('external_sources'), function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('provider')->unique();
            $table->json('config')->nullable();
            $table->text('licence_note')->nullable();
            $table->boolean('enabled')->default(false);
            $table->uuid('enabled_by')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        foreach (['external_sources', 'import_rows', 'import_batches', 'product_versions', 'identifiers', 'products', 'brands', 'categories', 'tax_classes'] as $name) {
            Schema::dropIfExists($this->table($name));
        }
    }

    private function table(string $name): string
    {
        return Schema::getConnection()->getDriverName() === 'pgsql' ? 'catalog.'.$name : 'catalog_'.$name;
    }
};
