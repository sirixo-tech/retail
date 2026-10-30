<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('counters', function (Blueprint $table) {
            $table->string('kind', 20)->default('pos')->index();
            $table->string('pin_hash')->nullable();
            $table->json('settings')->nullable();
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->string('channel', 24)->default('online')->index();
            $table->uuid('terminal_id')->nullable()->index();
            $table->timestamp('qr_validated_at')->nullable();
            $table->uuid('qr_validated_by')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['channel', 'terminal_id', 'qr_validated_at', 'qr_validated_by']);
        });

        Schema::table('counters', function (Blueprint $table) {
            $table->dropColumn(['kind', 'pin_hash', 'settings']);
        });
    }
};
