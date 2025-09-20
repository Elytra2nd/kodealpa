<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
  public function up(): void {
    Schema::create('achievements', function (Blueprint $t) {
      $t->id();
      $t->string('key')->unique();
      $t->string('title');
      $t->text('description')->nullable();
      $t->string('icon')->nullable(); // e.g. 🏅
      $t->enum('rarity', ['common','uncommon','rare','epic','legendary'])->default('common');
      $t->json('criteria')->nullable(); // e.g. {"type":"no_hints_run"}
      $t->boolean('is_active')->default(true);
      $t->unsignedInteger('sort_order')->default(0);
      $t->timestamps();
    });
    Schema::create('user_achievements', function (Blueprint $t) {
      $t->id();
      $t->foreignId('user_id')->constrained()->cascadeOnDelete();
      $t->foreignId('achievement_id')->constrained('achievements')->cascadeOnDelete();
      $t->timestamp('unlocked_at')->nullable();
      $t->json('progress')->nullable(); // e.g. {"wins_in_row":2,"target":3}
      $t->json('meta')->nullable();
      $t->timestamps();
      $t->unique(['user_id','achievement_id']);
    });
  }
  public function down(): void {
    Schema::dropIfExists('user_achievements');
    Schema::dropIfExists('achievements');
  }
};
