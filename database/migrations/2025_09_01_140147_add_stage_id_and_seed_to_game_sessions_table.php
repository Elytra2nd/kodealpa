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
        Schema::table('game_sessions', function (Blueprint $table) {
            // Add stage_id column if it doesn't exist
            if (!Schema::hasColumn('game_sessions', 'stage_id')) {
                $table->integer('stage_id')->default(1)->after('status');
            }

            // Add seed column if it doesn't exist
            if (!Schema::hasColumn('game_sessions', 'seed')) {
                $table->integer('seed')->nullable()->after('stage_id');
            }

            // Add other missing columns that might be needed
            if (!Schema::hasColumn('game_sessions', 'current_stage')) {
                $table->integer('current_stage')->default(1)->after('seed');
            }

            if (!Schema::hasColumn('game_sessions', 'started_at')) {
                $table->timestamp('started_at')->nullable()->after('current_stage');
            }

            if (!Schema::hasColumn('game_sessions', 'completed_at')) {
                $table->timestamp('completed_at')->nullable()->after('started_at');
            }

            if (!Schema::hasColumn('game_sessions', 'stage_started_at')) {
                $table->timestamp('stage_started_at')->nullable()->after('completed_at');
            }

            if (!Schema::hasColumn('game_sessions', 'ends_at')) {
                $table->timestamp('ends_at')->nullable()->after('stage_started_at');
            }

            if (!Schema::hasColumn('game_sessions', 'stages_completed')) {
                $table->json('stages_completed')->nullable()->after('ends_at');
            }

            if (!Schema::hasColumn('game_sessions', 'total_score')) {
                $table->integer('total_score')->default(0)->after('stages_completed');
            }

            if (!Schema::hasColumn('game_sessions', 'collaboration_score')) {
                $table->integer('collaboration_score')->default(0)->after('total_score');
            }

            if (!Schema::hasColumn('game_sessions', 'failed_stage')) {
                $table->integer('failed_stage')->nullable()->after('collaboration_score');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('game_sessions', function (Blueprint $table) {
            $columnsToCheck = [
                'stage_id',
                'seed', 
                'current_stage',
                'started_at',
                'completed_at',
                'stage_started_at',
                'ends_at',
                'stages_completed',
                'total_score',
                'collaboration_score',
                'failed_stage'
            ];

            foreach ($columnsToCheck as $column) {
                if (Schema::hasColumn('game_sessions', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
