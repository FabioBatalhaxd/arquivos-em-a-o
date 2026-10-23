import { z } from 'zod';
import { normalize } from '@/lib/import/records';

export const collectionRecordSchema = z.object({
  brand: z.string().min(1).max(120), store: z.string().min(1).max(200), carrier: z.string().max(120), origin: z.string().max(120),
  uf: z.string().max(40), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), confirmed: z.boolean(), quantity: z.number().int().positive(),
});
export type CollectionRecord = z.infer<typeof collectionRecordSchema>;

const REQUIRED = ['Data do Pedido', 'Nome da Loja', 'Marca', 'SITUAÇÃO2'];

function toDate(value: unknown): string {
  if (typeof value === 'number') return new Date(Date.UTC(1899, 11, 30) + value * 86400000).toISOString().slice(0, 10);
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.toISOString().slice(0, 10);
  const text = String(value ?? '').trim();
  const br = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(text);
  if (br) return `${br[3]}-${br[2]!.padStart(2, '0')}-${br[1]!.padStart(2, '0')}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  throw new Error('Data do Pedido inválida');
}

/** "CONFIRMADO" → true, "A CONFIRMAR" → false; anything else is rejected. */
export function collectionConfirmed(raw: unknown): boolean {
  const s = normalize(raw);
  if (s === 'confirmado') return true;
  if (s === 'a confirmar') return false;
  throw new Error(`Situação não reconhecida: ${String(raw ?? '')}`);
}

/** Collapses identical rows into weighted records so the import stays small. */
export function aggregateCollections(headers: string[], rows: Record<string, unknown>[]): CollectionRecord[] {
  const keys = new Map(headers.map(h => [normalize(h), h]));
  const missing = REQUIRED.filter(k => !keys.has(normalize(k)));
  if (missing.length) throw new Error(`Colunas ausentes: ${missing.join(', ')}`);
  const get = (row: Record<string, unknown>, name: string) => { const k = keys.get(normalize(name)); return k ? row[k] : undefined; };
  const groups = new Map<string, CollectionRecord>();
  rows.forEach((row, i) => {
    try {
      const brand = String(get(row, 'Marca') ?? '').trim(), store = String(get(row, 'Nome da Loja') ?? '').trim();
      if (!brand || !store) throw new Error('Marca e Nome da Loja são obrigatórios');
      const r = { brand, store, carrier: String(get(row, 'Transportadora') ?? '').trim(), origin: String(get(row, 'Origem') ?? '').trim(),
        uf: String(get(row, 'UF Destino') ?? '').trim().toUpperCase(), date: toDate(get(row, 'Data do Pedido')), confirmed: collectionConfirmed(get(row, 'SITUAÇÃO2')) };
      const key = [r.brand, r.store, r.carrier, r.origin, r.uf, r.date, r.confirmed].join('\u0001');
      const g = groups.get(key);
      if (g) g.quantity++; else groups.set(key, { ...r, quantity: 1 });
    } catch (e) { throw new Error(`Linha ${i + 2}: ${e instanceof Error ? e.message : 'Dados inválidos'}`); }
  });
  if (!groups.size) throw new Error('Planilha vazia.');
  return [...groups.values()];
}

export type CollectionRow = { name: string; pending: number; confirmed: number; total: number };
export type CollectionBrandRow = CollectionRow & { stores: CollectionRow[] };

export function summarizeCollections(records: CollectionRecord[]): { brands: CollectionBrandRow[]; total: CollectionRow } {
  const brands = new Map<string, { row: CollectionBrandRow; stores: Map<string, CollectionRow> }>();
  const total: CollectionRow = { name: 'Total Geral', pending: 0, confirmed: 0, total: 0 };
  const add = (row: CollectionRow, r: CollectionRecord) => { if (r.confirmed) row.confirmed += r.quantity; else row.pending += r.quantity; row.total += r.quantity; };
  for (const r of records) {
    let b = brands.get(r.brand);
    if (!b) { b = { row: { name: r.brand, pending: 0, confirmed: 0, total: 0, stores: [] }, stores: new Map() }; brands.set(r.brand, b); }
    let s = b.stores.get(r.store);
    if (!s) { s = { name: r.store, pending: 0, confirmed: 0, total: 0 }; b.stores.set(r.store, s); }
    add(b.row, r); add(s, r); add(total, r);
  }
  const list = [...brands.values()].map(({ row, stores }) => ({ ...row, stores: [...stores.values()].sort((a, b) => b.pending - a.pending) }));
  return { brands: list.sort((a, b) => b.pending - a.pending), total };
}
