<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tournament_matches', function (Blueprint $table) {
            // Drop existing foreign keys
            try {
                $table->dropForeign(['tournament_id']);
                $table->dropForeign(['group1_id']);
                $table->dropForeign(['group2_id']);
                $table->dropForeign(['winner_group_id']);
            } catch (\Exception $e) {
                // Continue
            }

            // Add with cascade
            $table->foreign('tournament_id')
                  ->references('id')
                  ->on('tournaments')
                  ->onDelete('cascade');

            $table->foreign('group1_id')
                  ->references('id')
                  ->on('tournament_groups')
                  ->onDelete('cascade');

            $table->foreign('group2_id')
                  ->references('id')
                  ->on('tournament_groups')
                  ->onDelete('cascade');

            $table->foreign('winner_group_id')
                  ->references('id')
                  ->on('tournament_groups')
                  ->onDelete('set null'); // Winner bisa null
        });
    }

    public function down(): void
    {
        Schema::table('tournament_matches', function (Blueprint $table) {
            $table->dropForeign(['tournament_id']);
            $table->dropForeign(['group1_id']);
            $table->dropForeign(['group2_id']);
            $table->dropForeign(['winner_group_id']);

            // Restore tanpa cascade
            $table->foreign('tournament_id')->references('id')->on('tournaments');
            $table->foreign('group1_id')->references('id')->on('tournament_groups');
            $table->foreign('group2_id')->references('id')->on('tournament_groups');
            $table->foreign('winner_group_id')->references('id')->on('tournament_groups');
        });
    }
};
