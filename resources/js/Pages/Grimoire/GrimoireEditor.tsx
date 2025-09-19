// resources/js/Pages/Grimoire/GrimoireEditor.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Checkbox } from '@/Components/ui/checkbox';
import { Badge } from '@/Components/ui/badge';
import { grimoireApi } from '@/services/grimoireApi';
import type { GrimoireCategory, GrimoireEntry } from '@/types/grimoire';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

export default function GrimoireEditorPage() {
  const { url } = usePage();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<GrimoireCategory[]>([]);
  const [entry, setEntry] = useState<GrimoireEntry | null>(null);

  // Form state
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [roleAccess, setRoleAccess] = useState<'defuser' | 'expert' | 'all'>('all');
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [tags, setTags] = useState<string>('');
  const [isPublished, setIsPublished] = useState(true);

  const editor = useEditor({
    extensions: [StarterKit],
    immediatelyRender: false,
    content: '<p>Tulis pedoman di sini...</p>',
  });

  // Parse optional ?slug= or ?id=
  const query = useMemo(() => {
    const qIndex = url.indexOf('?');
    const qs = qIndex >= 0 ? url.slice(qIndex) : '';
    return new URLSearchParams(qs);
  }, [url]);

  const load = async () => {
    setLoading(true);
    const { categories: cats } = await grimoireApi.getCategories();
    setCategories(cats);

    const slug = query.get('slug');
    if (slug) {
      const { entry } = await grimoireApi.getEntry(slug);
      setEntry(entry);
      setCategoryId(entry.category_id);
      setTitle(entry.title);
      setSummary(entry.summary ?? '');
      setRoleAccess(entry.role_access);
      setDifficulty(entry.difficulty);
      setIsPublished(entry.is_published);
      setTags((entry.tags ?? []).join(', '));
      editor?.commands.setContent(entry.content_html || '');
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const handleSave = async () => {
    const payload: Partial<GrimoireEntry> = {
      category_id: categoryId,
      slug: title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-'),
      title,
      summary,
      content_html: editor?.getHTML() ?? '',
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      role_access: roleAccess,
      difficulty,
      is_published: isPublished,
    };

    if (entry) {
      await grimoireApi.updateEntry(entry.id, payload);
      alert('Pedoman diperbarui!');
    } else {
      await grimoireApi.createEntry(payload);
      alert('Pedoman dibuat!');
    }
  };

  return (
    <AuthenticatedLayout
      header={<h2 className="text-xl font-semibold leading-tight text-emerald-300">✍️ Editor Grimoire</h2>}
    >
      <Head title={entry ? `Edit: ${entry.title}` : 'Tulis Pedoman'} />
      <div className="min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-emerald-950 py-10">
        <div className="mx-auto max-w-6xl sm:px-6 lg:px-8 space-y-6">
          <Card className="border-3 border-emerald-700 bg-emerald-900/20">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-emerald-300">
                {entry ? `Edit: ${entry.title}` : 'Buat Pedoman Baru'}
              </CardTitle>
              <div className="flex items-center gap-3">
                <Badge className="bg-stone-800 text-stone-200">Tiptap Editor</Badge>
                <Link href="/grimoire" className="text-emerald-300 hover:underline">
                  ← Kembali ke Grimoire
                </Link>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-12 gap-4">
              {/* Meta */}
              <div className="col-span-12 lg:col-span-4 space-y-3">
                <div>
                  <label className="block text-sm text-stone-300 mb-1">Judul</label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul pedoman" />
                </div>
                <div>
                  <label className="block text-sm text-stone-300 mb-1">Ringkasan</label>
                  <Input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Ringkasan singkat" />
                </div>
                <div>
                  <label className="block text-sm text-stone-300 mb-1">Kategori</label>
                  <Select
                    value={categoryId ? String(categoryId) : undefined}
                    onValueChange={(val) => setCategoryId(Number(val))}
                  >
                    <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-stone-300 mb-1">Akses Peran</label>
                    <Select value={roleAccess} onValueChange={(v) => setRoleAccess(v as any)}>
                      <SelectTrigger><SelectValue placeholder="Akses peran" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua</SelectItem>
                        <SelectItem value="defuser">Defuser</SelectItem>
                        <SelectItem value="expert">Expert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm text-stone-300 mb-1">Tingkat</label>
                    <Select value={difficulty} onValueChange={(v) => setDifficulty(v as any)}>
                      <SelectTrigger><SelectValue placeholder="Tingkat" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-stone-300 mb-1">Tags (pisah dengan koma)</label>
                  <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="symbols, mapping, checklist" />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Checkbox id="pub" checked={isPublished} onCheckedChange={(v) => setIsPublished(Boolean(v))} />
                  <label htmlFor="pub" className="text-sm text-stone-300">Terbitkan</label>
                </div>
                <div className="pt-3 flex gap-3">
                  <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">
                    💾 Simpan
                  </Button>
                  <Link href="/grimoire" className="text-emerald-300 self-center hover:underline">Batal</Link>
                </div>
              </div>
              {/* Editor */}
              <div className="col-span-12 lg:col-span-8">
                <div className="rounded-lg border border-stone-700 bg-stone-900/40 p-2">
                  <EditorContent editor={editor} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
