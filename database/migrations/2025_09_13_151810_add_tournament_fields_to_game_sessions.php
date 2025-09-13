<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up()
    {
        Schema::table('game_sessions', function (Blueprint $table) {
            // Check if columns don't exist before adding
            if (!Schema::hasColumn('game_sessions', 'tournament_id')) {
                $table->unsignedBigInteger('tournament_id')->nullable()->after('seed');
            }

            if (!Schema::hasColumn('game_sessions', 'tournament_group_id')) {
                $table->unsignedBigInteger('tournament_group_id')->nullable()->after('tournament_id');
            }

            if (!Schema::hasColumn('game_sessions', 'is_tournament_session')) {
                $table->boolean('is_tournament_session')->default(false)->after('tournament_group_id');
            }

            if (!Schema::hasColumn('game_sessions', 'tournament_round')) {
                $table->integer('tournament_round')->nullable()->after('is_tournament_session');
            }
        });

        // Add indexes using try-catch to handle duplicates
        try {
            DB::statement('CREATE INDEX gs_tournament_round ON game_sessions (tournament_id, tournament_round)');
        } catch (\Exception $e) {
            // Index might already exist, ignore
        }

        try {
            DB::statement('CREATE INDEX gs_tournament_status ON game_sessions (is_tournament_session, status)');
        } catch (\Exception $e) {
            // Index might already exist, ignore
        }
    }

    public function down()
    {
        // Drop indexes first
        try {
            DB::statement('DROP INDEX gs_tournament_round ON game_sessions');
        } catch (\Exception $e) {
            // Index might not exist, ignore
        }

        try {
            DB::statement('DROP INDEX gs_tournament_status ON game_sessions');
        } catch (\Exception $e) {
            // Index might not exist, ignore
        }

        Schema::table('game_sessions', function (Blueprint $table) {
            // Drop columns if they exist
            if (Schema::hasColumn('game_sessions', 'tournament_id')) {
                $table->dropColumn('tournament_id');
            }

            if (Schema::hasColumn('game_sessions', 'tournament_group_id')) {
                $table->dropColumn('tournament_group_id');
            }

            if (Schema::hasColumn('game_sessions', 'is_tournament_session')) {
                $table->dropColumn('is_tournament_session');
            }

            if (Schema::hasColumn('game_sessions', 'tournament_round')) {
                $table->dropColumn('tournament_round');
            }
        });
    }
};
