// resources/js/Pages/Grimoire/GrimoirePanel.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Badge } from '@/Components/ui/badge';
import { grimoireApi } from '@/services/grimoireApi';
import type { GrimoireCategory, GrimoireEntry } from '@/types/grimoire';
import GrimoireSidebar from './GrimoireSidebar';

function isPdf(entry: Partial<GrimoireEntry>): boolean {
  const ct = String((entry as any)?.content_type || '').toLowerCase();
  const url = String((entry as any)?.file_url || '');
  return ct.includes('pdf') || /\.pdf($|\?)/i.test(url);
}

function toAbsoluteUrl(u?: string | null): string | null {
  if (!u) return null;
  // normalisasi: backslash → slash
  let s = u.trim().replace(/\\/g, '/');

  // absolute / protocol-relative / data/blob
  if (/^https?:\/\//i.test(s)) return s;
  if (/^\/\//.test(s)) return `${window.location.protocol}${s}`;
  if (/^(data:|blob:)/i.test(s)) return s;

  const base = window.location.origin.replace(/\/+$/, '');

  // root-relative sudah benar ("/files/...")
  if (s.startsWith('/')) return `${base}${s}`;

  // relative path dengan folder ("files/grimoire/pdfs/aturan.pdf")
  if (s.includes('/')) return `${base}/${s.replace(/^\/+/, '')}`;

  // hanya nama file → fallback ke folder default
  return `${base}/files/grimoire/pdfs/${encodeURIComponent(s)}`;
}

export default function GrimoirePanel({ role }: { role: 'defuser'|'expert'|'all' }) {
  const [categories, setCategories] = useState<GrimoireCategory[]>([]);
  const [entries, setEntries] = useState<GrimoireEntry[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | undefined>(undefined);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<GrimoireEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Debounce query untuk mengurangi jumlah request
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const load = async (signal: AbortSignal) => {
    setLoading(true);
    setErr(null);
    try {
      const cats = await grimoireApi.getCategories(signal);
      setCategories(cats?.categories || []);

      const list = await grimoireApi.listEntries({
        category: activeCategory,
        q: debouncedQuery,
        role: role === 'all' ? undefined : role,
        format: 'pdf',
        per_page: 50,
      }, signal);

      const data = list?.entries?.data || [];
      setEntries(data);

      if (data.length && (!selected || !data.find(d => d.id === selected?.id))) {
        setSelected(data[0]);
      }
      if (!data.length) setSelected(null);
    } catch (e: any) {
      if (e?.name === 'CanceledError' || e?.code === 'ERR_CANCELED') return;
      setErr('Gagal memuat pedoman.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const ctrl = new AbortController();
    load(ctrl.signal);
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, debouncedQuery, role]);

  const filtered = useMemo(() => entries, [entries]);

  const isSelectedPdf = selected ? isPdf(selected as any) : false;
  const pdfUrlAbs = selected ? toAbsoluteUrl((selected as any).file_url || null) : null;
  const iframeSrc = pdfUrlAbs
    ? (pdfUrlAbs.includes('#') ? pdfUrlAbs : `${pdfUrlAbs}#view=FitH`)
    : null;

  // Debug opsional
  useEffect(() => {
    if (selected) {
      console.log('DEBUG selected:', selected);
      console.log('DEBUG file_url:', (selected as any).file_url);
      console.log('DEBUG absolute:', pdfUrlAbs);
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
              onChange={(e) => setQuery(e.target.value)}
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
            ) : filtered.map((e) => (
              <button
                key={e.id}
                onClick={() => setSelected(e)}
                className={`text-left p-3 rounded-lg border bg-stone-900/50 hover:border-amber-600 ${selected?.id === e.id ? 'border-amber-600' : 'border-stone-700'}`}
              >
                <div className="font-semibold text-stone-100">{e.title}</div>
                {(e as any).summary && (
                  <div className="text-stone-400 text-sm">{(e as any).summary}</div>
                )}
                <div className="mt-2 flex gap-2">
                  <Badge className="bg-stone-700 text-stone-200">{(e as any).role_access}</Badge>
                  <Badge className="bg-stone-700 text-stone-200">PDF</Badge>
                </div>
              </button>
            ))}
          </div>

          <div className="col-span-12">
            {selected ? (
              isSelectedPdf && iframeSrc ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-stone-200 font-medium">{(selected as any).title}</div>
                    <div className="flex gap-4">
                      <a href={pdfUrlAbs || undefined} target="_blank" rel="noreferrer" className="text-amber-300 hover:underline">
                        Buka di tab baru →
                      </a>
                      <a href={pdfUrlAbs || undefined} download className="text-amber-300 hover:underline">
                        ⬇ Unduh PDF
                      </a>
                    </div>
                  </div>

                  <iframe
                    key={iframeSrc}
                    src={iframeSrc}
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
