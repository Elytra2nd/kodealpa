import React, { useState, FormEvent } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Label } from '@/Components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface GrimoireEntry {
  id: number;
  title: string;
  slug: string;
  summary?: string;
  category_id: number;
  role_access: 'all' | 'defuser' | 'expert';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  is_published: boolean;
  pdf_path?: string;
  pdf_url?: string;
  category?: Category;
}

interface Props {
  entry: GrimoireEntry;
  categories: Category[];
  errors: Record<string, string>;
}

type PageProps = Props & {
  auth: {
    user: any;
  };
  [key: string]: any;
};

export default function EditGrimoire() {
  const { entry, categories, errors } = usePage<PageProps>().props;

  const [formData, setFormData] = useState({
    title: entry.title || '',
    summary: entry.summary || '',
    category_id: entry.category_id || '',
    role_access: entry.role_access || 'all',
    difficulty: entry.difficulty || 'beginner',
    is_published: entry.is_published ? '1' : '0',
  });

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        alert('File harus berformat PDF!');
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        alert('Ukuran file maksimal 50MB!');
        return;
      }
      setPdfFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('summary', formData.summary);
      data.append('category_id', formData.category_id.toString());
      data.append('role_access', formData.role_access);
      data.append('difficulty', formData.difficulty);
      data.append('is_published', formData.is_published);
      data.append('_method', 'PUT'); // Laravel method spoofing

      if (pdfFile) {
        data.append('pdf_file', pdfFile);
      }

      router.post(`/admin/grimoire/${entry.id}`, data, {
        forceFormData: true,
        onSuccess: () => {
          alert('Pedoman berhasil diperbarui!');
        },
        onError: (errors) => {
          console.error('Validation errors:', errors);
          alert('Gagal memperbarui pedoman. Periksa form Anda.');
        },
        onFinish: () => {
          setIsSubmitting(false);
        },
      });
    } catch (error) {
      console.error('Submit error:', error);
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (
      confirm(
        `Apakah Anda yakin ingin menghapus pedoman "${entry.title}"?\n\nTindakan ini tidak dapat dibatalkan!`
      )
    ) {
      router.delete(`/admin/grimoire/${entry.id}`, {
        onSuccess: () => {
          alert('Pedoman berhasil dihapus!');
        },
        onError: () => {
          alert('Gagal menghapus pedoman!');
        },
      });
    }
  };

  return (
    <AuthenticatedLayout
      header={
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold leading-tight text-emerald-300">
            ✏️ Edit Pedoman
          </h2>
          <Button
            variant="outline"
            onClick={() => router.visit('/admin/grimoire')}
            className="bg-stone-800 text-stone-200 hover:bg-stone-700"
          >
            ← Kembali
          </Button>
        </div>
      }
    >
      <Head title={`Edit: ${entry.title}`} />

      <div className="min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-emerald-950 py-6 sm:py-10">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Main Form */}
          <Card className="bg-stone-900/40 border-stone-700">
            <CardHeader className="border-b border-stone-700">
              <CardTitle className="text-emerald-300 flex items-center gap-2">
                <span>📝 Edit Pedoman</span>
                <Badge className="bg-purple-700 text-purple-100">ID: {entry.id}</Badge>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-stone-200">
                    Judul Pedoman <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="title"
                    name="title"
                    type="text"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="Masukkan judul pedoman..."
                    className="bg-stone-900 border-stone-700 text-stone-200"
                    required
                  />
                  {errors.title && (
                    <p className="text-red-400 text-sm">{errors.title}</p>
                  )}
                </div>

                {/* Summary */}
                <div className="space-y-2">
                  <Label htmlFor="summary" className="text-stone-200">
                    Ringkasan
                  </Label>
                  <textarea
                    id="summary"
                    name="summary"
                    value={formData.summary}
                    onChange={handleInputChange}
                    placeholder="Ringkasan singkat tentang pedoman ini..."
                    rows={3}
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-md text-stone-200 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                  {errors.summary && (
                    <p className="text-red-400 text-sm">{errors.summary}</p>
                  )}
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label htmlFor="category_id" className="text-stone-200">
                    Kategori <span className="text-red-400">*</span>
                  </Label>
                  <Select
                    value={formData.category_id.toString()}
                    onValueChange={(value) => handleSelectChange('category_id', value)}
                  >
                    <SelectTrigger className="bg-stone-900 border-stone-700 text-stone-200">
                      <SelectValue placeholder="Pilih kategori..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.category_id && (
                    <p className="text-red-400 text-sm">{errors.category_id}</p>
                  )}
                </div>

                {/* Role Access & Difficulty */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="role_access" className="text-stone-200">
                      Akses Role <span className="text-red-400">*</span>
                    </Label>
                    <Select
                      value={formData.role_access}
                      onValueChange={(value) => handleSelectChange('role_access', value)}
                    >
                      <SelectTrigger className="bg-stone-900 border-stone-700 text-stone-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua</SelectItem>
                        <SelectItem value="defuser">Defuser</SelectItem>
                        <SelectItem value="expert">Expert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="difficulty" className="text-stone-200">
                      Tingkat Kesulitan <span className="text-red-400">*</span>
                    </Label>
                    <Select
                      value={formData.difficulty}
                      onValueChange={(value) => handleSelectChange('difficulty', value)}
                    >
                      <SelectTrigger className="bg-stone-900 border-stone-700 text-stone-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Pemula</SelectItem>
                        <SelectItem value="intermediate">Menengah</SelectItem>
                        <SelectItem value="advanced">Lanjutan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Published Status */}
                <div className="space-y-2">
                  <Label htmlFor="is_published" className="text-stone-200">
                    Status Publikasi <span className="text-red-400">*</span>
                  </Label>
                  <Select
                    value={formData.is_published}
                    onValueChange={(value) => handleSelectChange('is_published', value)}
                  >
                    <SelectTrigger className="bg-stone-900 border-stone-700 text-stone-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">✅ Dipublikasikan</SelectItem>
                      <SelectItem value="0">❌ Draft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* PDF Upload */}
                <div className="space-y-2">
                  <Label htmlFor="pdf_file" className="text-stone-200">
                    File PDF {entry.pdf_path && '(Opsional - kosongkan jika tidak ingin mengganti)'}
                  </Label>

                  {entry.pdf_url && !pdfFile && (
                    <div className="p-3 bg-emerald-900/20 border border-emerald-700 rounded-lg mb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 text-emerald-400"
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
                          <span className="text-emerald-300 text-sm">PDF saat ini tersimpan</span>
                        </div>
                        <a
                          href={entry.pdf_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-400 hover:text-emerald-300 text-sm underline"
                        >
                          Lihat PDF
                        </a>
                      </div>
                    </div>
                  )}

                  <div className="relative">
                    <input
                      id="pdf_file"
                      name="pdf_file"
                      type="file"
                      accept="application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="pdf_file"
                      className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-stone-600 rounded-lg cursor-pointer hover:border-emerald-600 transition-colors bg-stone-900/50"
                    >
                      <div className="text-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-8 w-8 mx-auto text-stone-400 mb-2"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                          />
                        </svg>
                        {pdfFile ? (
                          <span className="text-emerald-300 font-medium">
                            📄 {pdfFile.name}
                          </span>
                        ) : (
                          <>
                            <span className="text-stone-300">Klik untuk upload PDF baru</span>
                            <span className="text-stone-500 text-sm block mt-1">
                              Maks. 50MB
                            </span>
                          </>
                        )}
                      </div>
                    </label>
                  </div>
                  {errors.pdf_file && (
                    <p className="text-red-400 text-sm">{errors.pdf_file}</p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-stone-700">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white font-medium"
                  >
                    {isSubmitting ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        💾 Simpan Perubahan
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    onClick={handleDelete}
                    variant="destructive"
                    disabled={isSubmitting}
                    className="sm:w-auto bg-red-700 hover:bg-red-600"
                  >
                    🗑️ Hapus Pedoman
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="bg-blue-900/20 border-blue-700">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-blue-400 flex-shrink-0 mt-0.5"
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
                <div className="text-blue-200 text-sm space-y-1">
                  <p className="font-semibold">Tips:</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-300">
                    <li>Judul sebaiknya jelas dan deskriptif</li>
                    <li>Ringkasan membantu user menemukan pedoman yang tepat</li>
                    <li>Upload PDF baru hanya jika ingin mengganti file lama</li>
                    <li>Draft tidak akan tampil di halaman publik</li>
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
