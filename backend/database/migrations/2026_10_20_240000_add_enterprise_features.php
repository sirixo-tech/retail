<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Inter-Branch Stock Transfer Acknowledgement & Variance tracking
        Schema::table('stock_transfers', function (Blueprint $table) {
            $table->string('transfer_number')->nullable();
            $table->timestamp('dispatched_at')->nullable();
            $table->timestamp('received_at')->nullable();
            $table->text('variance_notes')->nullable();
        });

        Schema::table('stock_transfer_lines', function (Blueprint $table) {
            $table->decimal('received_qty', 14, 3)->nullable();
            $table->decimal('variance_qty', 14, 3)->default(0);
        });

        // Batch & Expiry tracking on sale lines
        Schema::table('sale_lines', function (Blueprint $table) {
            $table->string('batch_number')->nullable();
            $table->date('expires_on')->nullable();
        });

        // Platform Maintenance mode columns on platform_settings
        Schema::table('platform_settings', function (Blueprint $table) {
            $table->boolean('maintenance_mode')->default(false);
            $table->string('maintenance_message')->nullable();
            $table->timestamp('maintenance_until')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('platform_settings', function (Blueprint $table) {
            $table->dropColumn(['maintenance_mode', 'maintenance_message', 'maintenance_until']);
        });

        Schema::table('sale_lines', function (Blueprint $table) {
            $table->dropColumn(['batch_number', 'expires_on']);
        });

        Schema::table('stock_transfer_lines', function (Blueprint $table) {
            $table->dropColumn(['received_qty', 'variance_qty']);
        });

        Schema::table('stock_transfers', function (Blueprint $table) {
            $table->dropColumn(['transfer_number', 'dispatched_at', 'received_at', 'variance_notes']);
        });
    }
};
