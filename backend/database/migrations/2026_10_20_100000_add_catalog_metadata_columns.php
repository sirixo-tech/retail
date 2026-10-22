<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenant_categories', function (Blueprint $table) {
            if (! Schema::hasColumn('tenant_categories', 'description')) {
                $table->string('description', 240)->nullable();
            }
            if (! Schema::hasColumn('tenant_categories', 'image')) {
                $table->text('image')->nullable();
            }
            if (! Schema::hasColumn('tenant_categories', 'status')) {
                $table->string('status', 24)->default('active');
            }
            if (! Schema::hasColumn('tenant_categories', 'sort_order')) {
                $table->integer('sort_order')->default(0);
            }
        });

        Schema::table('tenant_brands', function (Blueprint $table) {
            if (! Schema::hasColumn('tenant_brands', 'code')) {
                $table->string('code', 32)->nullable();
            }
            if (! Schema::hasColumn('tenant_brands', 'image')) {
                $table->text('image')->nullable();
            }
            if (! Schema::hasColumn('tenant_brands', 'website')) {
                $table->string('website', 180)->nullable();
            }
            if (! Schema::hasColumn('tenant_brands', 'status')) {
                $table->string('status', 24)->default('active');
            }
            if (! Schema::hasColumn('tenant_brands', 'is_featured')) {
                $table->boolean('is_featured')->default(false);
            }
        });

        Schema::table('tenant_units', function (Blueprint $table) {
            if (! Schema::hasColumn('tenant_units', 'allow_decimal')) {
                $table->boolean('allow_decimal')->default(false);
            }
            if (! Schema::hasColumn('tenant_units', 'status')) {
                $table->string('status', 24)->default('active');
            }
        });

        Schema::table('store_items', function (Blueprint $table) {
            if (! Schema::hasColumn('store_items', 'sub_category_id')) {
                $table->uuid('sub_category_id')->nullable();
            }
            if (! Schema::hasColumn('store_items', 'image')) {
                $table->text('image')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('store_items', function (Blueprint $table) {
            $table->dropColumn(['sub_category_id', 'image']);
        });
        Schema::table('tenant_units', function (Blueprint $table) {
            $table->dropColumn(['allow_decimal', 'status']);
        });
        Schema::table('tenant_brands', function (Blueprint $table) {
            $table->dropColumn(['code', 'image', 'website', 'status', 'is_featured']);
        });
        Schema::table('tenant_categories', function (Blueprint $table) {
            $table->dropColumn(['description', 'image', 'status', 'sort_order']);
        });
    }
};
