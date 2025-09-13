<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('tournaments', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->enum('status', ['waiting', 'qualification', 'semifinals', 'finals', 'completed', 'cancelled'])
                  ->default('waiting');
            $table->integer('current_round')->default(1);
            $table->integer('max_groups')->default(4);
            $table->unsignedBigInteger('created_by');
            $table->json('tournament_rules')->nullable();
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->unsignedBigInteger('winner_group_id')->nullable();
            $table->timestamps();
            $table->softDeletes();

            // HANYA foreign key ke users (yang sudah ada)
            $table->foreign('created_by')->references('id')->on('users');

            // INDEX untuk winner_group_id (foreign key akan ditambahkan nanti)
            $table->index('winner_group_id');
            $table->index(['status', 'created_at']);
            $table->index(['created_by', 'status']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('tournaments');
    }
};
