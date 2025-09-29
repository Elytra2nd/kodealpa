// resources/js/services/grimoireApi.ts
import axios, { AxiosInstance } from 'axios';
import type { GrimoireCategory, GrimoireEntry } from '@/types/grimoire';

// Opsional: dukung override origin lewat VITE_API_BASE_URL, jika kosong pakai root-relative '/api'
const RAW_BASE = (import.meta.env.VITE_API_BASE_URL || '').toString().trim();
const BASE = RAW_BASE ? RAW_BASE.replace(/\/+$/, '') : ''; // contoh: 'https://codealpha-dungeon.tech'
const API_PREFIX = (import.meta.env.VITE_API_PREFIX || '/api').toString().trim().replace(/\/+$/, ''); // default '/api'

function apiPath(p: string): string {
  const path = p.startsWith('/') ? p : `/${p}`;
  return `${API_PREFIX}${path}`; // hasil: '/api/...'
}

const api: AxiosInstance = axios.create({
  // Jika BASE diset absolut → axios gabungkan BASE + path relatif; jika tidak, pakai origin saat ini + path '/api/...'
  baseURL: BASE || undefined,
  withCredentials: true, // aktifkan bila memakai sesi/cookie
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
});

type ListParams = {
  category?: string;
  q?: string;
  role?: 'defuser' | 'expert';
  format?: 'pdf';      // filter server-side untuk hanya PDF
  per_page?: number;   // dukungan pagination ukuran halaman
};

export const grimoireApi = {
  // Kategori
  getCategories: async (signal?: AbortSignal): Promise<{ categories: GrimoireCategory[] }> => {
    const { data } = await api.get(apiPath('/grimoire/categories'), { signal, timeout: 15000 });
    return data;
  },

  // Daftar entri (mendukung filter format=pdf)
  listEntries: async (
    params: ListParams,
    signal?: AbortSignal
  ): Promise<{ entries: { data: GrimoireEntry[] } }> => {
    const { data } = await api.get(apiPath('/grimoire/entries'), { params, signal, timeout: 15000 });
    return data;
  },

  // Detail entri per slug
  getEntry: async (slug: string, signal?: AbortSignal): Promise<{ entry: GrimoireEntry }> => {
    const { data } = await api.get(apiPath(`/grimoire/entries/${slug}`), { signal, timeout: 15000 });
    return data;
  },

  // Pencarian cepat (opsional dengan format=pdf)
  search: async (q: string, format?: 'pdf', signal?: AbortSignal): Promise<{ entries: GrimoireEntry[] }> => {
    const { data } = await api.get(apiPath('/grimoire/search'), { params: { q, format }, signal, timeout: 15000 });
    return data;
  },

  // Admin
  createEntry: async (payload: Partial<GrimoireEntry>, signal?: AbortSignal) =>
    (await api.post(apiPath('/grimoire/entries'), payload, { signal, timeout: 15000 })).data,

  updateEntry: async (id: number, payload: Partial<GrimoireEntry>, signal?: AbortSignal) =>
    (await api.put(apiPath(`/grimoire/entries/${id}`), payload, { signal, timeout: 15000 })).data,

  deleteEntry: async (id: number, signal?: AbortSignal) =>
    (await api.delete(apiPath(`/grimoire/entries/${id}`), { signal, timeout: 15000 })).data,
};
