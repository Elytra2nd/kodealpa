<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('tournament_participants', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tournament_group_id');
            $table->unsignedBigInteger('user_id');
            $table->enum('role', ['defuser', 'expert']);
            $table->string('nickname', 50);
            $table->timestamp('joined_at');
            $table->timestamps();

            $table->foreign('tournament_group_id')->references('id')->on('tournament_groups')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users');

            $table->unique(['tournament_group_id', 'user_id']);
            $table->unique(['tournament_group_id', 'role']);
            $table->index(['user_id', 'joined_at']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('tournament_participants');
    }
};
