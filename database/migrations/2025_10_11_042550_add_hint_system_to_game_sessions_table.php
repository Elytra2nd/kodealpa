<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('game_sessions', function (Blueprint $table) {
            // Hint tracking columns
            $table->json('hint_usage')->nullable()->after('attempts');
            $table->integer('max_hints_per_stage')->default(3)->after('hint_usage');
            $table->integer('total_hints_used')->default(0)->after('max_hints_per_stage');
        });
    }

    public function down()
    {
        Schema::table('game_sessions', function (Blueprint $table) {
            $table->dropColumn(['hint_usage', 'max_hints_per_stage', 'total_hints_used']);
        });
    }
};
