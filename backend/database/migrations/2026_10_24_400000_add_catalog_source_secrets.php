<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $table = Schema::getConnection()->getDriverName() === 'pgsql' ? 'catalog.external_sources' : 'catalog_external_sources';
        Schema::table($table, function (Blueprint $table) {
            $table->text('secret')->nullable();
            $table->timestamp('last_pulled_at')->nullable();
            $table->unsignedInteger('imported_count')->default(0);
            $table->text('last_error')->nullable();
        });
    }

    public function down(): void
    {
        $table = Schema::getConnection()->getDriverName() === 'pgsql' ? 'catalog.external_sources' : 'catalog_external_sources';
        Schema::table($table, function (Blueprint $table) {
            $table->dropColumn(['secret', 'last_pulled_at', 'imported_count', 'last_error']);
        });
    }
};
