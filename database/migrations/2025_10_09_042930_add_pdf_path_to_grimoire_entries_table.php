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
        // Cek apakah kolom belum ada untuk menghindari error
        if (!Schema::hasColumn('grimoire_entries', 'pdf_path')) {
            Schema::table('grimoire_entries', function (Blueprint $table) {
                $table->string('pdf_path')->nullable();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Cek apakah kolom ada sebelum drop
        if (Schema::hasColumn('grimoire_entries', 'pdf_path')) {
            Schema::table('grimoire_entries', function (Blueprint $table) {
                $table->dropColumn('pdf_path');
            });
        }
    }
};
