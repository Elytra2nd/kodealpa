<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('game_sessions', function (Blueprint $table) {
            $table->json('learning_progress')->nullable();
            $table->integer('hint_count')->default(0);
            $table->json('peer_feedback')->nullable();
            $table->integer('collaboration_score')->default(0);
        });
    }

    public function down(): void
    {
        Schema::table('game_sessions', function (Blueprint $table) {
            $table->dropColumn(['learning_progress', 'hint_count', 'peer_feedback', 'collaboration_score']);
        });
    }
};
