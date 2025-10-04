<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tool_executions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dm_message_id')->constrained()->cascadeOnDelete();
            $table->foreignId('game_session_id')->constrained('game_sessions')->cascadeOnDelete();
            $table->foreignId('executed_by')->constrained('users')->cascadeOnDelete();
            $table->string('tool_name'); // assign_roles, summarize_round, suggest_pairs
            $table->json('arguments');
            $table->json('result')->nullable();
            $table->string('status')->default('pending'); // pending, success, failed
            $table->text('error_message')->nullable();
            $table->timestamps();

            $table->index(['game_session_id', 'tool_name']);
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tool_executions');
    }
};
