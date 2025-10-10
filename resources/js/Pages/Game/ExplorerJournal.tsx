// resources/js/Pages/Game/ExplorerJournal.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Head, router } from '@inertiajs/react';
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
  const skeletonRows = useMemo(() => Array.from({ length: 6 }), []);

  return (
    <AuthenticatedLayout
      header={
        <div className="inline-flex items-center gap-2">
          📓 Catatan Penjelajah
          <span className="relative inline-block">
            <span className="absolute -top-1 -right-2 size-2 rounded-full bg-amber-400 motion-safe:animate-ping" />
          </span>
        </div>
      }
    >
      <Head title="Catatan Penjelajah" />

      <div className="space-y-6">
        {/* Decorative background gradient overlay */}
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.10),transparent_55%)]" />

        {/* Stats Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="border-2 border-amber-700/50 bg-gradient-to-br from-stone-900 to-amber-950/20 hover:border-amber-600/70 transition-all duration-300 cursor-help">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2 bg-amber-900/30 rounded-lg">
                      <Layers className="size-5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-xs text-stone-400">Total Runs</p>
                      <p className="text-xl font-bold text-amber-300">{stats.total_runs ?? 0}</p>
                    </div>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent className="bg-stone-900 border-stone-700 text-stone-200">
                Total percobaan ekspedisi
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Card className="border-2 border-emerald-700/50 bg-gradient-to-br from-stone-900 to-emerald-950/20 hover:border-emerald-600/70 transition-all duration-300">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-emerald-900/30 rounded-lg">
                <Trophy className="size-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-stone-400">Kemenangan</p>
                <p className="text-xl font-bold text-emerald-300">{stats.wins ?? 0}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-amber-700/50 bg-gradient-to-br from-stone-900 to-amber-950/20 hover:border-amber-600/70 transition-all duration-300">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-amber-900/30 rounded-lg">
                <Timer className="size-5 text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-stone-400">Best Time</p>
                <p className="text-xl font-bold text-amber-300">{stats.best_time ?? 0}s</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-sky-700/50 bg-gradient-to-br from-stone-900 to-sky-950/20 hover:border-sky-600/70 transition-all duration-300">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-sky-900/30 rounded-lg">
                <Target className="size-5 text-sky-400" />
              </div>
              <div>
                <p className="text-xs text-stone-400">Akurasi</p>
                <p className="text-xl font-bold text-sky-300">
                  {stats.avg_accuracy ? `${Number(stats.avg_accuracy).toFixed(1)}%` : '-'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-700/50 bg-gradient-to-br from-stone-900 to-purple-950/20 hover:border-purple-600/70 transition-all duration-300">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-purple-900/30 rounded-lg">
                <Award className="size-5 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-stone-400">Turnamen</p>
                <p className="text-xl font-bold text-purple-300">{stats.tournaments_played ?? 0}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-pink-700/50 bg-gradient-to-br from-stone-900 to-pink-950/20 hover:border-pink-600/70 transition-all duration-300">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-pink-900/30 rounded-lg">
                <Award className="size-5 text-pink-400" />
              </div>
              <div>
                <p className="text-xs text-stone-400">Pencapaian</p>
                <p className="text-xl font-bold text-pink-300">{stats.achievements ?? 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Journal Card */}
        <Card className="border-4 border-amber-700/70 bg-stone-900/40 backdrop-blur-sm shadow-xl animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <CardTitle className="text-amber-300 text-xl flex items-center gap-2">
                  <span>📜</span>
                  Jejak Perjalanan dan Pencapaian
                </CardTitle>
                <CardDescription className="text-stone-400">
                  Filter, telusuri, dan buka detail catatan ekspedisi
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* Filters */}
            <div className="rounded-xl border border-stone-700/60 bg-stone-900/50 p-4 animate-in fade-in slide-in-from-top-4 duration-300">
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
                    className="pl-9 focus:ring-amber-500 bg-stone-800/50 border-stone-700"
                  />
                </div>

                <Select value={kind} onValueChange={(v) => setKind(v as any)}>
                  <SelectTrigger className="focus:ring-amber-500 bg-stone-800/50 border-stone-700">
                    <SelectValue placeholder="Jenis" />
                  </SelectTrigger>
                  <SelectContent className="bg-stone-900 border-stone-700">
                    <SelectItem value="all">Semua Jenis</SelectItem>
                    <SelectItem value="session">Sesi</SelectItem>
                    <SelectItem value="tournament">Turnamen</SelectItem>
                    <SelectItem value="achievement">Pencapaian</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={status} onValueChange={(v) => setStatus(v)}>
                  <SelectTrigger className="focus:ring-amber-500 bg-stone-800/50 border-stone-700">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-stone-900 border-stone-700">
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="success">Sukses</SelectItem>
                    <SelectItem value="failed">Gagal</SelectItem>
                    <SelectItem value="completed">Selesai</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex gap-2">
                  <Button
                    onClick={onSearch}
                    className="bg-amber-600 hover:bg-amber-700 transition-colors flex-1"
                  >
                    <Search className="size-4 mr-2" />
                    Cari
                  </Button>
                  <Button onClick={onClear} variant="outline" className="gap-2 border-stone-700 hover:bg-stone-800">
                    <RefreshCw className="size-4" />
                    Reset
                  </Button>
                </div>
              </div>
            </div>

            <Separator className="bg-stone-800" />

            {/* Table */}
            <div className="rounded-xl border border-stone-700/80 overflow-hidden bg-stone-900/40 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-stone-900/60 border-b border-stone-700">
                    <TableHead className="text-amber-300">Waktu</TableHead>
                    <TableHead className="text-amber-300">Jenis</TableHead>
                    <TableHead className="text-amber-300">Judul</TableHead>
                    <TableHead className="text-amber-300">Status</TableHead>
                    <TableHead className="text-right text-amber-300">Skor</TableHead>
                    <TableHead className="text-right text-amber-300">Waktu (s)</TableHead>
                    <TableHead className="text-right text-amber-300">Akurasi</TableHead>
                    <TableHead className="text-amber-300"></TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loading &&
                    skeletonRows.map((_, idx) => (
                      <TableRow key={`sk-${idx}`} className="hover:bg-transparent border-b border-stone-800/50">
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
                        <div className="flex flex-col items-center gap-3">
                          <div className="text-5xl opacity-50">📭</div>
                          <div>
                            <p className="font-semibold text-lg mb-1">Belum Ada Catatan</p>
                            <p className="text-sm text-stone-400">Mulai ekspedisi pertama untuk mencatat jejak perjalanan</p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}

                  {!loading &&
                    rows.map((r) => (
                      <TableRow
                        key={r.id}
                        className="group transition-colors hover:bg-stone-800/40 border-b border-stone-800/50"
                      >
                        <TableCell className="text-stone-300">
                          {new Date(r.created_at).toLocaleString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>

                        <TableCell>
                          <Badge className="bg-stone-800 text-stone-200 border border-stone-700 capitalize">
                            {r.kind}
                          </Badge>
                        </TableCell>

                        <TableCell className="max-w-[320px] truncate">
                          <span className="text-stone-100 font-medium">{r.title}</span>
                        </TableCell>

                        <TableCell>
                          {r.status ? (
                            <Badge
                              className={[
                                'border capitalize',
                                r.status === 'success'
                                  ? 'bg-emerald-900/60 text-emerald-200 border-emerald-700'
                                  : r.status === 'failed'
                                  ? 'bg-red-900/60 text-red-200 border-red-700'
                                  : 'bg-stone-800 text-stone-200 border-stone-700',
                              ].join(' ')}
                            >
                              {r.status}
                            </Badge>
                          ) : (
                            <span className="text-stone-500">-</span>
                          )}
                        </TableCell>

                        <TableCell className="text-right text-stone-300 font-mono">
                          {r.score !== null && r.score !== undefined ? (
                            <span className="text-amber-300 font-semibold">{r.score}</span>
                          ) : (
                            <span className="text-stone-500">-</span>
                          )}
                        </TableCell>

                        <TableCell className="text-right text-stone-300 font-mono">
                          {r.time_taken !== null && r.time_taken !== undefined ? (
                            <span className="text-sky-300">{r.time_taken}s</span>
                          ) : (
                            <span className="text-stone-500">-</span>
                          )}
                        </TableCell>

                        <TableCell className="text-right text-stone-300 font-mono">
                          {typeof r.accuracy === 'number' ? (
                            <span className="text-green-300">{r.accuracy.toFixed(1)}%</span>
                          ) : (
                            <span className="text-stone-500">-</span>
                          )}
                        </TableCell>

                        <TableCell className="text-right">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="bg-amber-800/50 hover:bg-amber-700 text-amber-100 border border-amber-700/50"
                            onClick={() => router.visit(`/game/journal/${r.id}`)}
                          >
                            Detail →
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {items && items.links && items.links.length > 3 && (
              <div className="flex justify-center gap-2 animate-in fade-in duration-300">
                {items.links.map((l, idx) => {
                  const disabled = !l.url;
                  const label = l.label.replace('&laquo;', '«').replace('&raquo;', '»');
                  const active = l.active;

                  return (
                    <Button
                      key={idx}
                      variant={active ? 'default' : 'outline'}
                      size="sm"
                      disabled={disabled}
                      className={[
                        active
                          ? 'bg-amber-600 hover:bg-amber-700 text-stone-900 border-amber-600'
                          : 'border-stone-700 text-stone-300 hover:border-amber-600 hover:bg-stone-800',
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
            )}
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
}
