<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('tournament_groups', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tournament_id');
            $table->string('name', 100);
            $table->enum('status', ['waiting', 'ready', 'playing', 'completed', 'eliminated', 'champion'])
                  ->default('waiting');
            $table->unsignedBigInteger('session_id')->nullable();
            $table->integer('completion_time')->nullable(); // in seconds
            $table->integer('score')->default(0);
            $table->integer('rank')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->foreign('tournament_id')->references('id')->on('tournaments')->onDelete('cascade');
            $table->foreign('session_id')->references('id')->on('game_sessions');

            $table->unique(['tournament_id', 'name']);
            $table->index(['tournament_id', 'status']);
            $table->index(['completion_time', 'score']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('tournament_groups');
    }
};
