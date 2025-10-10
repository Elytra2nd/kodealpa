import React, { useEffect, useMemo, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { CheckCircle2, Clock3, Target, Search, RefreshCw, Lock, Award } from 'lucide-react';

type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

type Ach = {
  id: number;
  key: string;
  title: string;
  description?: string;
  icon?: string;
  rarity: Rarity;
  criteria?: any;
  unlocked: boolean;
  unlocked_at?: string | null;
  progress?: any;
};

function rarityBadge(r: Rarity) {
  const map: Record<Rarity, { bg: string; border: string; text: string }> = {
    common: { bg: 'bg-stone-700', border: 'border-stone-600', text: 'text-stone-200' },
    uncommon: { bg: 'bg-emerald-700', border: 'border-emerald-600', text: 'text-emerald-100' },
    rare: { bg: 'bg-blue-700', border: 'border-blue-600', text: 'text-blue-100' },
    epic: { bg: 'bg-purple-700', border: 'border-purple-600', text: 'text-purple-100' },
    legendary: { bg: 'bg-amber-700', border: 'border-amber-600', text: 'text-amber-100' },
  };
  const style = map[r];
  return (
    <Badge className={`${style.bg} ${style.text} ${style.border} border-2 font-bold`}>
      {r.toUpperCase()}
    </Badge>
  );
}

// Ringkas criteria menjadi poin-poin manusiawi
function summarizeCriteria(criteria: any): string[] {
  if (!criteria) return [];
  if (typeof criteria === 'string') return [criteria];
  if (Array.isArray(criteria)) return criteria.map(String);

  const c: Record<string, any> = criteria;
  const out: string[] = [];

  const asNum = (v: any) => (typeof v === 'number' ? v : Number(v));
  const asStr = (v: any) => String(v);

  if (c.min_score ?? c.score ?? c.target_score) out.push(`Skor ≥ ${asNum(c.min_score ?? c.score ?? c.target_score)}`);
  if (c.max_time ?? c.time_under ?? c.time_sec) out.push(`Waktu ≤ ${asNum(c.max_time ?? c.time_under ?? c.time_sec)} dtk`);
  if (c.wins) out.push(`Menang ${asNum(c.wins)}x`);
  if (c.streak) out.push(`Streak ${asNum(c.streak)}`);
  if (c.puzzles ?? c.sessions ?? c.matches) {
    const n = asNum(c.puzzles ?? c.sessions ?? c.matches);
    out.push(`Selesaikan ${n} tantangan`);
  }
  if (c.difficulty) out.push(`Kesulitan: ${asStr(c.difficulty)}`);
  if (c.mode) out.push(`Mode: ${asStr(c.mode)}`);
  if (c.category) out.push(`Kategori: ${asStr(c.category)}`);
  if (c.level ?? c.stage) out.push(`Level: ${asStr(c.level ?? c.stage)}`);

  if (out.length === 0) {
    const keys = Object.keys(c).slice(0, 4);
    for (const k of keys) out.push(`${k}: ${asStr(c[k])}`);
  }
  return out;
}

function summarizeProgress(progress: any): string | null {
  if (!progress) return null;
  if (typeof progress === 'number') return `Progres: ${progress}%`;
  if (typeof progress === 'string') return progress;

  const p: Record<string, any> = progress;
  const pct = p.percent ?? p.percentage;
  if (pct != null) return `Progres: ${Number(pct).toFixed(0)}%`;

  if (p.current != null && p.target != null) {
    const cur = Number(p.current);
    const tgt = Number(p.target);
    const est = tgt > 0 ? Math.min(100, Math.round((cur / tgt) * 100)) : undefined;
    return est != null ? `Progres: ${cur}/${tgt} (${est}%)` : `Progres: ${cur}/${tgt}`;
  }
  return null;
}

export default function AchievementsPage() {
  const [items, setItems] = useState<Ach[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [rarity, setRarity] = useState<Rarity | 'all'>('all');

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/achievements', { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
    const data = await res.json();
    setItems(data.achievements || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    let rows = items;
    if (rarity !== 'all') rows = rows.filter((a) => a.rarity === rarity);
    if (q) rows = rows.filter((a) => a.title.toLowerCase().includes(q.toLowerCase()));
    return rows;
  }, [items, rarity, q]);

  const unlocked = filtered.filter((i) => i.unlocked);
  const locked = filtered.filter((i) => !i.unlocked);

  const totalUnlocked = items.filter((i) => i.unlocked).length;
  const totalItems = items.length;
  const completionRate = totalItems > 0 ? Math.round((totalUnlocked / totalItems) * 100) : 0;

  return (
    <AuthenticatedLayout
      header={
        <>
          🏅 Achievements
        </>
      }
    >
      <Head title="Achievements" />

      <div className="space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-2 border-emerald-700/50 bg-gradient-to-br from-stone-900 to-emerald-950/20 hover:border-emerald-600/70 transition-all duration-300">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 bg-emerald-900/30 rounded-lg">
                <CheckCircle2 className="size-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-stone-400">Terbuka</p>
                <p className="text-2xl font-bold text-emerald-300">{totalUnlocked}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-stone-700/50 bg-gradient-to-br from-stone-900 to-stone-800 hover:border-stone-600/70 transition-all duration-300">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 bg-stone-800/50 rounded-lg">
                <Lock className="size-6 text-stone-400" />
              </div>
              <div>
                <p className="text-xs text-stone-400">Terkunci</p>
                <p className="text-2xl font-bold text-stone-300">{totalItems - totalUnlocked}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-amber-700/50 bg-gradient-to-br from-stone-900 to-amber-950/20 hover:border-amber-600/70 transition-all duration-300">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 bg-amber-900/30 rounded-lg">
                <Award className="size-6 text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-stone-400">Penyelesaian</p>
                <p className="text-2xl font-bold text-amber-300">{completionRate}%</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-3 border-amber-700/70 bg-stone-900/40 backdrop-blur-sm">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <CardTitle className="text-amber-300 flex items-center gap-2">
                  <span>🎖️</span>
                  Pencapaian Penjelajah
                </CardTitle>
                <CardDescription className="text-stone-400">
                  Lihat lencana yang sudah terbuka dan yang masih terkunci
                </CardDescription>
              </div>
              <Badge className="bg-stone-800 text-stone-200 border border-stone-700">
                {filtered.length} dari {items.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
              <Input
                placeholder="Cari judul..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9 bg-stone-800/50 border-stone-700"
              />
            </div>
            <Select value={rarity} onValueChange={(v) => setRarity(v as any)}>
              <SelectTrigger className="bg-stone-800/50 border-stone-700">
                <SelectValue placeholder="Rarity" />
              </SelectTrigger>
              <SelectContent className="bg-stone-900 border-stone-700">
                <SelectItem value="all">Semua Rarity</SelectItem>
                <SelectItem value="common">Common</SelectItem>
                <SelectItem value="uncommon">Uncommon</SelectItem>
                <SelectItem value="rare">Rare</SelectItem>
                <SelectItem value="epic">Epic</SelectItem>
                <SelectItem value="legendary">Legendary</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button className="bg-amber-600 hover:bg-amber-700 flex-1" onClick={() => load()}>
                <RefreshCw className="size-4 mr-2" />
                Segarkan
              </Button>
              <Button
                variant="outline"
                className="border-stone-700 hover:bg-stone-800"
                onClick={() => {
                  setQ('');
                  setRarity('all');
                }}
              >
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Unlocked */}
        <Card className="border-3 border-emerald-700/70 bg-stone-900/40 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="size-5" />
              Unlocked
            </CardTitle>
            <Badge className="bg-emerald-800 text-emerald-200 border border-emerald-700">
              {unlocked.length}
            </Badge>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {loading && (
              <Card className="border border-stone-700 bg-stone-900/40">
                <CardContent className="p-6 text-stone-300">Memuat...</CardContent>
              </Card>
            )}
            {!loading && unlocked.length === 0 && (
              <Card className="col-span-full border border-stone-700 bg-stone-900/40">
                <CardContent className="p-8 text-center">
                  <div className="text-5xl mb-3 opacity-50">🔓</div>
                  <p className="text-stone-300 font-semibold mb-1">Belum ada pencapaian yang terbuka</p>
                  <p className="text-stone-400 text-sm">Mulai ekspedisi untuk membuka achievements</p>
                </CardContent>
              </Card>
            )}
            {!loading &&
              unlocked.map((a) => {
                const criteriaList = summarizeCriteria(a.criteria);
                const progText = summarizeProgress(a.progress);
                return (
                  <Card
                    key={a.id}
                    className="border-2 border-emerald-600 bg-gradient-to-br from-stone-900 to-emerald-950/20 hover:shadow-lg hover:shadow-emerald-900/50 transition-all duration-300"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <CardTitle className="text-emerald-300 text-lg flex items-center gap-2">
                            <span className="text-2xl">{a.icon ?? '🏅'}</span>
                            {a.title}
                          </CardTitle>
                          <CardDescription className="text-stone-400 text-xs mt-1">
                            Unlocked: {a.unlocked_at ? new Date(a.unlocked_at).toLocaleDateString('id-ID') : '-'}
                          </CardDescription>
                        </div>
                        {rarityBadge(a.rarity)}
                      </div>
                    </CardHeader>
                    <CardContent className="text-stone-200 space-y-3">
                      {a.description && <p className="text-stone-300 text-sm">{a.description}</p>}

                      {criteriaList.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {criteriaList.map((c, i) => (
                            <Badge
                              key={i}
                              className="bg-stone-800/70 text-stone-200 border border-stone-700 inline-flex items-center gap-1 text-xs"
                            >
                              <Target className="size-3 text-emerald-400" />
                              {c}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <div className="text-emerald-300 inline-flex items-center gap-2 text-sm">
                          <CheckCircle2 className="size-4" />
                          Syarat terpenuhi
                        </div>
                      )}

                      {progText && (
                        <div className="text-sm text-stone-300 inline-flex items-center gap-2">
                          <Clock3 className="size-4 text-amber-400" />
                          {progText}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
          </CardContent>
        </Card>

        {/* Locked */}
        <Card className="border-3 border-stone-700 bg-stone-900/40 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-stone-300 flex items-center gap-2">
              <Lock className="size-5" />
              Locked
            </CardTitle>
            <Badge className="bg-stone-800 text-stone-200 border border-stone-700">{locked.length}</Badge>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {loading && (
              <Card className="border border-stone-700 bg-stone-900/40">
                <CardContent className="p-6 text-stone-300">Memuat...</CardContent>
              </Card>
            )}
            {!loading && locked.length === 0 && (
              <Card className="col-span-full border border-stone-700 bg-stone-900/40">
                <CardContent className="p-8 text-center">
                  <div className="text-5xl mb-3 opacity-50">🎉</div>
                  <p className="text-stone-300 font-semibold mb-1">Semua pencapaian sudah terbuka!</p>
                  <p className="text-stone-400 text-sm">Selamat, Anda telah menyelesaikan semua challenges</p>
                </CardContent>
              </Card>
            )}
            {!loading &&
              locked.map((a) => {
                const criteriaList = summarizeCriteria(a.criteria);
                return (
                  <Card
                    key={a.id}
                    className="border border-stone-700 bg-stone-900/40 opacity-75 hover:opacity-90 transition-opacity duration-300"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <CardTitle className="text-stone-300 text-lg flex items-center gap-2">
                            <span className="text-2xl grayscale">{a.icon ?? '🔒'}</span>
                            {a.title}
                          </CardTitle>
                        </div>
                        {rarityBadge(a.rarity)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {a.description && <p className="text-stone-400 text-sm">{a.description}</p>}
                      {criteriaList.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {criteriaList.map((c, i) => (
                            <Badge
                              key={i}
                              className="bg-stone-800 text-stone-400 border border-stone-700 inline-flex items-center gap-1 text-xs"
                            >
                              <Target className="size-3 text-stone-500" />
                              {c}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
          </CardContent>
        </Card>

        {/* Footer Link */}
        <div className="text-center py-4">
          <Link
            href="/game/journal"
            className="text-amber-300 hover:text-amber-200 transition-colors inline-flex items-center gap-2 text-sm font-medium"
          >
            <span>📓</span>
            Lihat riwayat perjalanan lengkap
            <span>→</span>
          </Link>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
