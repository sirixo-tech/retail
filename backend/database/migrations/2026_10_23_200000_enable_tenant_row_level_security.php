<?php

use App\Support\Tenancy\RlsHelper;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        RlsHelper::enableAll();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        RlsHelper::disableAll();
    }
};
