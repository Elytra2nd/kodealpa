import React, { useEffect, useMemo, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { CheckCircle2, Clock3, Target } from 'lucide-react';

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
  const map: Record<Rarity, string> = {
    common: 'bg-stone-700 text-stone-200',
    uncommon: 'bg-emerald-700 text-emerald-100',
    rare: 'bg-blue-700 text-blue-100',
    epic: 'bg-purple-700 text-purple-100',
    legendary: 'bg-amber-700 text-amber-100',
  };
  return <Badge className={map[r]}>{r.toUpperCase()}</Badge>;
}

// Ringkas criteria menjadi poin-poin manusiawi (tanpa JSON)
function summarizeCriteria(criteria: any): string[] {
  if (!criteria) return [];
  if (typeof criteria === 'string') return [criteria];
  if (Array.isArray(criteria)) return criteria.map(String);

  // Object dengan pola umum
  const c: Record<string, any> = criteria;
  const out: string[] = [];

  const asNum = (v: any) => (typeof v === 'number' ? v : Number(v));
  const asStr = (v: any) => String(v);

  // Pola umum yang sering dipakai
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

  // Jika masih kosong, ambil sebagian kunci sebagai fallback ringkas
  if (out.length === 0) {
    const keys = Object.keys(c).slice(0, 4);
    for (const k of keys) out.push(`${k}: ${asStr(c[k])}`);
  }
  return out;
}

// Ringkas progres agar tidak menampilkan JSON
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
  // Tidak menampilkan JSON mentah
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

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let rows = items;
    if (rarity !== 'all') rows = rows.filter(a => a.rarity === rarity);
    if (q) rows = rows.filter(a => a.title.toLowerCase().includes(q.toLowerCase()));
    return rows;
  }, [items, rarity, q]);

  const unlocked = filtered.filter(i => i.unlocked);
  const locked = filtered.filter(i => !i.unlocked);

  return (
    <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-amber-300">🏅 Achievements</h2>}>
      <Head title="Achievements" />
      <div className="min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950 py-10">
        <div className="mx-auto max-w-7xl sm:px-6 lg:px-8 space-y-8">
          {/* Filters */}
          <Card className="border-3 border-amber-700 bg-stone-900/30">
            <CardHeader>
              <CardTitle className="text-amber-300">Pencapaian Penjelajah</CardTitle>
              <CardDescription className="text-stone-300">Lihat lencana yang sudah terbuka dan yang masih terkunci</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input placeholder="Cari judul..." value={q} onChange={(e)=>setQ(e.target.value)} />
              <Select value={rarity} onValueChange={(v)=>setRarity(v as any)}>
                <SelectTrigger><SelectValue placeholder="Rarity" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Rarity</SelectItem>
                  <SelectItem value="common">Common</SelectItem>
                  <SelectItem value="uncommon">Uncommon</SelectItem>
                  <SelectItem value="rare">Rare</SelectItem>
                  <SelectItem value="epic">Epic</SelectItem>
                  <SelectItem value="legendary">Legendary</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button className="bg-amber-600 hover:bg-amber-700" onClick={()=>load()}>Segarkan</Button>
                <Button variant="outline" onClick={()=>{ setQ(''); setRarity('all'); }}>Reset</Button>
              </div>
            </CardContent>
          </Card>

          {/* Unlocked */}
          <Card className="border-3 border-amber-700 bg-stone-900/30">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-amber-300">Unlocked</CardTitle>
              <Badge className="bg-stone-800 text-stone-200">{unlocked.length}</Badge>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {loading && (
                <Card className="border border-stone-700 bg-stone-900/40">
                  <CardContent className="p-6 text-stone-300">Memuat...</CardContent>
                </Card>
              )}
              {!loading && unlocked.length === 0 && (
                <Card className="border border-stone-700 bg-stone-900/40">
                  <CardContent className="p-6 text-stone-300">Belum ada pencapaian yang terbuka.</CardContent>
                </Card>
              )}
              {!loading && unlocked.map((a) => {
                const criteriaList = summarizeCriteria(a.criteria);
                const progText = summarizeProgress(a.progress);
                return (
                  <Card key={a.id} className="border-2 border-amber-600 bg-stone-900/50">
                    <CardHeader className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-amber-300">{a.icon ?? '🏅'} {a.title}</CardTitle>
                        <CardDescription className="text-stone-400">
                          Unlocked: {a.unlocked_at ? new Date(a.unlocked_at).toLocaleString() : '-'}
                        </CardDescription>
                      </div>
                      {rarityBadge(a.rarity)}
                    </CardHeader>
                    <CardContent className="text-stone-200 space-y-3">
                      {a.description && <div className="text-stone-300">{a.description}</div>}

                      {/* Syarat ringkas (jika ada), tanpa JSON */}
                      {criteriaList.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {criteriaList.map((c, i) => (
                            <Badge key={i} className="bg-stone-800 text-stone-200 border border-stone-700 inline-flex items-center gap-1">
                              <Target className="size-3 text-amber-400" />
                              {c}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <div className="text-emerald-300 inline-flex items-center gap-2">
                          <CheckCircle2 className="size-4" />
                          Syarat terpenuhi
                        </div>
                      )}

                      {/* Progres ringkas (opsional), tanpa JSON */}
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

          {/* Locked (tetap boleh tampil ringkasan/JSON sesuai kebutuhan) */}
          <Card className="border-3 border-stone-700 bg-stone-900/30">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-stone-300">Locked</CardTitle>
              <Badge className="bg-stone-800 text-stone-200">{locked.length}</Badge>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {loading && (
                <Card className="border border-stone-700 bg-stone-900/40">
                  <CardContent className="p-6 text-stone-300">Memuat...</CardContent>
                </Card>
              )}
              {!loading && locked.length === 0 && (
                <Card className="border border-stone-700 bg-stone-900/40">
                  <CardContent className="p-6 text-stone-300">Tidak ada pencapaian terkunci.</CardContent>
                </Card>
              )}
              {!loading && locked.map((a) => {
                const criteriaList = summarizeCriteria(a.criteria);
                return (
                  <Card key={a.id} className="border border-stone-700 bg-stone-900/40 opacity-75">
                    <CardHeader className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-stone-300">{a.icon ?? '🔒'} {a.title}</CardTitle>
                        <CardDescription className="text-stone-500">
                          {criteriaList.length > 0 ? (
                            <span className="inline-flex flex-wrap gap-2">
                              {criteriaList.map((c, i) => (
                                <Badge key={i} className="bg-stone-800 text-stone-200 border border-stone-700 inline-flex items-center gap-1">
                                  <Target className="size-3 text-amber-400" />
                                  {c}
                                </Badge>
                              ))}
                            </span>
                          ) : (
                            'Syarat: —'
                          )}
                        </CardDescription>
                      </div>
                      {rarityBadge(a.rarity)}
                    </CardHeader>
                    <CardContent className="text-stone-400">
                      <div>{a.description}</div>
                    </CardContent>
                  </Card>
                );
              })}
            </CardContent>
          </Card>

          <div className="text-center">
            <Link href="/game/journal" className="text-amber-300 hover:underline">Lihat riwayat perjalanan →</Link>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
