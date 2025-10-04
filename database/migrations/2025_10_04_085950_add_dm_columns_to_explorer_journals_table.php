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
        Schema::table('explorer_journal', function (Blueprint $table) {
            // Kolom ini sudah benar, 'id' pasti ada.
            $table->foreignId('dm_conversation_id')->nullable()->after('id')->constrained('dm_conversations')->nullOnDelete();

            // DIPERBAIKI: Menggunakan 'meta' sebagai acuan, karena kolom 'content' tidak ada.
            $table->json('metadata')->nullable()->after('meta');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('explorer_journal', function (Blueprint $table) {
            // Method down() Anda sudah benar.
            $table->dropForeign(['dm_conversation_id']);
            $table->dropColumn(['dm_conversation_id', 'metadata']);
        });
    }
};
