<?php

use App\Support\Tenancy\RlsHelper;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('e_invoices')) {
            Schema::create('e_invoices', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id');
                $table->uuid('sale_id')->unique();
                $table->string('irn', 64)->unique();
                $table->string('ack_no', 30)->nullable();
                $table->timestamp('ack_date')->nullable();
                $table->text('signed_invoice')->nullable();
                $table->text('signed_qr_code')->nullable();
                $table->string('status', 20)->default('generated');
                $table->timestamp('cancellation_date')->nullable();
                $table->text('cancellation_reason')->nullable();
                $table->text('error_message')->nullable();
                $table->timestamps();

                $table->index('tenant_id', 'idx_e_invoices_tenant');
                $table->index('irn', 'idx_e_invoices_irn');
            });

            RlsHelper::enableRls('e_invoices');
        }
    }

    public function down(): void
    {
        RlsHelper::disableRls('e_invoices');
        Schema::dropIfExists('e_invoices');
    }
};
