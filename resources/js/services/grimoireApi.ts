import axios from 'axios';
import type { GrimoireCategory, GrimoireEntry } from '@/types/grimoire';

const api = axios.create({ baseURL: '/api', headers: { 'X-Requested-With': 'XMLHttpRequest' } });

export const grimoireApi = {
  getCategories: async (): Promise<{ categories: GrimoireCategory[] }> => {
    const { data } = await api.get('/grimoire/categories');
    return data;
  },
  listEntries: async (params: { category?: string; q?: string; role?: 'defuser'|'expert' }): Promise<{ entries: { data: GrimoireEntry[] } }> => {
    const { data } = await api.get('/grimoire/entries', { params });
    return data;
  },
  getEntry: async (slug: string): Promise<{ entry: GrimoireEntry }> => {
    const { data } = await api.get(`/grimoire/entries/${slug}`);
    return data;
  },
  search: async (q: string): Promise<{ entries: GrimoireEntry[] }> => {
    const { data } = await api.get('/grimoire/search', { params: { q } });
    return data;
  },
  // Admin
  createEntry: async (payload: Partial<GrimoireEntry>) => (await api.post('/grimoire/entries', payload)).data,
  updateEntry: async (id: number, payload: Partial<GrimoireEntry>) => (await api.put(`/grimoire/entries/${id}`, payload)).data,
  deleteEntry: async (id: number) => (await api.delete(`/grimoire/entries/${id}`)).data,
};
