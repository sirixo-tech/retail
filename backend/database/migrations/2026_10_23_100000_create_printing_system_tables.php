<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Document Templates
        if (!Schema::hasTable('document_templates')) {
            Schema::create('document_templates', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id')->nullable();
                $table->string('kind', 50); // receipt, label, pick_list, delivery_note, invoice_pdf, report_pdf
                $table->string('locale', 10)->default('en'); // en, te, hi
                $table->json('content');
                $table->integer('version')->default(1);
                $table->boolean('is_locked')->default(false);
                $table->uuid('created_by')->nullable();
                $table->timestamps();

                $table->index(['tenant_id', 'kind', 'locale']);
                $table->index('created_by');
            });
        }

        // 2. Template Versions (Append-only audit trail)
        if (!Schema::hasTable('document_template_versions')) {
            Schema::create('document_template_versions', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('template_id');
                $table->integer('version_number');
                $table->json('content');
                $table->uuid('edited_by')->nullable();
                $table->timestamp('created_at')->useCurrent();

                $table->index(['template_id', 'version_number']);
            });
        }

        // 3. Hardware Printers
        if (!Schema::hasTable('printers')) {
            Schema::create('printers', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id');
                $table->uuid('store_id');
                $table->string('name');
                $table->string('transport', 50); // agent, browser_raw, browser_dialog
                $table->string('driver', 50); // escpos, system, epson_epos, star_webprnt, sdk
                $table->json('connection_params')->nullable();
                $table->string('device_token')->nullable();
                $table->string('status', 20)->default('offline'); // online, offline, paper_out
                $table->timestamp('last_heartbeat_at')->nullable();
                $table->timestamps();
                $table->softDeletes();

                $table->index(['store_id', 'status']);
                $table->index('tenant_id');
                $table->index('last_heartbeat_at');
            });
        }

        // 4. Print Profiles (Routing configuration)
        if (!Schema::hasTable('print_profiles')) {
            Schema::create('print_profiles', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('store_id');
                $table->string('document_kind', 50); // receipt, label, pick_list, delivery_note, invoice_pdf, report_pdf
                $table->uuid('printer_id');
                $table->uuid('template_id')->nullable();
                $table->string('driver_name', 50)->default('escpos');
                $table->string('cut_mode', 20)->default('partial'); // none, partial, full
                $table->string('open_drawer_on', 20)->default('never'); // never, cash, all_payments
                $table->string('orientation', 20)->default('portrait'); // portrait, landscape
                $table->timestamps();

                $table->unique(['store_id', 'document_kind']);
                $table->index('printer_id');
            });
        }

        // 5. Pairing Sessions (4-digit security code pairing)
        if (!Schema::hasTable('pairing_sessions')) {
            Schema::create('pairing_sessions', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->string('code', 10);
                $table->uuid('store_id');
                $table->string('agent_fingerprint');
                $table->string('device_token')->nullable();
                $table->string('status', 20)->default('pending'); // pending, completed, expired
                $table->timestamp('expires_at');
                $table->timestamp('created_at')->useCurrent();
                $table->timestamp('completed_at')->nullable();

                $table->index(['code', 'status']);
                $table->index('expires_at');
            });
        }

        // 6. Extend print_jobs table
        Schema::table('print_jobs', function (Blueprint $table) {
            if (!Schema::hasColumn('print_jobs', 'command_plan')) {
                $table->json('command_plan')->nullable();
            }
            if (!Schema::hasColumn('print_jobs', 'purpose')) {
                $table->string('purpose', 20)->default('sale');
            }
            if (!Schema::hasColumn('print_jobs', 'failure_reason')) {
                $table->string('failure_reason')->nullable();
            }
            if (!Schema::hasColumn('print_jobs', 'acknowledged_at')) {
                $table->timestamp('acknowledged_at')->nullable();
            }
            if (!Schema::hasColumn('print_jobs', 'retry_count')) {
                $table->integer('retry_count')->default(0);
            }
        });
    }

    public function down(): void
    {
        Schema::table('print_jobs', function (Blueprint $table) {
            $table->dropColumn(['command_plan', 'purpose', 'failure_reason', 'acknowledged_at', 'retry_count']);
        });

        Schema::dropIfExists('pairing_sessions');
        Schema::dropIfExists('print_profiles');
        Schema::dropIfExists('printers');
        Schema::dropIfExists('document_template_versions');
        Schema::dropIfExists('document_templates');
    }
};
