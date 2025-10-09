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
        <h2 className="text-xl font-semibold leading-tight text-emerald-300">
          📘 Grimoire Pedoman
        </h2>
      }
    >
      <Head title="Grimoire Pedoman" />

      <div className="min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-emerald-950 py-6 sm:py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Card className="border-2 border-emerald-700/50 bg-emerald-900/10 backdrop-blur-sm shadow-2xl">
            <CardHeader className="border-b border-emerald-700/30">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <CardTitle className="text-xl sm:text-2xl text-emerald-300 font-bold">
                  📚 Pustaka Pedoman
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

                  {/* ✅ Only show if user is admin - no duplication since GrimoirePanel also checks */}
                  {/* Removed duplicate "Tulis Pedoman" link */}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {/* ✅ GrimoirePanel already handles "Tulis Pedoman" button based on user role */}
              <GrimoirePanelBody role="all" />
            </CardContent>
          </Card>

          {/* ✅ Additional info section */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-stone-900/40 border-stone-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-900/30 rounded-lg">
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
                    <div className="text-stone-400 text-xs">Koleksi</div>
                    <div className="text-stone-200 font-semibold">Pedoman PDF</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-stone-900/40 border-stone-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-900/30 rounded-lg">
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
                    <div className="text-stone-400 text-xs">Fitur</div>
                    <div className="text-stone-200 font-semibold">Pencarian Cepat</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-stone-900/40 border-stone-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-900/30 rounded-lg">
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
                    <div className="text-stone-400 text-xs">Akses</div>
                    <div className="text-stone-200 font-semibold">
                      {auth.user?.is_admin ? 'Admin' : 'User'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ✅ Help section */}
          <Card className="mt-6 bg-stone-900/40 border-stone-700">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <div className="p-3 bg-blue-900/30 rounded-lg">
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
                  <h3 className="text-stone-200 font-semibold mb-2">Cara Menggunakan</h3>
                  <ul className="text-stone-400 text-sm space-y-1">
                    <li>• Gunakan <strong className="text-stone-300">pencarian</strong> untuk menemukan pedoman spesifik</li>
                    <li>• Filter berdasarkan <strong className="text-stone-300">kategori</strong> untuk mempersempit hasil</li>
                    <li>• Klik pedoman untuk <strong className="text-stone-300">preview PDF</strong> langsung di browser</li>
                    <li>• Gunakan tombol <strong className="text-stone-300">unduh</strong> untuk menyimpan offline</li>
                    {auth.user?.is_admin && (
                      <li className="text-emerald-400">
                        • Sebagai admin, gunakan tombol <strong>"Tulis Pedoman"</strong> untuk menambah konten baru
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
