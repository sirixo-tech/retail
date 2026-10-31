<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('delivery_messages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('store_id');
            $table->uuid('order_id');
            $table->string('sender', 16);
            $table->string('sender_name', 120);
            $table->text('body');
            $table->timestamp('created_at')->useCurrent();
            $table->index(['order_id', 'created_at']);
        });

        Schema::create('delivery_partner_settings', function (Blueprint $table) {
            $table->uuid('user_id')->primary();
            $table->uuid('tenant_id');
            $table->boolean('share_phone')->default(true);
            $table->boolean('notify_new_order')->default(true);
            $table->boolean('notify_chat')->default(true);
            $table->string('vehicle', 40)->nullable();
            $table->string('note', 240)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('delivery_partner_settings');
        Schema::dropIfExists('delivery_messages');
    }
};
