import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Badge } from '@/Components/ui/badge';
import { grimoireApi } from '@/services/grimoireApi';
import type { GrimoireCategory, GrimoireEntry } from '@/types/grimoire';
import GrimoireSidebar from './GrimoireSidebar';
import GrimoireEntryView from './GrimoireEntryView';

export default function GrimoirePanel({ role }: { role: 'defuser'|'expert'|'all' }) {
  const [categories, setCategories] = useState<GrimoireCategory[]>([]);
  const [entries, setEntries] = useState<GrimoireEntry[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | undefined>(undefined);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<GrimoireEntry | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const cats = await grimoireApi.getCategories();
    setCategories(cats.categories);
    const list = await grimoireApi.listEntries({ category: activeCategory, q: query, role: role === 'all' ? undefined : role });
    setEntries(list.entries.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [activeCategory, query, role]);

  const filtered = useMemo(() => entries, [entries]);

  return (
    <Card className="bg-stone-900/40 border-stone-700">
      <CardHeader>
        <CardTitle className="text-amber-300 flex items-center justify-between">
          <span>📘 Grimoire Pedoman</span>
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
            <Input placeholder="Cari pedoman..." value={query} onChange={(e)=>setQuery(e.target.value)} />
            <Badge className="bg-stone-700 text-stone-200">{filtered.length} entries</Badge>
          </div>
          <div className="col-span-12 grid md:grid-cols-2 gap-3 max-h-64 overflow-auto pr-2">
            {loading ? (
              <div className="text-stone-300">Loading...</div>
            ) : filtered.map((e)=>(
              <button key={e.id} onClick={()=>setSelected(e)} className="text-left p-3 rounded-lg border border-stone-700 hover:border-amber-600 bg-stone-900/50">
                <div className="font-semibold text-stone-100">{e.title}</div>
                {e.summary && <div className="text-stone-400 text-sm">{e.summary}</div>}
                <div className="mt-2 flex gap-2">
                  <Badge className="bg-stone-700 text-stone-200">{e.role_access}</Badge>
                  <Badge className="bg-stone-700 text-stone-200">{e.difficulty}</Badge>
                </div>
              </button>
            ))}
          </div>
          <div className="col-span-12">
            {selected ? (
              <GrimoireEntryView entry={selected} />
            ) : (
              <div className="text-stone-400">Pilih pedoman untuk melihat isi.</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
