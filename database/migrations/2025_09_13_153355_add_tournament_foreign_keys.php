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
        // Tambahkan foreign key constraints setelah semua tabel dibuat

        // 1. Tournament -> TournamentGroup (winner)
        Schema::table('tournaments', function (Blueprint $table) {
            $table->foreign('winner_group_id')
                  ->references('id')
                  ->on('tournament_groups')
                  ->nullOnDelete();
        });

        // 2. TournamentMatch foreign keys
        if (Schema::hasTable('tournament_matches')) {
            Schema::table('tournament_matches', function (Blueprint $table) {
                // Pastikan foreign key belum ada
                try {
                    $table->foreign('tournament_id')
                          ->references('id')
                          ->on('tournaments')
                          ->onDelete('cascade');
                } catch (\Exception $e) {
                    // Foreign key sudah ada, skip
                }

                try {
                    $table->foreign('group1_id')
                          ->references('id')
                          ->on('tournament_groups')
                          ->onDelete('cascade');
                } catch (\Exception $e) {
                    // Foreign key sudah ada, skip
                }

                try {
                    $table->foreign('group2_id')
                          ->references('id')
                          ->on('tournament_groups')
                          ->onDelete('cascade');
                } catch (\Exception $e) {
                    // Foreign key sudah ada, skip
                }

                try {
                    $table->foreign('winner_group_id')
                          ->references('id')
                          ->on('tournament_groups')
                          ->nullOnDelete();
                } catch (\Exception $e) {
                    // Foreign key sudah ada, skip
                }
            });
        }

        // 3. GameSession tournament foreign keys
        if (Schema::hasTable('game_sessions') && Schema::hasColumn('game_sessions', 'tournament_id')) {
            Schema::table('game_sessions', function (Blueprint $table) {
                try {
                    $table->foreign('tournament_id')
                          ->references('id')
                          ->on('tournaments')
                          ->nullOnDelete();
                } catch (\Exception $e) {
                    // Foreign key sudah ada, skip
                }

                try {
                    $table->foreign('tournament_group_id')
                          ->references('id')
                          ->on('tournament_groups')
                          ->nullOnDelete();
                } catch (\Exception $e) {
                    // Foreign key sudah ada, skip
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop foreign keys in reverse order

        // GameSession foreign keys
        if (Schema::hasTable('game_sessions')) {
            Schema::table('game_sessions', function (Blueprint $table) {
                $table->dropForeign(['tournament_id']);
                $table->dropForeign(['tournament_group_id']);
            });
        }

        // TournamentMatch foreign keys
        if (Schema::hasTable('tournament_matches')) {
            Schema::table('tournament_matches', function (Blueprint $table) {
                $table->dropForeign(['tournament_id']);
                $table->dropForeign(['group1_id']);
                $table->dropForeign(['group2_id']);
                $table->dropForeign(['winner_group_id']);
            });
        }

        // Tournament foreign keys
        Schema::table('tournaments', function (Blueprint $table) {
            $table->dropForeign(['winner_group_id']);
        });
    }
};
