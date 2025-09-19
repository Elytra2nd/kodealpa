<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
  public function up(): void {
    Schema::create('grimoire_entries', function (Blueprint $table) {
      $table->id();
      $table->foreignId('category_id')->constrained('grimoire_categories')->cascadeOnDelete();
      $table->string('slug')->unique();
      $table->string('title');
      $table->string('summary')->nullable();
      $table->text('content_html'); // output Tiptap yang disanitasi
      $table->json('tags')->nullable();
      $table->enum('role_access', ['defuser','expert','all'])->default('all');
      $table->enum('difficulty', ['beginner','intermediate','advanced'])->default('beginner');
      $table->boolean('is_published')->default(true);
      $table->unsignedInteger('version')->default(1);
      $table->timestamps();
      $table->index(['category_id', 'role_access', 'is_published']);
    });
  }
  public function down(): void {
    Schema::dropIfExists('grimoire_entries');
  }
};
