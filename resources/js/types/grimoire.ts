export interface GrimoireCategory {
  id: number;
  slug: string;
  title: string;
  icon?: string;
  sort_order: number;
}
export interface GrimoireEntry {
  id: number;
  category_id: number;
  slug: string;
  title: string;
  summary?: string;
  content_html: string;
  tags?: string[];
  role_access: 'defuser' | 'expert' | 'all';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  is_published: boolean;
  version: number;
  created_at?: string;
  updated_at?: string;
}
