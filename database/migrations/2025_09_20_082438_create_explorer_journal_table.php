<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
  public function up(): void {
    Schema::create('explorer_journal', function (Blueprint $t) {
      $t->id();
      $t->foreignId('user_id')->constrained()->cascadeOnDelete();
      $t->enum('kind', ['session','tournament','achievement']);
      $t->unsignedBigInteger('ref_id')->nullable(); // session_id / tournament_id / achievement_id
      $t->string('title');
      $t->string('status')->nullable(); // success/failed/completed/etc
      $t->integer('score')->nullable();
      $t->integer('time_taken')->nullable(); // seconds
      $t->decimal('accuracy', 5, 2)->nullable();
      $t->integer('hints_used')->nullable();
      $t->json('meta')->nullable();
      $t->timestamps();
      $t->index(['user_id','kind','created_at']);
    });
  }
  public function down(): void {
    Schema::dropIfExists('explorer_journal');
  }
};
