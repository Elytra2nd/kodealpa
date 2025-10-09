<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class AdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Cek apakah admin sudah ada
        $adminExists = User::where('email', 'admin@kodealpa.com')->exists();

        if (!$adminExists) {
            User::create([
                'name' => 'Admin CodeAlpha',
                'email' => 'admin@kodealpa.com',
                'password' => Hash::make('Admin123!@#'),
                'email_verified_at' => now(),
            ]);

            $this->command->info('✓ Admin user created successfully!');
            $this->command->info('  Email: admin@kodealpa.com');
            $this->command->info('  Password: Admin123!@#');
        } else {
            $this->command->warn('⚠ Admin user already exists. Skipping...');
        }
    }
}
