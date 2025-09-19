import React from 'react';
import type { GrimoireEntry } from '@/types/grimoire';

// Konten diasumsikan HTML yang telah disanitasi di server
export default function GrimoireEntryView({ entry }: { entry: GrimoireEntry }) {
  return (
    <div className="p-4 rounded-lg border border-stone-700 bg-stone-900/40">
      <h3 className="text-amber-300 text-xl font-bold mb-2">{entry.title}</h3>
      {entry.summary && <p className="text-stone-400 mb-3">{entry.summary}</p>}
      <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: entry.content_html }} />
    </div>
  );
}
