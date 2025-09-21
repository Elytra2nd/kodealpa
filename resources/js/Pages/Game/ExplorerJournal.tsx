// resources/js/Pages/Game/ExplorerJournal.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Head, router } from '@inertiajs/react'; // NOTE: gunakan router, hapus Link
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Separator } from '@/Components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/Components/ui/tooltip';
import { Skeleton } from '@/Components/ui/skeleton';

import { Search, RefreshCw, Trophy, Timer, Target, Award, Layers } from 'lucide-react';

import type { JournalItem, Paginated, JournalKind } from '@/services/journalApi';
import { journalApi } from '@/services/journalApi';

export default function ExplorerJournalPage() {
  const [items, setItems] = useState<Paginated<JournalItem> | null>(null);
  const [stats, setStats] = useState<Record<string, number | null>>({});
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

    const [listRes, statsRes] = await Promise.all([journalApi.list(params), journalApi.stats()]);
    setItems(listRes.journal);
    setStats(statsRes.stats);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const onSearch = () => load();
  const onClear = () => {
    setQ('');
    setKind('all');
    setStatus('all');
    load();
  };

  const rows = items?.data ?? [];

  // Placeholder skeleton rows
  const skeletonRows = useMemo(() => Array.from({ length: 6 }), []);

  return (
    <AuthenticatedLayout
      header={
        <h2 className="text-xl font-semibold leading-tight text-amber-300 inline-flex items-center gap-2">
          📓 Catatan Penjelajah
          <span className="relative inline-block">
            <span className="absolute -top-1 -right-2 size-2 rounded-full bg-amber-400 motion-safe:animate-ping" />
          </span>
        </h2>
      }
    >
      <Head title="Catatan Penjelajah" />
      <div className="relative min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950 py-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.10),transparent_55%)]" />
        <div className="mx-auto max-w-7xl sm:px-6 lg:px-8 space-y-6">
          <Card
            className="border-4 border-amber-700/70 bg-stone-900/40 backdrop-blur-sm shadow-xl
                       animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300"
          >
            <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <CardTitle className="text-amber-300">Jejak Perjalanan dan Pencapaian</CardTitle>
                <CardDescription className="text-stone-400">Filter, telusuri, dan buka detail catatan</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge className="bg-stone-800 text-stone-200 border border-stone-700 inline-flex items-center gap-1">
                        <Layers className="size-3 text-amber-400" />
                        Runs: {stats.total_runs ?? 0}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent className="bg-stone-900 border-stone-700 text-stone-200">
                      Total percobaan
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <Badge className="bg-stone-800 text-stone-200 border border-stone-700 inline-flex items-center gap-1">
                  <Trophy className="size-3 text-emerald-400" />
                  Wins: {stats.wins ?? 0}
                </Badge>

                <Badge className="bg-stone-800 text-stone-200 border border-stone-700 inline-flex items-center gap-1">
                  <Timer className="size-3 text-amber-400" />
                  Best: {stats.best_time ?? 0}s
                </Badge>

                <Badge className="bg-stone-800 text-stone-200 border border-stone-700 inline-flex items-center gap-1">
                  <Target className="size-3 text-sky-400" />
                  Accuracy: {stats.avg_accuracy ? `${Number(stats.avg_accuracy).toFixed(1)}%` : '-'}
                </Badge>

                <Badge className="bg-stone-800 text-stone-200 border border-stone-700 inline-flex items-center gap-1">
                  <Award className="size-3 text-purple-400" />
                  Tournaments: {stats.tournaments_played ?? 0}
                </Badge>

                <Badge className="bg-stone-800 text-stone-200 border border-stone-700 inline-flex items-center gap-1">
                  <Award className="size-3 text-pink-400" />
                  Achievements: {stats.achievements ?? 0}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* Filters */}
              <div
                className="rounded-xl border border-stone-700/60 bg-stone-900/50 p-4
                           animate-in fade-in slide-in-from-top-4 duration-300"
              >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="relative">
                    <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
                    <Input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') onSearch();
                      }}
                      placeholder="Cari judul..."
                      className="pl-9 focus:ring-amber-500"
                    />
                  </div>

                  <Select value={kind} onValueChange={(v) => setKind(v as any)}>
                    <SelectTrigger className="focus:ring-amber-500">
                      <SelectValue placeholder="Jenis" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Jenis</SelectItem>
                      <SelectItem value="session">Sesi</SelectItem>
                      <SelectItem value="tournament">Turnamen</SelectItem>
                      <SelectItem value="achievement">Pencapaian</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={status} onValueChange={(v) => setStatus(v)}>
                    <SelectTrigger className="focus:ring-amber-500">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Status</SelectItem>
                      <SelectItem value="success">Sukses</SelectItem>
                      <SelectItem value="failed">Gagal</SelectItem>
                      <SelectItem value="completed">Selesai</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex gap-2">
                    <Button
                      onClick={onSearch}
                      className="bg-amber-600 hover:bg-amber-700 transition-colors"
                    >
                      Cari
                    </Button>
                    <Button onClick={onClear} variant="outline" className="gap-2">
                      <RefreshCw className="size-4" />
                      Reset
                    </Button>
                  </div>
                </div>
              </div>

              <Separator className="bg-stone-800" />

              {/* Table */}
              <div
                className="rounded-xl border border-stone-700/80 overflow-hidden bg-stone-900/40
                           animate-in fade-in slide-in-from-bottom-4 duration-300"
              >
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-stone-900/60">
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
                    {loading &&
                      skeletonRows.map((_, idx) => (
                        <TableRow key={`sk-${idx}`} className="hover:bg-transparent">
                          <TableCell><Skeleton className="h-4 w-40 bg-stone-800" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-20 bg-stone-800" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-64 bg-stone-800" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24 bg-stone-800" /></TableCell>
                          <TableCell className="text-right"><Skeleton className="h-4 w-10 bg-stone-800 ml-auto" /></TableCell>
                          <TableCell className="text-right"><Skeleton className="h-4 w-12 bg-stone-800 ml-auto" /></TableCell>
                          <TableCell className="text-right"><Skeleton className="h-4 w-12 bg-stone-800 ml-auto" /></TableCell>
                          <TableCell className="text-right"><Skeleton className="h-8 w-20 bg-stone-800 ml-auto" /></TableCell>
                        </TableRow>
                      ))}

                    {!loading && rows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-stone-300 py-10">
                          Belum ada catatan.
                        </TableCell>
                      </TableRow>
                    )}

                    {!loading &&
                      rows.map((r) => (
                        <TableRow
                          key={r.id}
                          className="group transition-colors hover:bg-stone-800/40"
                        >
                          <TableCell>{new Date(r.created_at).toLocaleString()}</TableCell>

                          <TableCell>
                            <Badge className="bg-stone-800 text-stone-200 border border-stone-700">
                              {r.kind}
                            </Badge>
                          </TableCell>

                          <TableCell className="max-w-[320px] truncate">
                            <span className="text-stone-100">{r.title}</span>
                          </TableCell>

                          <TableCell>
                            {r.status ? (
                              <Badge
                                className={[
                                  'border',
                                  r.status === 'success'
                                    ? 'bg-emerald-900/60 text-emerald-200 border-emerald-800'
                                    : r.status === 'failed'
                                    ? 'bg-red-900/60 text-red-200 border-red-800'
                                    : 'bg-stone-800 text-stone-200 border-stone-700',
                                ].join(' ')}
                              >
                                {r.status}
                              </Badge>
                            ) : (
                              '-'
                            )}
                          </TableCell>

                          <TableCell className="text-right">{r.score ?? '-'}</TableCell>
                          <TableCell className="text-right">{r.time_taken ?? '-'}</TableCell>
                          <TableCell className="text-right">
                            {typeof r.accuracy === 'number' ? `${r.accuracy.toFixed(1)}%` : '-'}
                          </TableCell>

                          <TableCell className="text-right">
                            {/* FIX: hindari asChild untuk Link, gunakan router.visit */}
                            <Button
                              variant="secondary"
                              className="bg-stone-800 hover:bg-stone-700 text-stone-100"
                              onClick={() => router.visit(`/game/journal/${r.id}`)}
                            >
                              Detail
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex justify-center gap-2 animate-in fade-in duration-300">
                {items?.links?.map((l, idx) => {
                  const disabled = !l.url;
                  const label = l.label.replace('&laquo;', '«').replace('&raquo;', '»');
                  const active = l.active;

                  return (
                    <Button
                      key={idx}
                      variant={active ? 'default' : 'outline'}
                      disabled={disabled}
                      className={[
                        active
                          ? 'bg-amber-600 hover:bg-amber-700 text-stone-900'
                          : 'border-stone-700 text-stone-300 hover:border-amber-600',
                        disabled ? 'opacity-50 cursor-not-allowed' : '',
                      ].join(' ')}
                      onClick={() => {
                        if (l.url) router.visit(l.url, { preserveState: true });
                      }}
                    >
                      {label}
                    </Button>
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
