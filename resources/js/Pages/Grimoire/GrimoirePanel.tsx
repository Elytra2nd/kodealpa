import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import GrimoirePanelBody from '@/Components/Grimoire/GrimoirePanel';

export default function GrimoirePanelPage() {
  return (
    <AuthenticatedLayout
      header={
        <h2 className="text-xl font-semibold leading-tight text-emerald-300">
          📘 Grimoire Pedoman
        </h2>
      }
    >
      <Head title="Grimoire Pedoman" />
      <div className="min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-emerald-950 py-10">
        <div className="mx-auto max-w-7xl sm:px-6 lg:px-8 space-y-6">
          <Card className="border-3 border-emerald-700 bg-emerald-900/20">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-emerald-300">Pustaka Pedoman</CardTitle>
              <div className="flex items-center gap-2">
                <Badge className="bg-stone-800 text-stone-200">Searchable</Badge>
                <Badge className="bg-stone-800 text-stone-200">Role-aware</Badge>
                <Link href="/grimoire/editor" className="text-emerald-300 hover:underline">
                  + Tulis Pedoman
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {/* Panel utama yang sudah menangani preview PDF dengan react-pdf */}
              <GrimoirePanelBody role="all" />
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
