<?php
// database/migrations/2025_10_11_042550_add_hint_system_to_game_sessions_table.php

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
        Schema::table('game_sessions', function (Blueprint $table) {
            // ✅ Add hint system columns after 'collaboration_score' (kolom terakhir)
            $table->json('hint_usage')->nullable()->after('collaboration_score')
                ->comment('Track hints used per stage: {"1": 2, "2": 1}');

            $table->integer('max_hints_per_stage')->default(3)->after('hint_usage')
                ->comment('Maximum hints allowed per stage');

            $table->integer('total_hints_used')->default(0)->after('max_hints_per_stage')
                ->comment('Total hints used across all stages');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('game_sessions', function (Blueprint $table) {
            $table->dropColumn([
                'hint_usage',
                'max_hints_per_stage',
                'total_hints_used',
            ]);
        });
    }
};
