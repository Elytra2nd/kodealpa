// resources/js/Pages/Game/ExplorerJournal.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import type { JournalItem, Paginated, JournalKind } from '@/services/journalApi';
import { journalApi } from '@/services/journalApi';

export default function ExplorerJournalPage() {
  const [items, setItems] = useState<Paginated<JournalItem> | null>(null);
  const [stats, setStats] = useState<Record<string, number|null>>({});
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<JournalKind | 'all'>('all');
  const [status, setStatus] = useState<string | 'all'>('all');
  const [loading, setLoading] = useState(true);

  const load = async (page?: number) => {
    setLoading(true);
    const params: any = {};
    if (q) params.q = q;
    if (kind !== 'all') params.kind = kind;
    if (status !== 'all') params.status = status;
    if (page) params.page = page;

    const [listRes, statsRes] = await Promise.all([
      journalApi.list(params),
      journalApi.stats(),
    ]);
    setItems(listRes.journal);
    setStats(statsRes.stats);
    setLoading(false);
  };

  useEffect(() => { load(); }, []); // initial

  const onSearch = () => load();
  const onClear = () => { setQ(''); setKind('all'); setStatus('all'); load(); };

  const rows = items?.data ?? [];

  return (
    <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-amber-300">📓 Catatan Penjelajah</h2>}>
      <Head title="Catatan Penjelajah" />
      <div className="min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950 py-10">
        <div className="mx-auto max-w-7xl sm:px-6 lg:px-8 space-y-6">
          <Card className="border-3 border-amber-700 bg-stone-900/30">
            <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <CardTitle className="text-amber-300">Jejak Perjalanan dan Pencapaian</CardTitle>
              <div className="flex items-center gap-2">
                <Badge className="bg-stone-800 text-stone-200">Runs: {stats.total_runs ?? 0}</Badge>
                <Badge className="bg-stone-800 text-stone-200">Wins: {stats.wins ?? 0}</Badge>
                <Badge className="bg-stone-800 text-stone-200">Best: {stats.best_time ?? 0}s</Badge>
                <Badge className="bg-stone-800 text-stone-200">Accuracy: {stats.avg_accuracy ? `${Number(stats.avg_accuracy).toFixed(1)}%` : '-'}</Badge>
                <Badge className="bg-stone-800 text-stone-200">Tournaments: {stats.tournaments_played ?? 0}</Badge>
                <Badge className="bg-stone-800 text-stone-200">Achievements: {stats.achievements ?? 0}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Cari judul..." />
                <Select value={kind} onValueChange={(v)=>setKind(v as any)}>
                  <SelectTrigger><SelectValue placeholder="Jenis" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Jenis</SelectItem>
                    <SelectItem value="session">Sesi</SelectItem>
                    <SelectItem value="tournament">Turnamen</SelectItem>
                    <SelectItem value="achievement">Pencapaian</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={status} onValueChange={(v)=>setStatus(v)}>
                  <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="success">Sukses</SelectItem>
                    <SelectItem value="failed">Gagal</SelectItem>
                    <SelectItem value="completed">Selesai</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button onClick={onSearch} className="bg-amber-600 hover:bg-amber-700">Cari</Button>
                  <Button onClick={onClear} variant="outline">Reset</Button>
                </div>
              </div>

              {/* Table */}
              <div className="rounded-lg border border-stone-700 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Waktu</TableHead>
                      <TableHead>Jenis</TableHead>
                      <TableHead>Judul</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Skor</TableHead>
                      <TableHead className="text-right">Waktu (s)</TableHead>
                      <TableHead className="text-right">Akurasi</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading && (
                      <TableRow><TableCell colSpan={8} className="text-center text-stone-300">Memuat...</TableCell></TableRow>
                    )}
                    {!loading && rows.length === 0 && (
                      <TableRow><TableCell colSpan={8} className="text-center text-stone-300">Belum ada catatan.</TableCell></TableRow>
                    )}
                    {!loading && rows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{new Date(r.created_at).toLocaleString()}</TableCell>
                        <TableCell><Badge className="bg-stone-800 text-stone-200">{r.kind}</Badge></TableCell>
                        <TableCell className="max-w-[280px] truncate">{r.title}</TableCell>
                        <TableCell>{r.status ?? '-'}</TableCell>
                        <TableCell className="text-right">{r.score ?? '-'}</TableCell>
                        <TableCell className="text-right">{r.time_taken ?? '-'}</TableCell>
                        <TableCell className="text-right">{typeof r.accuracy === 'number' ? `${r.accuracy.toFixed(1)}%` : '-'}</TableCell>
                        <TableCell className="text-right">
                          <Link href={`/api/journal/${r.id}`} className="text-amber-300 hover:underline">Detail</Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination (gunakan Link dari items.links) */}
              <div className="flex justify-center gap-2">
                {items?.links?.map((l, idx) => {
                  const disabled = !l.url;
                  const label = l.label.replace('&laquo;','«').replace('&raquo;','»');
                  return (
                    <Link
                      key={idx}
                      href={l.url || '#'}
                      preserveState
                      onClick={(e)=>{ if (!l.url) e.preventDefault(); }}
                      className={`px-3 py-2 rounded border ${l.active ? 'border-amber-600 text-amber-300' : 'border-stone-700 text-stone-300'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-amber-600'}`}
                    >
                      {label}
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
