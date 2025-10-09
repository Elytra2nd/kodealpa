<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('grimoire_entries', function (Blueprint $table) {
            // Tambah kolom pdf_path setelah kolom file_url
            $table->string('pdf_path')->nullable()->after('file_url');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('grimoire_entries', function (Blueprint $table) {
            // Hapus kolom pdf_path saat rollback
            $table->dropColumn('pdf_path');
        });
    }
};
