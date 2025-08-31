<?php
// database/migrations/add_stage_system_to_game_sessions.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('game_sessions', function (Blueprint $table) {
            $table->integer('current_stage')->default(1);
            $table->json('stages_completed')->nullable();
            $table->integer('total_score')->default(0);
            $table->timestamp('stage_started_at')->nullable();
            $table->integer('collaboration_score')->default(0);
        });

        Schema::table('game_attempts', function (Blueprint $table) {
            $table->integer('stage')->default(1);
        });
    }

    public function down()
    {
        Schema::table('game_sessions', function (Blueprint $table) {
            $table->dropColumn([
                'current_stage',
                'stages_completed',
                'total_score',
                'stage_started_at',
                'collaboration_score'
            ]);
        });

        Schema::table('game_attempts', function (Blueprint $table) {
            $table->dropColumn('stage');
        });
    }
};
