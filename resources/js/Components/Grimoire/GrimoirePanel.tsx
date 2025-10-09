import React, { useEffect, useMemo, useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Badge } from '@/Components/ui/badge';
import { grimoireApi } from '@/services/grimoireApi';
import type { GrimoireCategory, GrimoireEntry } from '@/types/grimoire';
import GrimoireSidebar from './GrimoireSidebar';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface User {
  id: number;
  name: string;
  email: string;
  is_admin?: boolean;
}

interface PageProps extends Record<string, unknown> {
  auth: {
    user: User;
  };
}

function isPdf(entry: Partial<GrimoireEntry>): boolean {
  return !!(entry && (entry as any).pdf_url);
}

export default function GrimoirePanel({ role }: { role: 'defuser' | 'expert' | 'all' }) {
  const { auth } = usePage<PageProps>().props;
  const [categories, setCategories] = useState<GrimoireCategory[]>([]);
  const [entries, setEntries] = useState<GrimoireEntry[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | undefined>(undefined);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<GrimoireEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);

  // Debounce query untuk mengurangi request
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
      console.log('Loaded entries:', data);
      setEntries(data);

      if (data.length && (!selected || !data.find(d => d.id === selected?.id))) {
        setSelected(data[0]);
      }
      if (!data.length) setSelected(null);
    } catch (e: any) {
      if (e?.name === 'CanceledError' || e?.code === 'ERR_CANCELED') return;
      console.error('Error loading grimoire:', e);
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
  const pdfUrl = selected ? (selected as any).pdf_url || null : null;

  // Reset page saat dokumen berubah
  useEffect(() => {
    setPageNumber(1);
    setNumPages(null);
  }, [pdfUrl]);

  // Debug opsional
  useEffect(() => {
    if (selected) {
      console.log('DEBUG selected:', selected);
      console.log('DEBUG pdf_url:', (selected as any).pdf_url);
    }
  }, [selected, pdfUrl]);

  return (
    <Card className="bg-stone-900/40 border-stone-700">
      <CardHeader>
        <CardTitle className="text-amber-300 flex items-center justify-between">
          <span>📘 Grimoire Pedoman (PDF)</span>
          <div className="flex items-center gap-3">
            <Badge className="bg-purple-700 text-purple-100">{role.toUpperCase()}</Badge>
            {/* ✅ Only show admin link if user is admin */}
            {auth.user?.is_admin && (
              <Link
                href="/admin/grimoire/create"
                className="px-3 py-1.5 bg-emerald-700 text-emerald-100 rounded-md hover:bg-emerald-600 transition-colors text-sm font-medium inline-flex items-center gap-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Tulis Pedoman
              </Link>
            )}
          </div>
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
              className="bg-stone-900 border-stone-700 text-stone-200 placeholder-stone-500"
            />
            <Badge className="bg-stone-700 text-stone-200 whitespace-nowrap">
              {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
            </Badge>
          </div>

          <div className="col-span-12 grid md:grid-cols-2 gap-3 max-h-64 overflow-auto pr-2">
            {loading ? (
              <div className="col-span-2 text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-amber-500 border-t-transparent"></div>
                <p className="text-stone-300 mt-2">Memuat pedoman...</p>
              </div>
            ) : err ? (
              <div className="col-span-2 text-center py-8">
                <div className="text-rose-400 bg-rose-900/20 border border-rose-700 rounded-lg p-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {err}
                </div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="col-span-2 text-center py-8">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-stone-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-stone-400">
                  Tidak ada pedoman PDF untuk filter saat ini.
                </p>
                <p className="text-stone-500 text-sm mt-1">
                  Coba ubah kategori atau kata kunci pencarian.
                </p>
              </div>
            ) : (
              filtered.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setSelected(e)}
                  className={`text-left p-3 rounded-lg border bg-stone-900/50 hover:border-amber-600 transition-all ${
                    selected?.id === e.id ? 'border-amber-600 shadow-lg shadow-amber-600/20' : 'border-stone-700'
                  }`}
                >
                  <div className="font-semibold text-stone-100 mb-1">{e.title}</div>
                  {(e as any).summary && (
                    <div className="text-stone-400 text-sm line-clamp-2 mb-2">
                      {(e as any).summary}
                    </div>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    <Badge className="bg-stone-700 text-stone-200 text-xs">
                      {(e as any).role_access}
                    </Badge>
                    <Badge className="bg-red-700 text-red-100 text-xs">
                      📄 PDF
                    </Badge>
                    {(e as any).difficulty && (
                      <Badge className="bg-purple-700 text-purple-100 text-xs">
                        {(e as any).difficulty}
                      </Badge>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="col-span-12">
            {selected ? (
              isSelectedPdf && pdfUrl ? (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-stone-900/50 rounded-lg border border-stone-700">
                    <div>
                      <div className="text-stone-200 font-semibold text-lg">
                        {(selected as any).title}
                      </div>
                      {(selected as any).category && (
                        <div className="text-stone-400 text-sm mt-1">
                          Kategori: {(selected as any).category.name}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <a
                        href={pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-amber-700 text-amber-100 rounded hover:bg-amber-600 transition-colors text-sm font-medium inline-flex items-center gap-1"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Buka di Tab Baru
                      </a>
                      <a
                        href={pdfUrl}
                        download
                        className="px-3 py-1.5 bg-stone-700 text-stone-200 rounded hover:bg-stone-600 transition-colors text-sm font-medium inline-flex items-center gap-1"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Unduh PDF
                      </a>
                    </div>
                  </div>
                  <div className="bg-stone-900 rounded-lg border border-stone-700 p-4">
                    <Document
                      file={pdfUrl}
                      onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                      loading={
                        <div className="text-center py-12">
                          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-amber-500 border-t-transparent"></div>
                          <p className="text-stone-400 mt-2">Memuat PDF...</p>
                        </div>
                      }
                      error={
                        <div className="text-center py-12">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-rose-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-rose-400">Gagal memuat PDF.</p>
                          <p className="text-stone-500 text-sm mt-1">Coba buka di tab baru.</p>
                        </div>
                      }
                    >
                      <Page pageNumber={pageNumber} width={800} className="mx-auto" />
                    </Document>
                    {numPages && numPages > 1 && (
                      <div className="flex items-center justify-center gap-3 mt-4 pt-4 border-t border-stone-700">
                        <button
                          className="px-4 py-2 bg-stone-800 text-stone-200 rounded hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                          onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                          disabled={pageNumber <= 1}
                        >
                          ← Prev
                        </button>
                        <span className="text-stone-300 font-medium">
                          Halaman {pageNumber} dari {numPages}
                        </span>
                        <button
                          className="px-4 py-2 bg-stone-800 text-stone-200 rounded hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                          onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
                          disabled={pageNumber >= numPages}
                        >
                          Next →
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 bg-stone-900/50 rounded-lg border border-stone-700">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-stone-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-stone-400">
                    {pdfUrl
                      ? 'Tidak dapat menampilkan PDF dari URL tersebut.'
                      : 'Entri tidak memiliki file PDF yang valid.'}
                  </p>
                </div>
              )
            ) : (
              <div className="text-center py-12 bg-stone-900/50 rounded-lg border border-stone-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-stone-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <p className="text-stone-400 text-lg">Pilih pedoman PDF untuk melihat isinya</p>
                <p className="text-stone-500 text-sm mt-1">Klik salah satu pedoman di atas</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
