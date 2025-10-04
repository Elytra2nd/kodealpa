<?php

namespace App\Services\Ai;

use App\Models\{GameSession, ExplorerJournal, ToolExecution, DmMessage};
use Illuminate\Support\Facades\DB;

class AiToolExecutor
{
    /**
     * Execute AI tool/function call
     */
    public function execute(string $functionName, array $arguments, ?DmMessage $message = null): array
    {
        return match($functionName) {
            'assign_roles' => $this->assignRoles($arguments, $message),
            'summarize_round' => $this->summarizeRound($arguments, $message),
            'suggest_pairs' => $this->suggestPairs($arguments, $message),
            default => ['error' => 'Unknown function: ' . $functionName]
        };
    }

    /**
     * Tool: Assign roles untuk peer learning
     */
    private function assignRoles(array $args, ?DmMessage $message): array
    {
        try {
            $session = GameSession::findOrFail($args['session_id']);

            // Simpan role assignments ke session metadata atau tabel terpisah
            // Untuk sekarang, simpan ke metadata session atau ke tabel player_roles

            $assignments = [];
            foreach ($args['roster'] as $assignment) {
                $assignments[] = [
                    'player_id' => $assignment['player_id'],
                    'role' => $assignment['role'],
                    'assigned_at' => now()
                ];
            }

            // Save to tool_executions
            if ($message) {
                ToolExecution::create([
                    'dm_message_id' => $message->id,
                    'game_session_id' => $session->id,
                    'executed_by' => auth()->id() ?? 1,
                    'tool_name' => 'assign_roles',
                    'arguments' => $args,
                    'result' => ['assignments' => $assignments],
                    'status' => 'success'
                ]);
            }

            // TODO: Broadcast event untuk update UI real-time
            // broadcast(new RolesAssigned($session, $assignments))->toOthers();

            return [
                'status' => 'success',
                'assigned_roles' => count($assignments),
                'assignments' => $assignments
            ];

        } catch (\Exception $e) {
            return ['error' => $e->getMessage()];
        }
    }

    /**
     * Tool: Summarize round untuk journal
     */
    private function summarizeRound(array $args, ?DmMessage $message): array
    {
        try {
            $session = GameSession::findOrFail($args['session_id']);

            // Create journal entry
            $journal = ExplorerJournal::create([
                'dm_conversation_id' => $message?->conversation->id,
                'user_id' => auth()->id() ?? null,
                'kind' => 'dm_round',
                'title' => 'Ronde ' . ($session->current_stage ?? 1) . ': ' . now()->format('H:i'),
                'status' => 'completed',
                'meta' => [
                    'hypotheses' => $args['hypotheses'] ?? [],
                    'decisions' => $args['decisions'] ?? '',
                    'next_actions' => $args['next_actions'] ?? '',
                    'timestamp' => now()->toISOString()
                ],
                'metadata' => [
                    'session_id' => $session->id,
                    'stage' => $session->current_stage,
                    'auto_generated' => true
                ]
            ]);

            // Save to tool_executions
            if ($message) {
                ToolExecution::create([
                    'dm_message_id' => $message->id,
                    'game_session_id' => $session->id,
                    'executed_by' => auth()->id() ?? 1,
                    'tool_name' => 'summarize_round',
                    'arguments' => $args,
                    'result' => ['journal_id' => $journal->id],
                    'status' => 'success'
                ]);
            }

            return [
                'status' => 'saved',
                'journal_id' => $journal->id,
                'title' => $journal->title
            ];

        } catch (\Exception $e) {
            return ['error' => $e->getMessage()];
        }
    }

    /**
     * Tool: Suggest pairs untuk Think-Pair-Share
     */
    private function suggestPairs(array $args, ?DmMessage $message): array
    {
        try {
            $session = GameSession::findOrFail($args['session_id']);
            $strategy = $args['pairing_strategy'] ?? 'random';

            // TODO: Get actual players from session
            // Untuk sekarang, return mock data
            $players = ['player1', 'player2', 'player3', 'player4'];

            $pairs = [];
            $shuffled = $players;

            if ($strategy === 'random') {
                shuffle($shuffled);
            }

            // Create pairs
            for ($i = 0; $i < count($shuffled); $i += 2) {
                if (isset($shuffled[$i + 1])) {
                    $pairs[] = [
                        'pair_id' => floor($i / 2) + 1,
                        'members' => [$shuffled[$i], $shuffled[$i + 1]]
                    ];
                }
            }

            // Save to tool_executions
            if ($message) {
                ToolExecution::create([
                    'dm_message_id' => $message->id,
                    'game_session_id' => $session->id,
                    'executed_by' => auth()->id() ?? 1,
                    'tool_name' => 'suggest_pairs',
                    'arguments' => $args,
                    'result' => ['pairs' => $pairs],
                    'status' => 'success'
                ]);
            }

            return [
                'status' => 'success',
                'strategy' => $strategy,
                'pairs' => $pairs
            ];

        } catch (\Exception $e) {
            return ['error' => $e->getMessage()];
        }
    }
}
