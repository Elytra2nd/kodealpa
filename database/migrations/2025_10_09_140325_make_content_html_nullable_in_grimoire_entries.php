<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('grimoire_entries', function (Blueprint $table) {
            $table->text('content_html')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('grimoire_entries', function (Blueprint $table) {
            $table->text('content_html')->nullable(false)->change();
        });
    }
};
