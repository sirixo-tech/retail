<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('counters', function (Blueprint $table) {
            $table->string('pairing_code', 10)->nullable()->index();
            $table->timestamp('pairing_expires_at')->nullable();
            $table->timestamp('paired_at')->nullable();
            $table->string('device_name', 120)->nullable();
            $table->string('device_fingerprint', 160)->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('counters', function (Blueprint $table) {
            $table->dropColumn([
                'pairing_code',
                'pairing_expires_at',
                'paired_at',
                'device_name',
                'device_fingerprint',
            ]);
        });
    }
};
