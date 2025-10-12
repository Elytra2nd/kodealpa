<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tournament_participants', function (Blueprint $table) {
            // Drop existing foreign keys
            try {
                $table->dropForeign(['tournament_group_id']);
            } catch (\Exception $e) {
                // Continue
            }

            try {
                $table->dropForeign(['user_id']);
            } catch (\Exception $e) {
                // Continue
            }

            // Add with cascade
            $table->foreign('tournament_group_id')
                  ->references('id')
                  ->on('tournament_groups')
                  ->onDelete('cascade');

            // User tetap ada meskipun participant dihapus
            $table->foreign('user_id')
                  ->references('id')
                  ->on('users')
                  ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::table('tournament_participants', function (Blueprint $table) {
            $table->dropForeign(['tournament_group_id']);
            $table->dropForeign(['user_id']);

            $table->foreign('tournament_group_id')
                  ->references('id')
                  ->on('tournament_groups');

            $table->foreign('user_id')
                  ->references('id')
                  ->on('users');
        });
    }
};
