import React, { useState, useMemo } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/Components/ui/table';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from '@/types';

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
  category?: Category;
  role_access: 'all' | 'defuser' | 'expert';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  is_published: boolean;
  pdf_path?: string;
  pdf_url?: string;
  version: number;
  created_at: string;
  updated_at: string;
}

interface PageProps {
  auth: {
    user: User;
  };
  entries: {
    data: GrimoireEntry[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: {
      first: string | null;
      last: string | null;
      prev: string | null;
      next: string | null;
    };
  };
  categories: Category[];
  filters: {
    search?: string;
    category?: string;
    status?: string;
  };
  flash?: {
    success?: string;
    error?: string;
  };
  [key: string]: any;
}

// ✅ Delete Confirmation Modal Component
interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  entry: GrimoireEntry | null;
  isDeleting: boolean;
}

function DeleteModal({ isOpen, onClose, onConfirm, entry, isDeleting }: DeleteModalProps) {
  if (!entry) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="bg-stone-900 border-2 border-red-700 rounded-lg shadow-2xl max-w-md w-full overflow-hidden"
            >
              {/* Header */}
              <div className="bg-red-900/20 border-b border-red-700 p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-red-900/50 rounded-full">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-8 w-8 text-red-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-red-300">Konfirmasi Hapus</h3>
                    <p className="text-stone-400 text-sm mt-1">Tindakan ini tidak dapat dibatalkan</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                <div className="bg-stone-800/50 border border-stone-700 rounded-lg p-4">
                  <div className="text-stone-400 text-sm mb-1">Anda akan menghapus:</div>
                  <div className="text-stone-200 font-semibold">{entry.title}</div>
                  {entry.summary && (
                    <div className="text-stone-500 text-sm mt-2 line-clamp-2">{entry.summary}</div>
                  )}
                  <div className="flex gap-2 mt-3">
                    <Badge className="bg-stone-700 text-stone-200 text-xs">
                      ID: {entry.id}
                    </Badge>
                    {entry.pdf_path && (
                      <Badge className="bg-red-700 text-red-100 text-xs">Dengan PDF</Badge>
                    )}
                  </div>
                </div>

                <div className="bg-red-900/10 border border-red-800/30 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5"
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
                    <div className="text-red-300 text-sm">
                      <div className="font-semibold mb-1">Peringatan:</div>
                      <ul className="list-disc list-inside space-y-1 text-red-400">
                        <li>Data pedoman akan dihapus permanen</li>
                        <li>File PDF akan dihapus dari server</li>
                        <li>Tidak dapat dikembalikan setelah dihapus</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <p className="text-stone-400 text-sm">
                  Apakah Anda yakin ingin melanjutkan?
                </p>
              </div>

              {/* Actions */}
              <div className="bg-stone-800/30 border-t border-stone-700 p-6 flex flex-col-reverse sm:flex-row gap-3">
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={isDeleting}
                  className="flex-1 bg-stone-800 text-stone-200 hover:bg-stone-700 border-stone-600"
                >
                  ← Batal
                </Button>
                <Button
                  onClick={onConfirm}
                  disabled={isDeleting}
                  className="flex-1 bg-red-700 hover:bg-red-600 text-white font-semibold"
                >
                  {isDeleting ? (
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
                      Menghapus...
                    </>
                  ) : (
                    <>
                      🗑️ Ya, Hapus Pedoman
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

export default function AdminGrimoireIndex() {
  const pageData = usePage<PageProps>().props;

  // ✅ Defensive destructuring
  const {
    entries = {
      data: [],
      current_page: 1,
      last_page: 1,
      per_page: 15,
      total: 0,
      links: { first: null, last: null, prev: null, next: null }
    },
    categories = [],
    filters = {},
    flash = {}
  } = pageData;

  const [search, setSearch] = useState(filters.search || '');
  const [selectedCategory, setSelectedCategory] = useState(filters.category || '');
  const [selectedStatus, setSelectedStatus] = useState(filters.status || '');

  // ✅ Delete Modal State
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    entry: GrimoireEntry | null;
    isDeleting: boolean;
  }>({
    isOpen: false,
    entry: null,
    isDeleting: false,
  });

  // Debounced search
  const handleSearch = useMemo(
    () => {
      let timeout: NodeJS.Timeout;
      return (value: string) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          router.get(
            '/admin/grimoire',
            { search: value, category: selectedCategory, status: selectedStatus },
            { preserveState: true, preserveScroll: true }
          );
        }, 300);
      };
    },
    [selectedCategory, selectedStatus]
  );

  const handleFilter = (filterType: 'category' | 'status', value: string) => {
    const params: Record<string, string> = { search };
    if (filterType === 'category') {
      params.category = value;
      setSelectedCategory(value);
    } else {
      params.status = value;
      setSelectedStatus(value);
    }

    router.get('/admin/grimoire', params, {
      preserveState: true,
      preserveScroll: true,
    });
  };

  // ✅ Open Delete Modal
  const openDeleteModal = (entry: GrimoireEntry) => {
    setDeleteModal({
      isOpen: true,
      entry,
      isDeleting: false,
    });
  };

  // ✅ Close Delete Modal
  const closeDeleteModal = () => {
    if (deleteModal.isDeleting) return; // Prevent closing while deleting
    setDeleteModal({
      isOpen: false,
      entry: null,
      isDeleting: false,
    });
  };

  // ✅ Confirm Delete
  const confirmDelete = () => {
    if (!deleteModal.entry) return;

    setDeleteModal((prev) => ({ ...prev, isDeleting: true }));

    router.delete(`/admin/grimoire/${deleteModal.entry.id}`, {
      onSuccess: () => {
        closeDeleteModal();
      },
      onError: () => {
        setDeleteModal((prev) => ({ ...prev, isDeleting: false }));
      },
    });
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'defuser':
        return 'bg-blue-700 text-blue-100';
      case 'expert':
        return 'bg-purple-700 text-purple-100';
      default:
        return 'bg-stone-700 text-stone-200';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-700 text-green-100';
      case 'intermediate':
        return 'bg-yellow-700 text-yellow-100';
      case 'advanced':
        return 'bg-red-700 text-red-100';
      default:
        return 'bg-stone-700 text-stone-200';
    }
  };

  return (
    <AuthenticatedLayout
      header={
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h2 className="text-xl font-semibold leading-tight text-emerald-300">
            🗂️ Kelola Grimoire Pedoman
          </h2>
          <Link href="/admin/grimoire/create">
            <Button className="bg-emerald-700 hover:bg-emerald-600 text-white">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Tulis Pedoman Baru
            </Button>
          </Link>
        </div>
      }
    >
      <Head title="Admin - Grimoire Pedoman" />

      {/* ✅ Delete Confirmation Modal */}
      <DeleteModal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
        entry={deleteModal.entry}
        isDeleting={deleteModal.isDeleting}
      />

      <div className="min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-emerald-950 py-6 sm:py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
          {/* ✅ Flash Messages with Animation */}
          <AnimatePresence>
            {flash?.success && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-emerald-900/30 border border-emerald-700 rounded-lg p-4"
              >
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
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="text-emerald-300">{flash.success}</span>
                </div>
              </motion.div>
            )}

            {flash?.error && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-red-900/30 border border-red-700 rounded-lg p-4"
              >
                <div className="flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-red-400"
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
                  <span className="text-red-300">{flash.error}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ✅ Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                    <div className="text-2xl font-bold text-stone-200">{entries.total}</div>
                    <div className="text-stone-400 text-sm">Total Pedoman</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-stone-900/40 border-stone-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-900/30 rounded-lg">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 text-green-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-stone-200">
                      {entries.data.filter((e) => e.is_published).length}
                    </div>
                    <div className="text-stone-400 text-sm">Dipublikasikan</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-stone-900/40 border-stone-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-900/30 rounded-lg">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 text-yellow-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-stone-200">
                      {entries.data.filter((e) => !e.is_published).length}
                    </div>
                    <div className="text-stone-400 text-sm">Draft</div>
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
                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-stone-200">
                      {entries.data.filter((e) => e.pdf_path).length}
                    </div>
                    <div className="text-stone-400 text-sm">Dengan PDF</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ✅ Filters */}
          <Card className="bg-stone-900/40 border-stone-700">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Search */}
                <div className="sm:col-span-3 lg:col-span-1">
                  <Input
                    type="text"
                    placeholder="🔍 Cari pedoman..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      handleSearch(e.target.value);
                    }}
                    className="bg-stone-900 border-stone-700 text-stone-200"
                  />
                </div>

                {/* Category Filter */}
                <div>
                  <select
                    value={selectedCategory}
                    onChange={(e) => handleFilter('category', e.target.value)}
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-md text-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="">Semua Kategori</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.slug}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <select
                    value={selectedStatus}
                    onChange={(e) => handleFilter('status', e.target.value)}
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-md text-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="">Semua Status</option>
                    <option value="published">Dipublikasikan</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card className="bg-stone-900/40 border-stone-700">
            <CardHeader>
              <CardTitle className="text-emerald-300">
                📋 Daftar Pedoman ({entries.total})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-stone-700 hover:bg-stone-800/50">
                      <TableHead className="text-stone-300">ID</TableHead>
                      <TableHead className="text-stone-300">Judul</TableHead>
                      <TableHead className="text-stone-300">Kategori</TableHead>
                      <TableHead className="text-stone-300">Role</TableHead>
                      <TableHead className="text-stone-300">Tingkat</TableHead>
                      <TableHead className="text-stone-300">Status</TableHead>
                      <TableHead className="text-stone-300">PDF</TableHead>
                      <TableHead className="text-stone-300 text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.data.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-center py-12 text-stone-400"
                        >
                          <div className="flex flex-col items-center gap-3">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-12 w-12 text-stone-600"
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
                            <div>
                              <p className="font-medium">Tidak ada pedoman</p>
                              <p className="text-sm text-stone-500 mt-1">
                                Buat pedoman baru untuk memulai
                              </p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      entries.data.map((entry, index) => (
                        <motion.tr
                          key={entry.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="border-stone-700 hover:bg-stone-800/30"
                        >
                          <TableCell className="text-stone-400 font-mono text-sm">
                            #{entry.id}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="text-stone-200 font-medium line-clamp-1">
                                {entry.title}
                              </div>
                              {entry.summary && (
                                <div className="text-stone-500 text-xs line-clamp-1 mt-1">
                                  {entry.summary}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-stone-700 text-stone-200 text-xs">
                              {entry.category?.name || '-'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${getRoleColor(entry.role_access)} text-xs`}>
                              {entry.role_access}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={`${getDifficultyColor(entry.difficulty)} text-xs`}
                            >
                              {entry.difficulty}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {entry.is_published ? (
                              <Badge className="bg-green-700 text-green-100 text-xs">
                                ✅ Published
                              </Badge>
                            ) : (
                              <Badge className="bg-yellow-700 text-yellow-100 text-xs">
                                📝 Draft
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {entry.pdf_path ? (
                              <a
                                href={entry.pdf_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-400 hover:text-emerald-300 text-xs"
                              >
                                📄 View
                              </a>
                            ) : (
                              <span className="text-stone-600 text-xs">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-2">
                              <Link href={`/admin/grimoire/${entry.id}/edit`}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="bg-stone-800 text-stone-200 hover:bg-stone-700 border-stone-600"
                                >
                                  ✏️ Edit
                                </Button>
                              </Link>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => openDeleteModal(entry)}
                                className="bg-red-700 hover:bg-red-600"
                              >
                                🗑️
                              </Button>
                            </div>
                          </TableCell>
                        </motion.tr>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* ✅ Pagination */}
              {entries.last_page > 1 && (
                <div className="flex items-center justify-between p-4 border-t border-stone-700">
                  <div className="text-stone-400 text-sm">
                    Showing {entries.data.length} of {entries.total} entries
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={entries.current_page === 1}
                      onClick={() =>
                        router.get('/admin/grimoire', {
                          page: entries.current_page - 1,
                          search,
                          category: selectedCategory,
                          status: selectedStatus,
                        })
                      }
                      className="bg-stone-800 text-stone-200 hover:bg-stone-700"
                    >
                      Previous
                    </Button>
                    <span className="text-stone-400 text-sm">
                      Page {entries.current_page} of {entries.last_page}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={entries.current_page === entries.last_page}
                      onClick={() =>
                        router.get('/admin/grimoire', {
                          page: entries.current_page + 1,
                          search,
                          category: selectedCategory,
                          status: selectedStatus,
                        })
                      }
                      className="bg-stone-800 text-stone-200 hover:bg-stone-700"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
