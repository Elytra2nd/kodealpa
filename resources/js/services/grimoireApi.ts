// resources/js/services/grimoireApi.ts
import axios, { AxiosInstance } from 'axios';
import type { GrimoireCategory, GrimoireEntry } from '@/types/grimoire';

const RAW_BASE = (import.meta.env.VITE_API_BASE_URL || '').toString().trim();
const BASE = RAW_BASE ? RAW_BASE.replace(/\/+$/, '') : '';
const API_PREFIX = (import.meta.env.VITE_API_PREFIX || '/api').toString().trim().replace(/\/+$/, '');

function apiPath(p: string): string {
  const path = p.startsWith('/') ? p : `/${p}`;
  return `${API_PREFIX}${path}`;
}

const api: AxiosInstance = axios.create({
  baseURL: BASE || undefined,
  withCredentials: true,
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
});

type ListParams = {
  category?: string;
  q?: string;
  role?: 'defuser' | 'expert';
  format?: 'pdf';
  per_page?: number;
};

export const grimoireApi = {
  // ✅ FIX: Kategori
  getCategories: async (signal?: AbortSignal): Promise<{ categories: GrimoireCategory[] }> => {
    const response = await api.get(apiPath('/grimoire/categories'), { signal, timeout: 15000 });
    console.log('Categories API response:', response.data);

    // Response structure: { success: true, data: [...], message: "..." }
    return {
      categories: response.data.data || [],
    };
  },

  // ✅ FIX: Daftar entri
  listEntries: async (
    params: ListParams,
    signal?: AbortSignal
  ): Promise<{ entries: { data: GrimoireEntry[] } }> => {
    const response = await api.get(apiPath('/grimoire/entries'), { params, signal, timeout: 15000 });
    console.log('Entries API response:', response.data);

    // Response structure: { success: true, data: { data: [...], links: {...}, meta: {...} }, message: "..." }
    return {
      entries: response.data.data || { data: [] },
    };
  },

  // ✅ FIX: Detail entri per slug
  getEntry: async (slug: string, signal?: AbortSignal): Promise<{ entry: GrimoireEntry }> => {
    const response = await api.get(apiPath(`/grimoire/entries/${slug}`), { signal, timeout: 15000 });
    console.log('Entry API response:', response.data);

    return {
      entry: response.data.data || null,
    };
  },

  // ✅ FIX: Pencarian cepat
  search: async (q: string, format?: 'pdf', signal?: AbortSignal): Promise<{ entries: GrimoireEntry[] }> => {
    const response = await api.get(apiPath('/grimoire/search'), { params: { q, format }, signal, timeout: 15000 });
    console.log('Search API response:', response.data);

    return {
      entries: response.data.data || [],
    };
  },

  // Admin endpoints - return raw data
  createEntry: async (payload: Partial<GrimoireEntry>, signal?: AbortSignal) => {
    const response = await api.post(apiPath('/grimoire/entries'), payload, { signal, timeout: 15000 });
    return response.data;
  },

  updateEntry: async (id: number, payload: Partial<GrimoireEntry>, signal?: AbortSignal) => {
    const response = await api.put(apiPath(`/grimoire/entries/${id}`), payload, { signal, timeout: 15000 });
    return response.data;
  },

  deleteEntry: async (id: number, signal?: AbortSignal) => {
    const response = await api.delete(apiPath(`/grimoire/entries/${id}`), { signal, timeout: 15000 });
    return response.data;
  },
};
