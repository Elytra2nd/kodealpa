// resources/js/Pages/Grimoire/GrimoireView.tsx
import React, { useEffect, useState } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { grimoireApi } from '@/services/grimoireApi';
import type { GrimoireEntry } from '@/types/grimoire';

export default function GrimoireViewPage({ slug }: { slug: string }) {
  // Also support slug coming from usePage().props when not passed directly
  const page = usePage() as any;
  const effectiveSlug = slug || page?.props?.slug || '';

  const [entry, setEntry] = useState<GrimoireEntry | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { entry } = await grimoireApi.getEntry(effectiveSlug);
    setEntry(entry);
    setLoading(false);
  };

  useEffect(() => {
    if (effectiveSlug) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveSlug]);

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
              {loading && <div className="text-stone-300">Memuat pedoman...</div>}
              {!loading && entry && (
                <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: entry.content_html }} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
