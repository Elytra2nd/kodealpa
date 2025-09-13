<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('tournament_matches', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tournament_id');
            $table->integer('round');
            $table->string('match_name', 100);
            $table->unsignedBigInteger('group1_id');
            $table->unsignedBigInteger('group2_id');
            $table->unsignedBigInteger('winner_group_id')->nullable();
            $table->enum('status', ['pending', 'active', 'completed'])->default('pending');
            $table->integer('group1_completion_time')->nullable();
            $table->integer('group2_completion_time')->nullable();
            $table->json('match_details')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            // INDEX dengan nama pendek
            $table->index(['tournament_id', 'round'], 'tm_tournament_round_idx');
            $table->index(['status', 'started_at'], 'tm_status_started_idx');

            // UNIQUE constraint dengan nama custom yang pendek
            $table->unique(
                ['tournament_id', 'round', 'group1_id', 'group2_id'],
                'tm_unique_match'
            );
        });
    }

    public function down()
    {
        Schema::dropIfExists('tournament_matches');
    }
};
