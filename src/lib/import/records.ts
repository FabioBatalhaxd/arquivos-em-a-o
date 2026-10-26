import { z } from 'zod';
import { translateGender } from '@/lib/text-format';

export const recordSchema = z.object({
  id: z.string(), brand: z.string().min(1), origin: z.string().min(1), operation: z.string(), carrier: z.string(), uf: z.string(),
  status: z.string(), stage: z.enum(['processing','awaitingCollection','transit','delivered','incidents']),
  incident: z.boolean(), soldAt: z.string().datetime(), deliveredAt: z.string().datetime().nullable(), hours: z.number().nonnegative().nullable(),
  quantity: z.number().int().positive().optional(), minHours: z.number().nonnegative().nullable().optional(), maxHours: z.number().nonnegative().nullable().optional(),
});
export type ImportedRecord = z.infer<typeof recordSchema>;
export const normalize = (value: unknown) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
export const loginEmail = (username: string) => `${Array.from(new TextEncoder().encode(normalize(username))).map(n => n.toString(16).padStart(2,'0')).join('')}@accounts.blackfriday.invalid`;

function dateValue(value: unknown): string | null {
  if (value === '' || value === null || value === undefined) return null;
  if (typeof value === 'number') return new Date(Date.UTC(1899,11,30) + value * 86400000).toISOString();
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.toISOString();
  const text = String(value).trim();
  const br = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(text);
  if (br) {
    const date = new Date(Date.UTC(Number(br[3]),Number(br[2])-1,Number(br[1]),Number(br[4] ?? 0)+3,Number(br[5] ?? 0),Number(br[6] ?? 0)));
    if (date.getUTCDate() !== Number(br[1]) && Number(br[4] ?? 0) < 21) throw new Error('Data inválida');
    return date.toISOString();
  }
  const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T00:00:00-03:00` : text);
  if (!Number.isFinite(parsed.getTime())) throw new Error('Data inválida');
  return parsed.toISOString();
}

export function mapStatus(raw: string): Pick<ImportedRecord,'status'|'stage'> {
  const s = normalize(raw);
  if (['ag. processamento','ag processamento','aguardando processamento','em processamento','picking','embalado','faturado','pendente'].includes(s)) return {status:'AG. PROCESSAMENTO',stage:'processing'};
  if (['expedido','expedidos','coletado','coletados','ag. coleta','aguardando coleta'].includes(s)) return {status:'Coletado',stage:'awaitingCollection'};
  if (['em transito','transito','em transporte'].includes(s)) return {status:'Em trânsito',stage:'transit'};
  if (['em rota','saiu para entrega','em rota de entrega'].includes(s)) return {status:'Em rota',stage:'transit'};
  if (['entregue','entregues','entrega realizada'].includes(s)) return {status:'Entregue',stage:'delivered'};
  if (['ag. tratativa','ag tratativa','com ocorrencia','ocorrencia','extravio','devolucao','devolvido'].includes(s)) return {status:raw,stage:'incidents'};
  throw new Error(`Status não reconhecido: ${raw}`);
}

/** Each required field accepts the legacy header and the new spreadsheet header. */
const COLUMNS = {
  brand: ['Marca'], origin: ['Origem'],
  soldAt: ['DATA_HORA_INTEGRACAO','Data Venda'], id: ['PEDIDO_SITE','Pedido','Pedido_id','ID Pedido','Número do Pedido'],
  uf: ['UF_DESTINO','UF'], carrier: ['TRANSP.','TRANSP','Transportadora'], deliveredAt: ['DT_ENTREGA','Data de Entrega'],
  dispatchedAt: ['DT DESPACHO_IP','DT_DESPACHO_IP','Data de despacho'], incident: ['TEM OCORRÊNCIA?','TEM OCORRENCIA','Existem ocorrencia'],
  operation: ['TIPO_ATENDIMENTO','Tipo de atendimento','Hub corrigido'], status: ['DE X PARA CORRIGIDO','Status'],
} as const;
const REQUIRED_FIELDS = ['brand','soldAt','uf','incident','status'] as const;
const missingColumns = (keys: Map<string,string>) => REQUIRED_FIELDS.filter(f => !COLUMNS[f].some(n => keys.has(normalize(n)))).map(f => COLUMNS[f][0]);
export const MAX_SOURCE_ROWS = 1048576;

/** Streaming row parser + aggregator: identical dimensions collapse into one weighted record. */
export function createImportAggregator(headers: string[]) {
  const keys = new Map(headers.map(key => [normalize(key), key]));
  const missing = missingColumns(keys);
  if (missing.length) throw new Error(`Colunas ausentes: ${missing.join(', ')}`);
  const groups = new Map<string, ImportedRecord & {quantity:number; sum:number; delivered:number}>();
  let rows = 0;
  return {
    add(row: Record<string,unknown>) {
      rows++;
      if (rows > MAX_SOURCE_ROWS) throw new Error('Máximo de 1.048.576 linhas por importação.');
      const index = rows - 1;
      let r: ImportedRecord;
      try { r = parseRow(row, keys, index); } catch(error) { throw new Error(`Linha ${index+2}: ${error instanceof Error ? error.message : 'Dados inválidos'}`); }
      // Daily buckets keep the stored dataset compact; hourly buckets made large imports unloadable.
      const hour = r.soldAt.slice(0,10) + 'T12:00:00.000Z';
      const key = [r.brand,r.origin,r.operation,r.carrier,r.uf,r.status,r.stage,r.incident?1:0,hour].join('\u0001');
      const g = groups.get(key);
      if (!g) { groups.set(key,{...r,id:`g${groups.size}`,soldAt:hour,quantity:1,sum:r.hours ?? 0,delivered:r.hours===null?0:1,minHours:r.hours,maxHours:r.hours}); return; }
      g.quantity++;
      if (r.hours !== null) { g.sum += r.hours; g.delivered++; g.minHours = g.minHours==null ? r.hours : Math.min(g.minHours,r.hours); g.maxHours = g.maxHours==null ? r.hours : Math.max(g.maxHours,r.hours); }
      if (r.deliveredAt && (!g.deliveredAt || r.deliveredAt > g.deliveredAt)) g.deliveredAt = r.deliveredAt;
    },
    get sourceRows() { return rows; },
    result(): ImportedRecord[] {
      if (!rows) throw new Error('Planilha vazia.');
      return [...groups.values()].map(({sum,delivered,...g}) => ({...g, hours: delivered ? sum/delivered : null}));
    },
  };
}

function parseRow(row: Record<string,unknown>, keys: Map<string,string>, index: number): ImportedRecord {
      const get = (...names: string[]) => { for (const name of names) { const key = keys.get(normalize(name)); if (key) return row[key]; } return undefined; };
      const brand = String(get(...COLUMNS.brand) ?? '').trim();
      const origin = String(get(...COLUMNS.origin) ?? '').trim() || 'Não informada';
      if (!brand) throw new Error('Marca é obrigatória');
      const soldAt = dateValue(get(...COLUMNS.soldAt));
      if (!soldAt) throw new Error('Data de venda obrigatória');
      const deliveredAt = dateValue(get(...COLUMNS.deliveredAt));
      const hours = deliveredAt ? (Date.parse(deliveredAt)-Date.parse(soldAt))/3600000 : null;
      if (hours !== null && hours < 0) throw new Error('Entrega anterior à venda');
      const status = mapStatus(String(get(...COLUMNS.status) ?? ''));
      const flag = normalize(get(...COLUMNS.incident));
      if (!['','sim','s','1','true','yes','nao','n','0','false','no'].includes(flag)) throw new Error('Tem ocorrência deve ser Sim/Não, 1/0 ou verdadeiro/falso');
      const operation = translateGender(String(get(...COLUMNS.operation) ?? '').trim()) || 'Não informado';
      return recordSchema.parse({ id: String(get(...COLUMNS.id) ?? `linha-${index+2}`), brand:translateGender(brand),origin:translateGender(origin),operation,
        carrier:String(get(...COLUMNS.carrier) ?? 'Não informada').trim() || 'Não informada',uf:String(get(...COLUMNS.uf) ?? '').trim().toUpperCase() || 'Não informada',
        ...status,incident:['sim','s','1','true','yes'].includes(flag) || status.stage==='incidents',soldAt,deliveredAt,hours });
}

export function parseSpreadsheetRows(input: Record<string,unknown>[]): ImportedRecord[] {
  if (!input.length) throw new Error('Planilha vazia.');
  if (input.length > 20000) throw new Error('Máximo de 20.000 linhas por importação.');
  const keys = new Map(Object.keys(input[0] ?? {}).map(key => [normalize(key), key]));
  const missing = missingColumns(keys);
  if (missing.length) throw new Error(`Colunas ausentes: ${missing.join(', ')}`);
  return input.map((row,index) => {
    try { return parseRow(row, keys, index); } catch(error) { throw new Error(`Linha ${index+2}: ${error instanceof Error ? error.message : 'Dados inválidos'}`); }
  });
}

/** Compact wire format: one JSON string with dictionary-encoded text fields, keeping large datasets under the server-function payload limit. */
const PACK_TEXT = ['brand','origin','operation','carrier','uf','status','stage'] as const;
export function packRecords(records: ImportedRecord[]): string {
  const dict: string[] = []; const ids = new Map<string,number>();
  const code = (v: string) => { let i = ids.get(v); if (i === undefined) { i = dict.length; dict.push(v); ids.set(v,i); } return i; };
  const rows = records.map(r => [...PACK_TEXT.map(k => code(r[k])), r.incident ? 1 : 0, r.soldAt, r.deliveredAt, r.hours, r.quantity ?? 1, r.minHours ?? null, r.maxHours ?? null]);
  return JSON.stringify({dict, rows});
}
export function unpackRecords(packed: string): ImportedRecord[] {
  const {dict, rows} = JSON.parse(packed) as {dict: string[]; rows: unknown[][]};
  return rows.map((row, index) => {
    const text = Object.fromEntries(PACK_TEXT.map((k, i) => [k, dict[row[i] as number] ?? ''])) as Pick<ImportedRecord, typeof PACK_TEXT[number]>;
    const n = PACK_TEXT.length;
    return { id: `g${index}`, ...text, incident: row[n] === 1, soldAt: row[n+1] as string, deliveredAt: row[n+2] as string | null, hours: row[n+3] as number | null, quantity: row[n+4] as number, minHours: row[n+5] as number | null, maxHours: row[n+6] as number | null };
  });
}
