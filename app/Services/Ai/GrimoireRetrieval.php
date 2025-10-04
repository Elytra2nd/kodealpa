<?php

namespace App\Services\Ai;

use App\Models\GameSession;
use Illuminate\Support\Facades\DB;

class GrimoireRetrieval
{
    /**
     * Get relevant grimoire context for AI system prompt
     */
    public function getContextForSession(GameSession $session): string
    {
        // Cek apakah ada tabel grimoire/grimoires
        $grimoires = collect();

        // Try grimoires table (plural)
        if (\Schema::hasTable('grimoires')) {
            $grimoires = DB::table('grimoires')
                ->where(function ($query) use ($session) {
                    // Filter by stage atau mission jika kolom ada
                    if (\Schema::hasColumn('grimoires', 'stage_id')) {
                        $query->where('stage_id', $session->stage_id);
                    }
                    if (\Schema::hasColumn('grimoires', 'mission_id')) {
                        $query->orWhere('mission_id', $session->stage->mission_id ?? null);
                    }
                })
                ->orWhere('category', 'general')
                ->limit(3)
                ->get();
        }

        // Fallback: try grimoire table (singular)
        if ($grimoires->isEmpty() && \Schema::hasTable('grimoire')) {
            $grimoires = DB::table('grimoire')->limit(3)->get();
        }

        // Jika tidak ada grimoire, return default context
        if ($grimoires->isEmpty()) {
            return $this->getDefaultContext($session);
        }

        // Build context dari grimoires
        $context = "=== CodeAlpha Dungeon Grimoire ===\n\n";

        foreach ($grimoires as $entry) {
            $title = $entry->title ?? $entry->name ?? 'Entry';
            $desc = $entry->description ?? $entry->content ?? '';

            $context .= "## {$title}\n";
            $context .= "{$desc}\n";

            if (isset($entry->rules)) {
                $context .= "Aturan: {$entry->rules}\n";
            }

            $context .= "\n";
        }

        return trim($context);
    }

    /**
     * Get default context jika tidak ada grimoire
     */
    private function getDefaultContext(GameSession $session): string
    {
        return <<<CONTEXT
=== CodeAlpha Dungeon Grimoire ===

## Tentang CodeAlpha Dungeon
CodeAlpha Dungeon adalah game edukasi kolaboratif berbasis peer learning.
Pemain bekerja sama dalam tim untuk menyelesaikan tantangan coding dan puzzle.

## Prinsip Pembelajaran
- Setiap anggota berkontribusi dengan perspektif unik
- Diskusi terbuka mendorong pemahaman lebih dalam
- Rotasi peran memastikan semua terlibat aktif
- Tidak ada jawaban langsung - tim harus menemukan solusi bersama

## Stage Saat Ini
Stage: {$session->current_stage}
Total pemain: (cek dari session participants)

## Peran AI Facilitator
Tugasmu adalah memfasilitasi diskusi, bukan memberi jawaban.
Stimulasi pemikiran kritis dengan pertanyaan terbuka.
CONTEXT;
    }
}
