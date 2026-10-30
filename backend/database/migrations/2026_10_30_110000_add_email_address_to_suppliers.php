<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('suppliers', function (Blueprint $table) {
            if (! Schema::hasColumn('suppliers', 'email')) {
                $table->string('email')->nullable()->after('phone');
            }
            if (! Schema::hasColumn('suppliers', 'address')) {
                $table->text('address')->nullable()->after('gstin');
            }
        });
    }

    public function down(): void
    {
        Schema::table('suppliers', function (Blueprint $table) {
            if (Schema::hasColumn('suppliers', 'email')) {
                $table->dropColumn('email');
            }
            if (Schema::hasColumn('suppliers', 'address')) {
                $table->dropColumn('address');
            }
        });
    }
};
