<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dm_conversations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('game_session_id')->constrained('game_sessions')->cascadeOnDelete();
            $table->string('status')->default('active'); // active, completed, archived
            $table->integer('total_tokens')->default(0);
            $table->decimal('estimated_cost', 10, 6)->default(0);
            $table->timestamps();

            $table->index(['game_session_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dm_conversations');
    }
};
