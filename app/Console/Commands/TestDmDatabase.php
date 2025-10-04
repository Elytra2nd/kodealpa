<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\{DmConversation, DmMessage, ExplorerJournal, ToolExecution, GameSession, User};
use Illuminate\Support\Facades\DB;

class TestDmDatabase extends Command
{
    protected $signature = 'dm:test';
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

            // 2. Create test data
            $this->info('2️⃣ Creating test data...');

            $session = GameSession::first();
            if (!$session) {
                $this->error('   ❌ No GameSession found. Create one first.');
                return Command::FAILURE;
            }
            $this->line("   ✅ GameSession: {$session->id}");

            $conversation = DmConversation::create([
                'game_session_id' => $session->id,
                'status' => 'active',
                'total_tokens' => 0,
                'estimated_cost' => 0
            ]);
            $this->line("   ✅ DmConversation: {$conversation->id}");

            $user = User::first();

            $userMessage = DmMessage::create([
                'dm_conversation_id' => $conversation->id,
                'user_id' => $user->id ?? 1,
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
                'user_id' => $user->id ?? 1,
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
                'executed_by' => $user->id ?? 1,
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

            // 3. Test relationships
            $this->info('3️⃣ Testing relationships...');

            $messagesCount = $conversation->messages->count();
            $this->line("   ✅ Conversation has {$messagesCount} messages");

            $journalsCount = $conversation->journals->count();
            $this->line("   ✅ Conversation has {$journalsCount} journals");

            $dmRoundsCount = ExplorerJournal::dmRounds()->count();
            $this->line("   ✅ Found {$dmRoundsCount} DM rounds");

            $this->newLine();

            // 4. Test helper methods
            $this->info('4️⃣ Testing helper methods...');

            $recentMessages = $conversation->getRecentMessages(5);
            $this->line("   ✅ getRecentMessages: " . count($recentMessages) . " messages");

            $this->newLine();
            $this->info('✅ All tests passed!');
            $this->newLine();

            // Rollback test data
            DB::rollBack();
            $this->warn('⚠️  Test data rolled back (not saved to database)');

            return Command::SUCCESS;

        } catch (\Exception $e) {
            DB::rollBack();
            $this->error('❌ Test failed: ' . $e->getMessage());
            $this->error('Stack trace: ' . $e->getTraceAsString());
            return Command::FAILURE;
        }
    }
}
