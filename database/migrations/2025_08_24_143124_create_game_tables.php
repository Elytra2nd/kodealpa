<?php // database/migrations/2025_08_24_000001_create_game_tables.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('missions', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique(); // e.g., CODEALPHA-S1
            $table->string('title');
            $table->text('description')->nullable();
            $table->timestamps();
        });

        Schema::create('stages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('mission_id')->constrained()->cascadeOnDelete();
            $table->string('name'); // Symbol Cipher
            $table->json('config'); // {"timeLimit":180,"puzzles":[...]}
            $table->timestamps();
        });

        Schema::create('game_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stage_id')->constrained()->cascadeOnDelete();
            $table->string('team_code', 8)->unique(); // e.g., 4H9KQ2
            $table->enum('status', ['waiting','running','success','failed'])->default('waiting');
            $table->timestamp('started_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->timestamps();
        });

        Schema::create('session_participants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('game_session_id')->constrained()->cascadeOnDelete();
            $table->enum('role', ['defuser','expert']);
            $table->string('nickname');
            $table->timestamps();
        });

        Schema::create('attempts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('game_session_id')->constrained()->cascadeOnDelete();
            $table->string('puzzle_key'); // symbol-cipher-1
            $table->string('input');
            $table->boolean('is_correct')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void {
        Schema::dropIfExists('attempts');
        Schema::dropIfExists('session_participants');
        Schema::dropIfExists('game_sessions');
        Schema::dropIfExists('stages');
        Schema::dropIfExists('missions');
    }
};
