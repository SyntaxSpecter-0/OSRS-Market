import { createClient } from '@/lib/supabase/client';

export interface ItemSearchResult {
  id: number;
  name: string;
  buyLimit: number;
}

/** Case-insensitive substring search against the `items` table. */
export async function searchItemsByName(query: string, max = 10): Promise<ItemSearchResult[]> {
  if (!query.trim()) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from('items')
    .select('id, name, buy_limit')
    .ilike('name', `%${query}%`)
    .order('name')
    .limit(max);
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, name: row.name, buyLimit: row.buy_limit }));
}
