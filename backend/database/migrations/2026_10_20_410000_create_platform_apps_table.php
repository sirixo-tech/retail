<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('platform_apps')) {
            Schema::create('platform_apps', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->string('key')->unique();
                $table->string('name');
                $table->string('tag')->default('System'); // 'System' or 'Custom'
                $table->string('category')->default('pos');
                $table->text('description')->nullable();
                $table->boolean('is_active')->default(true);
                $table->json('platforms')->nullable(); // ['android', 'windows', 'macos', 'web']
                $table->json('download_links')->nullable(); // [{'platform': 'android', 'url': '...', 'size': '...'}]
                $table->json('in_app_updates')->nullable(); // [{'platform': 'android', 'version': '5.0.0', 'force': false, 'notes': '...'}]
                $table->integer('sort_order')->default(0);
                $table->text('page_copy')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('platform_apps');
    }
};
