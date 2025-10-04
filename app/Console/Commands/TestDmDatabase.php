<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\{DmConversation, DmMessage, ExplorerJournal, ToolExecution, GameSession, User};
use Illuminate\Support\Facades\DB;

class TestDmDatabase extends Command
{
    protected $signature = 'dm:test {--keep : Keep test data instead of rolling back}';
    protected $description = 'Test complete DM database setup';

    public function handle()
    {
        $this->info('🧪 Testing DM Database Setup...');
        $this->newLine();

        DB::beginTransaction();

        try {
            // 1. Check ENUM
            $this->info('1️⃣ Checking kind ENUM...');
            $kindColumn = DB::select("SHOW COLUMNS FROM explorer_journal WHERE Field = 'kind'")[0];
            $this->line("   Type: {$kindColumn->Type}");

            if (!str_contains($kindColumn->Type, 'dm_round')) {
                $this->error('   ❌ dm_round not in ENUM! Run migration first.');
                return Command::FAILURE;
            }
            $this->line('   ✅ dm_round exists in ENUM');
            $this->newLine();

            // 2. Create or get test data
            $this->info('2️⃣ Preparing test data...');

            // Get or create GameSession
            $session = GameSession::first();
            if (!$session) {
                $this->warn('   ⚠️  No GameSession found. Creating one...');

                try {
                    $session = GameSession::create([
                        'team_code' => 'DM' . str_pad(rand(1, 999999), 6, '0', STR_PAD_LEFT),
                        'status' => 'active',
                        'current_stage' => 1,
                        'is_tournament_session' => false,
                        'stages_completed' => 0,
                        'total_score' => 0,
                        'started_at' => now(),
                    ]);
                    $this->line("   ✅ Created GameSession: {$session->id} (code: {$session->team_code})");
                } catch (\Exception $e) {
                    $this->error("   ❌ Failed to create GameSession: {$e->getMessage()}");
                    return Command::FAILURE;
                }
            } else {
                $this->line("   ✅ Using GameSession: {$session->id}");
            }

            // Get or create User
            $user = User::first();
            if (!$user) {
                $this->warn('   ⚠️  No User found. Creating one...');
                $user = User::create([
                    'name' => 'Test User',
                    'email' => 'test@kodealpa.test',
                    'password' => bcrypt('password'),
                ]);
                $this->line("   ✅ Created User: {$user->id}");
            } else {
                $this->line("   ✅ Using User: {$user->id}");
            }

            $this->newLine();

            // 3. Create DM data
            $this->info('3️⃣ Creating DM data...');

            $conversation = DmConversation::create([
                'game_session_id' => $session->id,
                'status' => 'active',
                'total_tokens' => 0,
                'estimated_cost' => 0
            ]);
            $this->line("   ✅ DmConversation: {$conversation->id}");

            $userMessage = DmMessage::create([
                'dm_conversation_id' => $conversation->id,
                'user_id' => $user->id,
                'role' => 'user',
                'content' => 'Bantu kami memahami konsep variable!',
                'tokens_used' => 10
            ]);
            $this->line("   ✅ DmMessage (user): {$userMessage->id}");

            $aiMessage = DmMessage::create([
                'dm_conversation_id' => $conversation->id,
                'role' => 'assistant',
                'content' => 'Tentu! Mari kita mulai dengan pertanyaan: Apa yang kalian ketahui tentang penyimpanan data dalam program?',
                'tokens_used' => 25
            ]);
            $this->line("   ✅ DmMessage (assistant): {$aiMessage->id}");

            $journal = ExplorerJournal::create([
                'dm_conversation_id' => $conversation->id,
                'user_id' => $user->id,
                'kind' => 'dm_round',
                'title' => 'Ronde 1: Eksplorasi Konsep Variable',
                'status' => 'completed',
                'meta' => [
                    'hypotheses' => [
                        'Variable adalah tempat penyimpanan data',
                        'Variable bisa berubah nilainya'
                    ],
                    'decisions' => 'Tim setuju untuk mulai dari contoh sederhana',
                    'next_actions' => 'Coba implementasi variable dalam kode'
                ],
                'metadata' => [
                    'participants' => 3,
                    'duration_minutes' => 15
                ]
            ]);
            $this->line("   ✅ ExplorerJournal: {$journal->id}");

            $toolExecution = ToolExecution::create([
                'dm_message_id' => $aiMessage->id,
                'game_session_id' => $session->id,
                'executed_by' => $user->id,
                'tool_name' => 'summarize_round',
                'arguments' => [
                    'session_id' => $session->id,
                    'hypotheses' => ['Hipotesis 1', 'Hipotesis 2']
                ],
                'result' => ['journal_id' => $journal->id],
                'status' => 'success'
            ]);
            $this->line("   ✅ ToolExecution: {$toolExecution->id}");

            $this->newLine();

            // 4. Test relationships
            $this->info('4️⃣ Testing relationships...');

            $messagesCount = $conversation->messages->count();
            $this->line("   ✅ Conversation has {$messagesCount} messages");

            $journalsCount = $conversation->journals->count();
            $this->line("   ✅ Conversation has {$journalsCount} journals");

            $dmRoundsCount = ExplorerJournal::dmRounds()->count();
            $this->line("   ✅ Found {$dmRoundsCount} DM rounds");

            $toolExecutionsCount = $aiMessage->toolExecutions->count();
            $this->line("   ✅ Message has {$toolExecutionsCount} tool executions");

            $this->newLine();

            // 5. Test helper methods
            $this->info('5️⃣ Testing helper methods...');

            $recentMessages = $conversation->getRecentMessages(5);
            $this->line("   ✅ getRecentMessages: " . count($recentMessages) . " messages");

            $this->newLine();
            $this->info('✅ All tests passed!');
            $this->newLine();

            // Keep or rollback
            if ($this->option('keep')) {
                DB::commit();
                $this->info('💾 Test data saved to database');
                $this->table(
                    ['Resource', 'ID', 'Detail'],
                    [
                        ['GameSession', $session->id, "Code: {$session->team_code}"],
                        ['DmConversation', $conversation->id, "{$messagesCount} messages"],
                        ['ExplorerJournal', $journal->id, "Kind: dm_round"],
                    ]
                );
            } else {
                DB::rollBack();
                $this->warn('⚠️  Test data rolled back (use --keep to save)');
            }

            return Command::SUCCESS;

        } catch (\Exception $e) {
            DB::rollBack();
            $this->error('❌ Test failed: ' . $e->getMessage());
            $this->line('');
            $this->error('Stack trace:');
            $this->line($e->getTraceAsString());
            return Command::FAILURE;
        }
    }
}
