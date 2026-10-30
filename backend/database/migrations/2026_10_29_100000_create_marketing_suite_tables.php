<?php

use App\Support\Tenancy\RlsHelper;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('marketing_campaigns')) {
            Schema::create('marketing_campaigns', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id');
                $table->string('name', 160);
                $table->string('channel', 24); // whatsapp, sms, email
                $table->string('target_segment', 64)->default('all'); // all, online_buyers, vip_spenders, inactive, custom
                $table->integer('target_count')->default(0);
                $table->integer('sent_count')->default(0);
                $table->integer('failed_count')->default(0);
                $table->string('status', 24)->default('draft'); // draft, scheduled, in_progress, sent, failed
                $table->string('subject', 200)->nullable();
                $table->text('message_body');
                $table->uuid('template_id')->nullable();
                $table->timestamp('scheduled_at')->nullable();
                $table->timestamp('sent_at')->nullable();
                $table->json('metrics')->nullable(); // delivered, clicks, conversions, revenue_paise
                $table->timestamps();

                $table->index(['tenant_id', 'status']);
                $table->index(['tenant_id', 'channel']);
            });

            RlsHelper::enableRls('marketing_campaigns');
        }

        if (! Schema::hasTable('marketing_templates')) {
            Schema::create('marketing_templates', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id');
                $table->string('channel', 24); // whatsapp, sms, email
                $table->string('name', 140);
                $table->string('category', 40)->default('promotional'); // promotional, festive, abandoned_cart, loyalty_rewards, welcome, win_back
                $table->string('subject', 200)->nullable();
                $table->text('content');
                $table->json('variables')->nullable();
                $table->json('meta_payload')->nullable(); // dlt_template_id, button_text, cta_url, header_image_url
                $table->boolean('is_active')->default(true);
                $table->timestamps();

                $table->index(['tenant_id', 'channel']);
            });

            RlsHelper::enableRls('marketing_templates');
        }

        if (! Schema::hasTable('marketing_segments')) {
            Schema::create('marketing_segments', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id');
                $table->string('name', 120);
                $table->string('description', 255)->nullable();
                $table->json('rules')->nullable(); // min_orders, min_spend_paise, purchased_online, days_since_last_order
                $table->integer('estimated_count')->default(0);
                $table->timestamps();

                $table->index('tenant_id');
            });

            RlsHelper::enableRls('marketing_segments');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('marketing_segments');
        Schema::dropIfExists('marketing_templates');
        Schema::dropIfExists('marketing_campaigns');
    }
};
