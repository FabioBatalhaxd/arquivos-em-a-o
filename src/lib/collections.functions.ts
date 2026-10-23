import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { collectionRecordSchema, type CollectionRecord } from '@/lib/import/collections';
import type { Json } from '@/integrations/supabase/types';

export const getCollections = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const records: CollectionRecord[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await context.supabase.from('collection_records').select('brand,store,carrier,origin,uf,order_date,confirmed,quantity').order('id').range(from, from + 999);
    if (error) throw new Error('Não foi possível carregar as coletas.');
    for (const r of data ?? []) records.push({ brand: r.brand, store: r.store, carrier: r.carrier, origin: r.origin, uf: r.uf, date: r.order_date, confirmed: r.confirmed, quantity: r.quantity });
    if (!data || data.length < 1000) break;
  }
  const { data: imports } = await context.supabase.from('collection_imports').select('filename,created_at,source_rows').order('created_at', { ascending: false }).limit(1);
  return { records, latestImport: imports?.[0] ?? null };
});

export const importCollections = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ filename: z.string().min(1).max(255), sourceRows: z.number().int().min(1).max(1048576), records: z.array(collectionRecordSchema).min(1).max(60000) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: isMaster, error: roleError } = await context.supabase.rpc('dashboard_is_master');
    if (roleError || !isMaster) throw new Error('Somente o Master pode importar.');
    const { error } = await context.supabase.rpc('replace_collection_records', { _filename: data.filename, _source_rows: data.sourceRows, _records: data.records as unknown as Json });
    if (error) { console.error('collection import failed', error.message); throw new Error('Falha ao importar a planilha de coletas.'); }
    return { ok: true };
  });
