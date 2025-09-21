// resources/js/Pages/Game/ExplorerJournalDetail.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

// shadcn/ui components
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Separator } from '@/Components/ui/separator';
import { Progress } from '@/Components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/Components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/Components/ui/tooltip';
import { ScrollArea } from '@/Components/ui/scroll-area';
import { Skeleton } from '@/Components/ui/skeleton';

// icons
import { ArrowLeft, Gauge, Timer, Award, Sparkles } from 'lucide-react';

import type { JournalItem } from '@/services/journalApi';
import { journalApi } from '@/services/journalApi';

export default function ExplorerJournalDetail({ id }: { id: number }) {
  const page = usePage() as any;
  const effectiveId = id || page?.props?.id;
  const [entry, setEntry] = useState<JournalItem | null>(null);

  useEffect(() => {
    let mounted = true;
    if (effectiveId) {
      journalApi.show(Number(effectiveId)).then((res) => {
        if (mounted) setEntry(res.entry);
      });
    }
    return () => {
      mounted = false;
    };
  }, [effectiveId]);

  const accuracyPct = useMemo(() => {
    if (typeof entry?.accuracy === 'number') return Math.max(0, Math.min(100, Number(entry.accuracy)));
    return null;
  }, [entry]);

  const timeTaken = useMemo(() => {
    if (!entry?.time_taken && entry?.time_taken !== 0) return null;
    const s = Number(entry.time_taken || 0);
    const mm = Math.floor(s / 60).toString().padStart(2, '0');
    const ss = Math.floor(s % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  }, [entry]);

  return (
    <AuthenticatedLayout
      header={
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold leading-tight text-amber-300 inline-flex items-center gap-2">
            <span className="relative">
              🗒️ Detail Catatan
              <span className="absolute -top-1 -right-3 size-2 rounded-full bg-amber-400 motion-safe:animate-ping" />
            </span>
            <Sparkles className="size-4 text-amber-400" />
          </h2>
        </div>
      }
    >
      <Head title={entry ? entry.title : 'Detail Catatan'} />

      {/* Background + subtle animated overlay */}
      <div className="relative min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950 py-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.10),transparent_55%)]" />
        <div className="mx-auto max-w-3xl sm:px-6 lg:px-8 space-y-6">

          {/* Top bar actions */}
          <div className="flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-300">
            <Button variant="ghost" size="sm" className="text-amber-300 hover:text-amber-200" asChild>
              <Link href="/game/journal" className="inline-flex items-center gap-2">
                <ArrowLeft className="size-4" />
                Kembali
              </Link>
            </Button>

            {entry && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-stone-800 text-amber-200 border border-stone-700">
                  #{entry?.id ?? '—'}
                </Badge>
                <Badge className="bg-amber-800/80 text-amber-100 border border-amber-700">
                  {entry?.kind ?? '—'}
                </Badge>
              </div>
            )}
          </div>

          <Card className="border-4 border-amber-700/70 bg-stone-900/40 backdrop-blur-sm shadow-xl
                           animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300
                           hover:shadow-amber-900/20 transition-shadow">
            <CardHeader className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="text-amber-300 tracking-tight">
                  {entry?.title ?? (
                    <Skeleton className="h-6 w-64 bg-stone-800" />
                  )}
                </CardTitle>
                <CardDescription className="text-stone-400">
                  {entry ? 'Ringkasan pencapaian penjelajah' : <Skeleton className="h-4 w-40 bg-stone-800" />}
                </CardDescription>
              </div>

              {entry ? (
                <div className="flex flex-wrap gap-2 justify-end">
                  {entry.status && (
                    <Badge
                      className={[
                        'border',
                        entry.status === 'success'
                          ? 'bg-emerald-900/60 text-emerald-200 border-emerald-800'
                          : entry.status === 'failed'
                          ? 'bg-red-900/60 text-red-200 border-red-800'
                          : 'bg-stone-800 text-stone-200 border-stone-700',
                      ].join(' ')}
                    >
                      {String(entry.status).toUpperCase()}
                    </Badge>
                  )}
                  <Badge className="bg-indigo-900/50 text-indigo-200 border border-indigo-800 inline-flex items-center gap-1">
                    <Award className="size-3" />
                    {entry.score ?? '-'}
                  </Badge>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-20 bg-stone-800" />
                  <Skeleton className="h-6 w-16 bg-stone-800" />
                </div>
              )}
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Metrics row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Waktu */}
                <div
                  className="rounded-xl border border-stone-700/60 bg-stone-900/60 p-4
                             hover:border-amber-700/60 transition-colors group">
                  <div className="flex items-center justify-between">
                    <span className="text-stone-400 text-sm">Waktu</span>
                    <Timer className="size-4 text-amber-400 group-hover:rotate-12 transition-transform" />
                  </div>
                  <div className="mt-1 text-lg text-stone-100">
                    {entry ? (timeTaken ?? '—') : <Skeleton className="h-5 w-16 bg-stone-800" />}
                  </div>
                </div>

                {/* Akurasi */}
                <div
                  className="rounded-xl border border-stone-700/60 bg-stone-900/60 p-4
                             hover:border-amber-700/60 transition-colors group">
                  <div className="flex items-center justify-between">
                    <span className="text-stone-400 text-sm">Akurasi</span>
                    <Gauge className="size-4 text-amber-400 group-hover:rotate-6 transition-transform" />
                  </div>
                  <div className="mt-2">
                    {entry ? (
                      accuracyPct !== null ? (
                        <>
                          <div className="flex items-center justify-between text-sm text-stone-300">
                            <span>{accuracyPct.toFixed(1)}%</span>
                          </div>
                          <Progress value={accuracyPct} className="mt-2 h-2 bg-stone-800" />
                        </>
                      ) : (
                        '—'
                      )
                    ) : (
                      <>
                        <Skeleton className="h-4 w-16 bg-stone-800" />
                        <Skeleton className="h-2 w-full mt-2 bg-stone-800" />
                      </>
                    )}
                  </div>
                </div>

                {/* Hints */}
                <div
                  className="rounded-xl border border-stone-700/60 bg-stone-900/60 p-4
                             hover:border-amber-700/60 transition-colors group">
                  <div className="flex items-center justify-between">
                    <span className="text-stone-400 text-sm">Hints</span>
                    <TooltipProvider>
                      <Tooltip delayDuration={200}>
                        <TooltipTrigger className="text-amber-400">
                          <Sparkles className="size-4 group-hover:scale-110 transition-transform" />
                        </TooltipTrigger>
                        <TooltipContent className="bg-stone-900 border-stone-700 text-stone-200">
                          Jumlah petunjuk yang digunakan
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="mt-1 text-lg text-stone-100">
                    {entry ? (entry.hints_used ?? '—') : <Skeleton className="h-5 w-10 bg-stone-800" />}
                  </div>
                </div>
              </div>

              <Separator className="bg-stone-800" />

              {/* Tabs: Ringkasan / Metadata */}
              <Tabs defaultValue="ringkasan" className="animate-in fade-in duration-300">
                <TabsList className="bg-stone-900/60 border border-stone-700">
                  <TabsTrigger value="ringkasan" className="data-[state=active]:bg-stone-800">
                    Ringkasan
                  </TabsTrigger>
                  <TabsTrigger value="meta" className="data-[state=active]:bg-stone-800">
                    Metadata JSON
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="ringkasan" className="pt-4">
                  {entry ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="rounded-lg border border-stone-700/60 bg-stone-900/50 p-4">
                        <div className="text-stone-400 text-sm">Jenis</div>
                        <div className="text-stone-100">{entry.kind}</div>
                      </div>
                      <div className="rounded-lg border border-stone-700/60 bg-stone-900/50 p-4">
                        <div className="text-stone-400 text-sm">Status</div>
                        <div className="text-stone-100">{entry.status ?? '—'}</div>
                      </div>
                      <div className="rounded-lg border border-stone-700/60 bg-stone-900/50 p-4">
                        <div className="text-stone-400 text-sm">Skor</div>
                        <div className="text-stone-100">{entry.score ?? '—'}</div>
                      </div>
                      <div className="rounded-lg border border-stone-700/60 bg-stone-900/50 p-4">
                        <div className="text-stone-400 text-sm">Waktu (mm:ss)</div>
                        <div className="text-stone-100">{timeTaken ?? '—'}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Skeleton className="h-20 w-full bg-stone-800" />
                      <Skeleton className="h-20 w-full bg-stone-800" />
                      <Skeleton className="h-20 w-full bg-stone-800" />
                      <Skeleton className="h-20 w-full bg-stone-800" />
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="meta" className="pt-4">
                  {entry ? (
                    <div className="rounded-xl border border-stone-700/60 bg-stone-900/60">
                      <ScrollArea className="h-64 w-full rounded-xl">
                        <pre className="p-4 text-sm text-amber-100">
                          {JSON.stringify(entry.meta ?? {}, null, 2)}
                        </pre>
                      </ScrollArea>
                    </div>
                  ) : (
                    <Skeleton className="h-64 w-full bg-stone-800" />
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
