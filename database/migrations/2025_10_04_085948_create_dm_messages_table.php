<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dm_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dm_conversation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->enum('role', ['user', 'assistant', 'system']);
            $table->text('content');
            $table->json('tool_calls')->nullable();
            $table->integer('tokens_used')->nullable();
            $table->timestamps();

            $table->index(['dm_conversation_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dm_messages');
    }
};
