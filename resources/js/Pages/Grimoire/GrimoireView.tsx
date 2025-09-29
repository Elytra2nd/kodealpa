// resources/js/Pages/Grimoire/GrimoireView.tsx
import React, { useEffect, useState } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { grimoireApi } from '@/services/grimoireApi';
import type { GrimoireEntry } from '@/types/grimoire';
import { motion } from 'framer-motion';

function isPdf(entry: any): boolean {
  const ct = (entry?.content_type || '').toLowerCase();
  const url = entry?.file_url || '';
  return ct === 'application/pdf' || /\.pdf($|\?)/i.test(url);
}

function toAbsoluteUrl(u?: string | null): string | null {
  if (!u) return null;
  try {
    // Jika sudah absolut
    if (/^https?:\/\//i.test(u)) return u;
    // Root-relative → gabungkan dengan origin
    const base = window.location.origin.replace(/\/+$/, '');
    const path = u.startsWith('/') ? u : `/${u}`;
    return `${base}${path}`;
  } catch {
    return u || null;
  }
}

export default function GrimoireViewPage({ slug }: { slug: string }) {
  const page = usePage() as any;
  const effectiveSlug = slug || page?.props?.slug || '';

  const [entry, setEntry] = useState<(GrimoireEntry & { file_url?: string; content_type?: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const { entry } = await grimoireApi.getEntry(effectiveSlug);
      setEntry(entry);
    } catch (e: any) {
      setErr('Gagal memuat pedoman.');
      setEntry(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (effectiveSlug) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveSlug]);

  const pdfMode = entry ? isPdf(entry as any) : false;
  const pdfUrlAbs = toAbsoluteUrl((entry as any)?.file_url || null);

  return (
    <AuthenticatedLayout
      header={<h2 className="text-xl font-semibold leading-tight text-emerald-300">📖 Lihat Pedoman</h2>}
    >
      <Head title={entry ? entry.title : 'Memuat pedoman...'} />
      <div className="min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-emerald-950 py-10">
        <div className="mx-auto max-w-4xl sm:px-6 lg:px-8 space-y-6">
          <Card className="border-3 border-emerald-700 bg-emerald-900/20">
            <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <CardTitle className="text-emerald-300">
                  {loading ? 'Memuat...' : entry?.title}
                </CardTitle>
                {!loading && entry && (
                  <div className="mt-2 flex items-center gap-2">
                    <Badge className="bg-stone-800 text-stone-200">{entry.role_access}</Badge>
                    <Badge className="bg-stone-800 text-stone-200">{entry.difficulty}</Badge>
                    {entry.tags?.map((t) => (
                      <Badge key={t} className="bg-stone-800 text-stone-200">#{t}</Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="text-right">
                <Link href="/grimoire" className="text-emerald-300 hover:underline">
                  ← Kembali ke Grimoire
                </Link>
              </div>
            </CardHeader>

            <CardContent>
              {loading && (
                <div className="flex flex-col items-center justify-center py-10 text-stone-300">
                  <div className="w-10 h-10 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mb-4"></div>
                  Memuat pedoman...
                </div>
              )}

              {!loading && err && (
                <div className="text-rose-300">{err}</div>
              )}

              {!loading && entry && !err && (
                <motion.div key={entry.slug} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                  {pdfMode && pdfUrlAbs ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-stone-200 font-medium">{entry.title}</div>
                        <div className="flex gap-4">
                          <a href={pdfUrlAbs} target="_blank" rel="noreferrer" className="text-emerald-300 hover:underline">Buka di tab baru →</a>
                          <a href={pdfUrlAbs} download className="text-emerald-300 hover:underline">⬇ Unduh PDF</a>
                        </div>
                      </div>

                      {/* iframe + fallback object */}
                      <div className="space-y-2">
                        <iframe
                          src={`${pdfUrlAbs}#view=FitH`}
                          className="w-full h-[80vh] rounded-lg border border-stone-700"
                          title={entry.title || 'PDF'}
                        />
                        <object data={pdfUrlAbs} type="application/pdf" className="w-full h-[80vh] rounded-lg border border-stone-700">
                          <p className="text-stone-400">
                            Viewer PDF tidak tersedia; buka di tab baru atau unduh berkas di atas.
                          </p>
                        </object>
                      </div>
                    </div>
                  ) : entry?.content_html ? (
                    <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: entry.content_html }} />
                  ) : (
                    <div className="text-stone-400 italic">File atau konten pedoman tidak ditemukan.</div>
                  )}
                </motion.div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
