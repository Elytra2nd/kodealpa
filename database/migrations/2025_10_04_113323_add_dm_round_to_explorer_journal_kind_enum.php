<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Add 'dm_round' to kind enum
        DB::statement("ALTER TABLE explorer_journal MODIFY COLUMN kind ENUM('session', 'tournament', 'achievement', 'dm_round') NOT NULL");
    }

    public function down(): void
    {
        // Revert to original enum values
        DB::statement("ALTER TABLE explorer_journal MODIFY COLUMN kind ENUM('session', 'tournament', 'achievement') NOT NULL");
    }
};
