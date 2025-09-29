<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class UserSeeder extends Seeder
{
    public function run()
    {
        // Matikan foreign key sementara
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        User::truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        // Tambahkan user default
        User::create([
            'name' => 'Admin',
            'email' => 'admin@codealpha.com',
            'password' => Hash::make('password123'),
        ]);

        User::create([
            'name' => 'Player One',
            'email' => 'player1@codealpha.com',
            'password' => Hash::make('password123'),
        ]);
    }
}
