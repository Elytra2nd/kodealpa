<?php
// database/migrations/xxxx_create_game_participants_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('game_participants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('game_session_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('role', ['host', 'defuser', 'expert']);
            $table->string('nickname', 50);
            $table->timestamp('joined_at');
            $table->timestamps();

            $table->unique(['game_session_id', 'user_id']);
            $table->unique(['game_session_id', 'role']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('game_participants');
    }
};
