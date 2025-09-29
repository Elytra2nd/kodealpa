// resources/js/services/grimoireApi.ts
import axios from 'axios';
import type { GrimoireCategory, GrimoireEntry } from '@/types/grimoire';

// Root-relative baseURL → otomatis mengikuti origin (lokal/ngrok/prod)
const api = axios.create({
  baseURL: '/api',
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
});

type ListParams = {
  category?: string;
  q?: string;
  role?: 'defuser' | 'expert';
  format?: 'pdf';       // filter server-side untuk hanya PDF
  per_page?: number;    // dukungan pagination ukuran halaman
};

export const grimoireApi = {
  // Kategori
  getCategories: async (): Promise<{ categories: GrimoireCategory[] }> => {
    const { data } = await api.get('/grimoire/categories');
    return data;
  },

  // Daftar entri (mendukung filter format=pdf)
  listEntries: async (
    params: ListParams
  ): Promise<{ entries: { data: GrimoireEntry[] } }> => {
    const { data } = await api.get('/grimoire/entries', { params });
    return data;
  },

  // Detail entri per slug
  getEntry: async (slug: string): Promise<{ entry: GrimoireEntry }> => {
    const { data } = await api.get(`/grimoire/entries/${slug}`);
    return data;
  },

  // Pencarian cepat (opsional dengan format=pdf)
  search: async (q: string, format?: 'pdf'): Promise<{ entries: GrimoireEntry[] }> => {
    const { data } = await api.get('/grimoire/search', { params: { q, format } });
    return data;
  },

  // Admin
  createEntry: async (payload: Partial<GrimoireEntry>) =>
    (await api.post('/grimoire/entries', payload)).data,

  updateEntry: async (id: number, payload: Partial<GrimoireEntry>) =>
    (await api.put(`/grimoire/entries/${id}`, payload)).data,

  deleteEntry: async (id: number) =>
    (await api.delete(`/grimoire/entries/${id}`)).data,
};
