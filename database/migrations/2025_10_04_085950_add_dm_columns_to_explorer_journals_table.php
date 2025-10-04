<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('explorer_journal', function (Blueprint $table) {
            $table->foreignId('dm_conversation_id')->nullable()->after('id')->constrained()->nullOnDelete();
            $table->json('metadata')->nullable()->after('content');
        });
    }

    public function down(): void
    {
        Schema::table('explorer_journal', function (Blueprint $table) {
            $table->dropForeign(['dm_conversation_id']);
            $table->dropColumn(['dm_conversation_id', 'metadata']);
        });
    }
};
