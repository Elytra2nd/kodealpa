import React from 'react';
import { Head, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import GrimoirePanelBody from '@/Components/Grimoire/GrimoirePanel';

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

export default function GrimoirePanelPage() {
  const { auth } = usePage<PageProps>().props;

  return (
    <AuthenticatedLayout
      header={
        <>
          📘 Grimoire Pedoman
        </>
      }
    >
      <Head title="Grimoire Pedoman" />

      <div className="space-y-6">
        {/* Main Grimoire Panel */}
        <Card className="border-2 border-emerald-700/50 bg-gradient-to-br from-stone-900/90 to-emerald-950/20 backdrop-blur-sm shadow-2xl">
          <CardHeader className="border-b border-emerald-700/30 bg-emerald-900/10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <CardTitle className="text-xl sm:text-2xl text-emerald-300 font-bold flex items-center gap-2">
                <span className="text-2xl">📚</span>
                Pustaka Pedoman
              </CardTitle>

              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="bg-stone-800/50 text-stone-200 border-stone-600 text-xs"
                >
                  🔍 Pencarian
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-stone-800/50 text-stone-200 border-stone-600 text-xs"
                >
                  👤 Role-aware
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-purple-800/50 text-purple-200 border-purple-600 text-xs"
                >
                  📄 PDF Viewer
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <GrimoirePanelBody role="all" />
          </CardContent>
        </Card>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-2 border-stone-700 bg-gradient-to-b from-stone-900 to-stone-800 hover:border-emerald-700/50 transition-all duration-300 group">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-900/30 rounded-lg group-hover:bg-emerald-900/50 transition-colors">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-emerald-400"
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
                </div>
                <div>
                  <div className="text-stone-400 text-xs mb-1">Koleksi</div>
                  <div className="text-stone-200 font-semibold">Pedoman PDF</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-stone-700 bg-gradient-to-b from-stone-900 to-stone-800 hover:border-purple-700/50 transition-all duration-300 group">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-900/30 rounded-lg group-hover:bg-purple-900/50 transition-colors">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-purple-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <div>
                  <div className="text-stone-400 text-xs mb-1">Fitur</div>
                  <div className="text-stone-200 font-semibold">Pencarian Cepat</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-stone-700 bg-gradient-to-b from-stone-900 to-stone-800 hover:border-amber-700/50 transition-all duration-300 group">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-900/30 rounded-lg group-hover:bg-amber-900/50 transition-colors">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-amber-400"
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
                </div>
                <div>
                  <div className="text-stone-400 text-xs mb-1">Akses</div>
                  <div className="text-stone-200 font-semibold">
                    {auth.user?.is_admin ? (
                      <span className="text-emerald-300">Admin</span>
                    ) : (
                      <span className="text-blue-300">User</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Help Section */}
        <Card className="border-2 border-stone-700 bg-gradient-to-br from-stone-900/90 to-blue-950/20">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className="p-3 bg-blue-900/30 rounded-lg flex-shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-blue-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-stone-200 font-semibold text-lg mb-3 flex items-center gap-2">
                  <span>💡</span>
                  Cara Menggunakan Grimoire
                </h3>
                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-stone-300 text-sm">
                    <span className="text-emerald-400 mt-0.5">▸</span>
                    <p>
                      Gunakan <strong className="text-emerald-300">pencarian</strong> untuk menemukan pedoman spesifik berdasarkan judul atau kata kunci
                    </p>
                  </div>
                  <div className="flex items-start gap-2 text-stone-300 text-sm">
                    <span className="text-purple-400 mt-0.5">▸</span>
                    <p>
                      Filter berdasarkan <strong className="text-purple-300">kategori</strong> untuk mempersempit hasil pencarian
                    </p>
                  </div>
                  <div className="flex items-start gap-2 text-stone-300 text-sm">
                    <span className="text-blue-400 mt-0.5">▸</span>
                    <p>
                      Klik pedoman untuk <strong className="text-blue-300">preview PDF</strong> langsung di browser tanpa unduhan
                    </p>
                  </div>
                  <div className="flex items-start gap-2 text-stone-300 text-sm">
                    <span className="text-amber-400 mt-0.5">▸</span>
                    <p>
                      Gunakan tombol <strong className="text-amber-300">unduh</strong> untuk menyimpan pedoman secara offline
                    </p>
                  </div>
                  {auth.user?.is_admin && (
                    <div className="flex items-start gap-2 text-emerald-300 text-sm mt-3 p-3 bg-emerald-900/20 rounded-lg border border-emerald-700/30">
                      <span className="text-emerald-400 mt-0.5">✦</span>
                      <p>
                        <strong>Akses Admin:</strong> Gunakan tombol <strong>"Tulis Pedoman"</strong> untuk menambahkan konten baru ke dalam pustaka
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Tips */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-2 border-stone-700 bg-gradient-to-br from-stone-900 to-purple-950/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-purple-300 flex items-center gap-2">
                <span>🎯</span>
                Tips Pencarian Efektif
              </CardTitle>
            </CardHeader>
            <CardContent className="text-stone-300 text-sm space-y-2">
              <p>• Gunakan kata kunci spesifik untuk hasil lebih akurat</p>
              <p>• Coba sinonim jika tidak menemukan hasil yang diinginkan</p>
              <p>• Filter kategori membantu mempersempit pencarian</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-stone-700 bg-gradient-to-br from-stone-900 to-amber-950/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-amber-300 flex items-center gap-2">
                <span>📖</span>
                Navigasi Pedoman
              </CardTitle>
            </CardHeader>
            <CardContent className="text-stone-300 text-sm space-y-2">
              <p>• Scroll untuk melihat lebih banyak pedoman</p>
              <p>• Klik judul untuk membuka preview lengkap</p>
              <p>• Badge menunjukkan kategori dan peran yang relevan</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
