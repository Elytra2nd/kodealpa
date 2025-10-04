<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Route;

class TestDmRoutes extends Command
{
    protected $signature = 'dm:test-routes';
    protected $description = 'Test DM routes configuration';

    public function handle()
    {
        $this->info('🧪 Testing DM Routes...');
        $this->newLine();

        $routes = [
            'game.dm' => ['GET', '/game/dm'],
            'game.dm.message' => ['POST', '/game/dm/message'],
            'game.dm.stream' => ['GET', '/game/dm/stream'],
        ];

        $this->info('Registered DM Routes:');
        $this->newLine();

        foreach ($routes as $name => $details) {
            $route = Route::getRoutes()->getByName($name);

            if ($route) {
                $this->line("✅ {$name}");
                $this->line("   Method: {$details[0]}");
                $this->line("   URI: {$route->uri()}");
                $this->line("   Middleware: " . implode(', ', $route->gatherMiddleware()));
            } else {
                $this->error("❌ {$name} - NOT FOUND");
            }

            $this->newLine();
        }

        return Command::SUCCESS;
    }
}
