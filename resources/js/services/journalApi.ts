// resources/js/services/journalApi.ts
import axios from 'axios';

export interface Paginated<T> {
  current_page: number;
  data: T[];
  per_page: number;
  total: number;
  last_page: number;
  links: { url: string|null; label: string; active: boolean }[];
}

export type JournalKind = 'session'|'tournament'|'achievement';

export interface JournalItem {
  id: number;
  user_id: number;
  kind: JournalKind;
  ref_id?: number|null;
  title: string;
  status?: string|null;
  score?: number|null;
  time_taken?: number|null;
  accuracy?: number|null;
  hints_used?: number|null;
  meta?: any;
  created_at: string;
}

export const journalApi = {
  list: async (params: { kind?: JournalKind; status?: string; q?: string; page?: number; date_from?: string; date_to?: string }) => {
    const { data } = await axios.get('/api/journal', { params });
    return data as { journal: Paginated<JournalItem> };
  },
  stats: async () => {
    const { data } = await axios.get('/api/journal/stats');
    return data as { stats: Record<string, number|null> };
  },
  show: async (id: number) => {
    const { data } = await axios.get(`/api/journal/${id}`);
    return data as { entry: JournalItem };
  }
};
