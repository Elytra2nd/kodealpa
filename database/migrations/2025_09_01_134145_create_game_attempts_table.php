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
        Schema::create('game_attempts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('game_session_id')->constrained('game_sessions')->cascadeOnDelete();
            $table->unsignedInteger('stage');
            $table->string('input', 255);
            $table->boolean('is_correct')->default(false);
            $table->string('puzzle_key')->nullable();
            $table->timestamps();

            // Indexes for better query performance
            $table->index(['game_session_id', 'stage']);
            $table->index('is_correct');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('game_attempts');
    }
};
