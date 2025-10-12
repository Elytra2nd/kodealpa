<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tournament_groups', function (Blueprint $table) {
            // Drop existing foreign key jika ada
            $table->dropForeign(['tournament_id']);

            // Tambahkan dengan cascade delete
            $table->foreign('tournament_id')
                  ->references('id')
                  ->on('tournaments')
                  ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::table('tournament_groups', function (Blueprint $table) {
            $table->dropForeign(['tournament_id']);

            // Restore tanpa cascade
            $table->foreign('tournament_id')
                  ->references('id')
                  ->on('tournaments');
        });
    }
};
