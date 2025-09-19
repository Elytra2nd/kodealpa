<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
  public function up(): void {
    Schema::create('grimoire_categories', function (Blueprint $table) {
      $table->id();
      $table->string('slug')->unique();
      $table->string('title');
      $table->string('icon')->nullable();
      $table->unsignedInteger('sort_order')->default(0);
      $table->timestamps();
    });
  }
  public function down(): void {
    Schema::dropIfExists('grimoire_categories');
  }
};
