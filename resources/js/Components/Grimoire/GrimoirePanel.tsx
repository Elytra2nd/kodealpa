// resources/js/Pages/Grimoire/GrimoirePanel.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Badge } from '@/Components/ui/badge';
import { grimoireApi } from '@/services/grimoireApi';
import type { GrimoireCategory, GrimoireEntry } from '@/types/grimoire';
import GrimoireSidebar from './GrimoireSidebar';

function isPdf(entry: any): boolean {
  const ct = (entry?.content_type || '').toLowerCase();
  const url = entry?.file_url || '';
  return ct === 'application/pdf' || /\.pdf($|\?)/i.test(url);
}

function toAbsoluteUrl(u?: string | null): string | null {
  if (!u) return null;
  try {
    // Case 1: absolute URL
    if (/^https?:\/\//i.test(u)) return u;

    const base = window.location.origin.replace(/\/+$/, '');

    // Case 2: relative path dengan slash
    if (u.startsWith('/')) {
      return `${base}${u}`;
    }

    // Case 3: cuma nama file → fallback folder default
    return `${base}/files/grimoire/pdfs/${u}`;
  } catch {
    return u || null;
  }
}

export default function GrimoirePanel({ role }: { role: 'defuser'|'expert'|'all' }) {
  const [categories, setCategories] = useState<GrimoireCategory[]>([]);
  const [entries, setEntries] = useState<GrimoireEntry[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | undefined>(undefined);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<GrimoireEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const cats = await grimoireApi.getCategories();
      setCategories(cats.categories);

      const list = await grimoireApi.listEntries({
        category: activeCategory,
        q: query,
        role: role === 'all' ? undefined : role,
        format: 'pdf',
        per_page: 50,
      });

      const data = list.entries.data || [];
      setEntries(data);

      if (data.length && (!selected || !data.find(d => d.id === selected?.id))) {
        setSelected(data[0]);
      }
      if (!data.length) setSelected(null);
    } catch (e: any) {
      setErr('Gagal memuat pedoman.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [activeCategory, query, role]);

  const filtered = useMemo(() => entries, [entries]);

  const isSelectedPdf = selected ? isPdf(selected as any) : false;
  const pdfUrlAbs = selected ? toAbsoluteUrl((selected as any).file_url || null) : null;

  // Debug log
  useEffect(() => {
    if (selected) {
      console.log("DEBUG selected:", selected);
      console.log("DEBUG file_url:", (selected as any).file_url);
      console.log("DEBUG absolute:", pdfUrlAbs);
    }
  }, [selected, pdfUrlAbs]);

  return (
    <Card className="bg-stone-900/40 border-stone-700">
      <CardHeader>
        <CardTitle className="text-amber-300 flex items-center justify-between">
          <span>📘 Grimoire Pedoman (PDF)</span>
          <Badge className="bg-purple-700 text-purple-100">{role.toUpperCase()}</Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-3">
          <GrimoireSidebar
            categories={categories}
            activeCategory={activeCategory}
            onSelectCategory={setActiveCategory}
          />
        </div>

        <div className="col-span-12 md:col-span-9 grid grid-cols-12 gap-4">
          <div className="col-span-12 flex items-center gap-2">
            <Input
              placeholder="Cari pedoman (PDF)..."
              value={query}
              onChange={(e)=>setQuery(e.target.value)}
            />
            <Badge className="bg-stone-700 text-stone-200">{filtered.length} entries</Badge>
          </div>

          <div className="col-span-12 grid md:grid-cols-2 gap-3 max-h-64 overflow-auto pr-2">
            {loading ? (
              <div className="text-stone-300">Loading...</div>
            ) : err ? (
              <div className="text-rose-300">{err}</div>
            ) : filtered.length === 0 ? (
              <div className="text-stone-400">
                Tidak ada pedoman PDF untuk filter saat ini.
              </div>
            ) : filtered.map((e)=>(
              <button
                key={e.id}
                onClick={()=>setSelected(e)}
                className={`text-left p-3 rounded-lg border bg-stone-900/50 hover:border-amber-600 ${selected?.id === e.id ? 'border-amber-600' : 'border-stone-700'}`}
              >
                <div className="font-semibold text-stone-100">{e.title}</div>
                {(e as any).summary && <div className="text-stone-400 text-sm">{(e as any).summary}</div>}
                <div className="mt-2 flex gap-2">
                  <Badge className="bg-stone-700 text-stone-200">{(e as any).role_access}</Badge>
                  <Badge className="bg-stone-700 text-stone-200">PDF</Badge>
                </div>
              </button>
            ))}
          </div>

          <div className="col-span-12">
            {selected ? (
              isSelectedPdf && pdfUrlAbs ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-stone-200 font-medium">{(selected as any).title}</div>
                    <div className="flex gap-4">
                      <a href={pdfUrlAbs} target="_blank" rel="noreferrer" className="text-amber-300 hover:underline">Buka di tab baru →</a>
                      <a href={pdfUrlAbs} download className="text-amber-300 hover:underline">⬇ Unduh PDF</a>
                    </div>
                  </div>

                  {/* Viewer PDF */}
                  <iframe
                    key={selected.id}
                    src={`${pdfUrlAbs}#view=FitH`}
                    className="w-full h-[80vh] rounded-lg border border-stone-700"
                    title={(selected as any).title || 'PDF'}
                  />
                </div>
              ) : (
                <div className="text-stone-400">
                  Entri tidak memiliki file PDF yang valid.
                </div>
              )
            ) : (
              <div className="text-stone-400">Pilih pedoman PDF untuk melihat isinya.</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
