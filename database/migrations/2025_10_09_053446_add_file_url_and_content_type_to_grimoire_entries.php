<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('grimoire_entries', function (Blueprint $table) {
            $table->string('file_url')->nullable()->after('content_html');
            $table->string('content_type', 100)->nullable()->after('file_url');
        });
    }

    public function down(): void
    {
        Schema::table('grimoire_entries', function (Blueprint $table) {
            $table->dropColumn(['file_url', 'content_type']);
        });
    }
};
