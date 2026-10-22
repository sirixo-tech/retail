<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('platform_settings', function (Blueprint $table) {
            $table->string('trade_name', 160)->nullable()->after('legal_name');
            $table->string('cin', 25)->nullable()->after('trade_name');
            $table->string('pan', 10)->nullable()->after('cin');
            $table->string('bank_name', 120)->nullable()->after('address');
            $table->string('bank_account_name', 160)->nullable()->after('bank_name');
            $table->string('bank_account_number', 50)->nullable()->after('bank_account_name');
            $table->string('bank_ifsc', 15)->nullable()->after('bank_account_number');
            $table->string('bank_branch', 100)->nullable()->after('bank_ifsc');
            $table->string('bank_upi_id', 100)->nullable()->after('bank_branch');
            $table->string('signatory_name', 120)->nullable()->after('bank_upi_id');
            $table->string('signatory_designation', 100)->nullable()->after('signatory_name');
            $table->string('invoice_prefix', 20)->default('SFX-')->after('signatory_designation');
        });
    }

    public function down(): void
    {
        Schema::table('platform_settings', function (Blueprint $table) {
            $table->dropColumn([
                'trade_name',
                'cin',
                'pan',
                'bank_name',
                'bank_account_name',
                'bank_account_number',
                'bank_ifsc',
                'bank_branch',
                'bank_upi_id',
                'signatory_name',
                'signatory_designation',
                'invoice_prefix',
            ]);
        });
    }
};
