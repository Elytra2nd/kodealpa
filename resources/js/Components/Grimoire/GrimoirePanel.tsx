import React, { useEffect, useMemo, useState, useCallback } from 'react';
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

// ✅ Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = '/js/pdf.worker.min.js';

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
  const [pdfWidth, setPdfWidth] = useState<number>(800);

  // ✅ Responsive PDF width
  useEffect(() => {
    const updateWidth = () => {
      const container = document.getElementById('pdf-container');
      if (container) {
        const containerWidth = container.offsetWidth;
        setPdfWidth(Math.min(containerWidth - 32, 800)); // 32px for padding
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // ✅ Debounce query
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  // ✅ Memoized load function
  const load = useCallback(async (signal: AbortSignal) => {
    setLoading(true);
    setErr(null);
    try {
      const cats = await grimoireApi.getCategories(signal);
      setCategories(cats?.categories || []);

      const list = await grimoireApi.listEntries(
        {
          category: activeCategory,
          q: debouncedQuery,
          role: role === 'all' ? undefined : role,
          format: 'pdf',
          per_page: 50,
        },
        signal
      );

      const data = list?.entries?.data || [];
      setEntries(data);

      if (data.length && (!selected || !data.find((d) => d.id === selected?.id))) {
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
  }, [activeCategory, debouncedQuery, role, selected]);

  useEffect(() => {
    const ctrl = new AbortController();
    load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);

  const filtered = useMemo(() => entries, [entries]);
  const isSelectedPdf = selected ? isPdf(selected as any) : false;
  const pdfUrl = selected ? (selected as any).pdf_url || null : null;

  // ✅ Reset page when document changes
  useEffect(() => {
    setPageNumber(1);
    setNumPages(null);
  }, [pdfUrl]);

  // ✅ Navigation handlers
  const handlePrevPage = useCallback(() => {
    setPageNumber((p) => Math.max(1, p - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setPageNumber((p) => (numPages ? Math.min(numPages, p + 1) : p));
  }, [numPages]);

  return (
    <Card className="bg-stone-900/40 border-stone-700">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <span className="text-lg sm:text-xl">📘 Grimoire Pedoman</span>
          <div className="flex items-center gap-2 sm:gap-3">
            <Badge className="bg-purple-700 text-purple-100 text-xs sm:text-sm">
              {role.toUpperCase()}
            </Badge>
            {auth.user?.is_admin && (
              <Link
                href="/admin/grimoire/create"
                className="px-2 py-1 sm:px-3 sm:py-1.5 bg-emerald-700 text-emerald-100 rounded-md hover:bg-emerald-600 transition-colors text-xs sm:text-sm font-medium inline-flex items-center gap-1"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3 w-3 sm:h-4 sm:w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">Tulis Pedoman</span>
                <span className="sm:hidden">Buat</span>
              </Link>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* ✅ Sidebar - Collapsible on mobile */}
          <div className="lg:col-span-3">
            <GrimoireSidebar
              categories={categories}
              activeCategory={activeCategory}
              onSelectCategory={setActiveCategory}
            />
          </div>

          {/* ✅ Main Content */}
          <div className="lg:col-span-9 space-y-4">
            {/* Search Bar */}
            <div className="flex items-center gap-2">
              <Input
                placeholder="Cari pedoman..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="bg-stone-900 border-stone-700 text-stone-200 placeholder-stone-500 text-sm sm:text-base"
              />
              <Badge className="bg-stone-700 text-stone-200 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3">
                {filtered.length}
              </Badge>
            </div>

            {/* Entry List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-stone-700 scrollbar-track-stone-900">
              {loading ? (
                <div className="col-span-full text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-amber-500 border-t-transparent"></div>
                  <p className="text-stone-300 mt-2 text-sm">Memuat pedoman...</p>
                </div>
              ) : err ? (
                <div className="col-span-full text-center py-8">
                  <div className="text-rose-400 bg-rose-900/20 border border-rose-700 rounded-lg p-4">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="text-sm">{err}</p>
                  </div>
                </div>
              ) : filtered.length === 0 ? (
                <div className="col-span-full text-center py-8">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-stone-600 mb-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p className="text-stone-400 text-sm">Tidak ada pedoman PDF.</p>
                  <p className="text-stone-500 text-xs mt-1">Coba ubah filter pencarian.</p>
                </div>
              ) : (
                filtered.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => setSelected(e)}
                    className={`text-left p-3 rounded-lg border bg-stone-900/50 hover:border-amber-600 transition-all ${
                      selected?.id === e.id
                        ? 'border-amber-600 shadow-lg shadow-amber-600/20'
                        : 'border-stone-700'
                    }`}
                    aria-label={`Select ${e.title}`}
                  >
                    <div className="font-semibold text-stone-100 mb-1 text-sm sm:text-base line-clamp-1">
                      {e.title}
                    </div>
                    {(e as any).summary && (
                      <div className="text-stone-400 text-xs sm:text-sm line-clamp-2 mb-2">
                        {(e as any).summary}
                      </div>
                    )}
                    <div className="flex gap-2 flex-wrap">
                      <Badge className="bg-stone-700 text-stone-200 text-xs">
                        {(e as any).role_access}
                      </Badge>
                      <Badge className="bg-red-700 text-red-100 text-xs">📄 PDF</Badge>
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

            {/* ✅ PDF Preview */}
            <div id="pdf-container" className="space-y-3">
              {selected ? (
                isSelectedPdf && pdfUrl ? (
                  <>
                    {/* PDF Header */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 sm:p-4 bg-stone-900/50 rounded-lg border border-stone-700">
                      <div className="flex-1 min-w-0">
                        <div className="text-stone-200 font-semibold text-base sm:text-lg truncate">
                          {(selected as any).title}
                        </div>
                        {(selected as any).category && (
                          <div className="text-stone-400 text-xs sm:text-sm mt-1">
                            Kategori: {(selected as any).category.name}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <a
                          href={pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 sm:flex-none px-3 py-1.5 bg-amber-700 text-amber-100 rounded hover:bg-amber-600 transition-colors text-xs sm:text-sm font-medium inline-flex items-center justify-center gap-1"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3 w-3 sm:h-4 sm:w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                          <span className="hidden sm:inline">Buka</span>
                          <span className="sm:hidden">Tab Baru</span>
                        </a>
                        <a
                          href={pdfUrl}
                          download
                          className="flex-1 sm:flex-none px-3 py-1.5 bg-stone-700 text-stone-200 rounded hover:bg-stone-600 transition-colors text-xs sm:text-sm font-medium inline-flex items-center justify-center gap-1"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3 w-3 sm:h-4 sm:w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                            />
                          </svg>
                          Unduh
                        </a>
                      </div>
                    </div>

                    {/* PDF Viewer */}
                    <div className="bg-stone-900 rounded-lg border border-stone-700 p-2 sm:p-4 overflow-hidden">
                      <div className="flex justify-center">
                        <Document
                          file={pdfUrl}
                          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                          loading={
                            <div className="text-center py-12">
                              <div className="inline-block animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-4 border-amber-500 border-t-transparent"></div>
                              <p className="text-stone-400 mt-2 text-sm">Memuat PDF...</p>
                            </div>
                          }
                          error={
                            <div className="text-center py-12">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-rose-400 mb-2"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              <p className="text-rose-400 text-sm">Gagal memuat PDF.</p>
                              <p className="text-stone-500 text-xs mt-1">Coba buka di tab baru.</p>
                            </div>
                          }
                        >
                          <Page
                            pageNumber={pageNumber}
                            width={pdfWidth}
                            className="mx-auto shadow-lg"
                            renderTextLayer={true}
                            renderAnnotationLayer={true}
                          />
                        </Document>
                      </div>

                      {/* Pagination */}
                      {numPages && numPages > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-4 pt-4 border-t border-stone-700">
                          <button
                            className="w-full sm:w-auto px-4 py-2 bg-stone-800 text-stone-200 rounded hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
                            onClick={handlePrevPage}
                            disabled={pageNumber <= 1}
                            aria-label="Previous page"
                          >
                            ← Sebelumnya
                          </button>
                          <span className="text-stone-300 font-medium text-sm whitespace-nowrap">
                            Hal. {pageNumber} / {numPages}
                          </span>
                          <button
                            className="w-full sm:w-auto px-4 py-2 bg-stone-800 text-stone-200 rounded hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
                            onClick={handleNextPage}
                            disabled={pageNumber >= numPages}
                            aria-label="Next page"
                          >
                            Selanjutnya →
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 bg-stone-900/50 rounded-lg border border-stone-700">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-stone-600 mb-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <p className="text-stone-400 text-sm">
                      {pdfUrl
                        ? 'Tidak dapat menampilkan PDF.'
                        : 'Entri tidak memiliki file PDF.'}
                    </p>
                  </div>
                )
              ) : (
                <div className="text-center py-12 bg-stone-900/50 rounded-lg border border-stone-700">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-stone-600 mb-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                  <p className="text-stone-400 text-base sm:text-lg">Pilih pedoman untuk melihat</p>
                  <p className="text-stone-500 text-xs sm:text-sm mt-1">Klik salah satu pedoman di atas</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
