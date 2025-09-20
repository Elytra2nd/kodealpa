// resources/js/Pages/Game/ExplorerJournalDetail.tsx
import React, { useEffect, useState } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/Components/ui/card';
import type { JournalItem } from '@/services/journalApi';
import { journalApi } from '@/services/journalApi';

export default function ExplorerJournalDetail({ id }: { id: number }) {
  const page = usePage() as any;
  const effectiveId = id || page?.props?.id;
  const [entry, setEntry] = useState<JournalItem | null>(null);

  useEffect(() => {
    if (effectiveId) {
      journalApi.show(Number(effectiveId)).then((res) => setEntry(res.entry));
    }
  }, [effectiveId]);

  return (
    <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-amber-300">🗒️ Detail Catatan</h2>}>
      <Head title={entry ? entry.title : 'Detail Catatan'} />
      <div className="min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950 py-10">
        <div className="mx-auto max-w-3xl sm:px-6 lg:px-8 space-y-6">
          <Card className="border-3 border-amber-700 bg-stone-900/30">
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="text-amber-300">{entry?.title ?? 'Memuat...'}</CardTitle>
              <Link href="/game/journal" className="text-amber-300 hover:underline">← Kembali</Link>
            </CardHeader>
            <CardContent className="text-stone-200 space-y-2">
              {entry && (
                <>
                  <div>Jenis: {entry.kind}</div>
                  <div>Status: {entry.status ?? '-'}</div>
                  <div>Skor: {entry.score ?? '-'}</div>
                  <div>Waktu: {entry.time_taken ?? '-'} detik</div>
                  <div>Akurasi: {typeof entry.accuracy === 'number' ? `${entry.accuracy.toFixed(1)}%` : '-'}</div>
                  <div>Hints: {entry.hints_used ?? '-'}</div>
                  <pre className="mt-4 p-3 rounded bg-stone-800 overflow-auto">
                    {JSON.stringify(entry.meta ?? {}, null, 2)}
                  </pre>
                </>
              )}
              {!entry && <div>Memuat...</div>}
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
