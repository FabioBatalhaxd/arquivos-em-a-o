import { Fragment, useMemo, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Boxes, ChevronDown, ChevronRight, PackageCheck, Truck, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getCollections, importCollections } from '@/lib/collections.functions';
import { aggregateCollections, summarizeCollections, type CollectionRow } from '@/lib/import/collections';
import { cn } from '@/lib/utils';

const fmt = new Intl.NumberFormat('pt-BR');
const pct = (v: number, t: number) => t ? `${Math.round(v / t * 100)}%` : '—';
const ALL = 'Todas';

export function CollectionMonitor({ isMaster }: { isMaster: boolean }) {
  const fetchFn = useServerFn(getCollections), importFn = useServerFn(importCollections), qc = useQueryClient();
  const { data, isLoading, error: loadError } = useQuery({ queryKey: ['collections'], queryFn: () => fetchFn() });
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [f, setF] = useState({ date: ALL, carrier: ALL, uf: ALL });
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState(''), [err, setErr] = useState('');
  const records = data?.records ?? [];
  const opts = (k: 'date' | 'carrier' | 'uf') => [ALL, ...[...new Set(records.map(r => r[k]).filter(Boolean))].sort()];
  const filtered = records.filter(r => (f.date === ALL || r.date === f.date) && (f.carrier === ALL || r.carrier === f.carrier) && (f.uf === ALL || r.uf === f.uf));
  const { brands, total } = useMemo(() => summarizeCollections(filtered), [filtered]);

  async function onFile(file: File) {
    setBusy(true); setErr(''); setMsg('');
    try {
      let headers: string[] = [], rows: Record<string, unknown>[] = [];
      if (/\.(csv|txt)$/i.test(file.name)) {
        const Papa = (await import('papaparse')).default;
        const res = Papa.parse<Record<string, unknown>>(await file.text(), { header: true, skipEmptyLines: true });
        headers = res.meta.fields ?? []; rows = res.data;
      } else {
        const XLSX = await import('xlsx');
        const book = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
        const sheet = book.Sheets[book.SheetNames[0] ?? '']; if (!sheet) throw new Error('Planilha vazia.');
        rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
        headers = Object.keys(rows[0] ?? {});
      }
      const agg = aggregateCollections(headers, rows);
      await importFn({ data: { filename: file.name, sourceRows: rows.length, records: agg } });
      await qc.invalidateQueries({ queryKey: ['collections'] });
      setMsg(`${fmt.format(rows.length)} pedidos de coleta importados.`);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Arquivo inválido.'); } finally { setBusy(false); }
  }

  const toggle = (b: string) => setOpen(s => { const n = new Set(s); if (n.has(b)) n.delete(b); else n.add(b); return n; });
  const cells = (r: CollectionRow, bold?: boolean) => <>
    <TableCell className={cn('text-right tabular-nums', bold && 'font-bold')}>{fmt.format(r.total)}</TableCell>
    <TableCell className={cn('text-right tabular-nums', bold && 'font-bold')}>{fmt.format(r.confirmed)}</TableCell>
    <TableCell className="text-right tabular-nums">{pct(r.confirmed, r.total)}</TableCell>
    <TableCell className={cn('text-right tabular-nums', bold && 'font-bold')}>{fmt.format(r.pending)}</TableCell>
    <TableCell className="text-right tabular-nums">{pct(r.pending, r.total)}</TableCell>
  </>;

  return <div id="coletas" className="scroll-mt-24 space-y-4">
    <section className="panel flex flex-wrap items-end justify-between gap-3 p-3">
      <div className="grid flex-1 gap-2 sm:grid-cols-3">
        {([['date', 'DATA DO PEDIDO'], ['carrier', 'TRANSPORTADORA'], ['uf', 'UF DESTINO']] as const).map(([k, label]) =>
          <label key={k} className="block min-w-0"><span className="mb-1.5 block text-[9px] font-bold text-muted-foreground">{label}</span>
            <Select value={f[k]} onValueChange={v => setF(s => ({ ...s, [k]: v }))}><SelectTrigger className="h-9 bg-card text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{opts(k).map(o => <SelectItem key={o} value={o}>{k === 'date' && o !== ALL ? o.split('-').reverse().join('/') : o}</SelectItem>)}</SelectContent></Select></label>)}
      </div>
      {isMaster ? <label className="relative"><Button asChild disabled={busy}><span><Upload className="h-4 w-4" />{busy ? 'Importando…' : 'Importar planilha de coletas'}</span></Button>
        <input aria-label="Importar planilha de coletas" type="file" accept=".csv,.txt,.xlsx,.xls" disabled={busy} className="absolute inset-0 w-full cursor-pointer opacity-0" onChange={e => { const file = e.target.files?.[0]; if (file) void onFile(file); e.target.value = ''; }} /></label>
        : <p className="text-xs text-muted-foreground">A importação de coletas é feita pela conta Master.</p>}
    </section>
    {data?.latestImport && <p className="text-xs text-muted-foreground">{data.latestImport.filename} · {new Date(data.latestImport.created_at).toLocaleString('pt-BR')}</p>}
    {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
    {msg && <p role="status" className="text-sm text-status-success">{msg}</p>}

    <section className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      <Kpi label="TOTAL DE COLETAS" value={fmt.format(total.total)} meta={`${brands.length} marcas`} icon={Truck} />
      <Kpi label="CONFIRMADO" value={fmt.format(total.confirmed)} meta={pct(total.confirmed, total.total)} icon={PackageCheck} />
      <Kpi label="A CONFIRMAR" value={fmt.format(total.pending)} meta={pct(total.pending, total.total)} icon={Boxes} />
    </section>

    <section className="panel overflow-hidden p-0">
      <div className="bg-institutional p-4 text-primary-foreground"><p className="text-[9px] font-bold">MONITORAMENTO DE COLETAS</p><h2 className="mt-1 text-base font-bold">Coletas por marca e loja</h2></div>
      <div className="overflow-x-auto"><Table className="min-w-[640px]">
        <TableHeader>
          <TableRow><TableHead rowSpan={2}>MARCAS / LOJAS</TableHead><TableHead rowSpan={2} className="text-right">TOTAL DE COLETAS</TableHead><TableHead colSpan={2} className="text-center">CONFIRMADO</TableHead><TableHead colSpan={2} className="text-center">A CONFIRMAR</TableHead></TableRow>
          <TableRow><TableHead className="text-right">QTD</TableHead><TableHead className="text-right">%</TableHead><TableHead className="text-right">QTD</TableHead><TableHead className="text-right">%</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {brands.map(b => <Fragment key={b.name}>
            <TableRow className="cursor-pointer font-semibold hover:bg-secondary/60" onClick={() => toggle(b.name)}>
              <TableCell><span className="inline-flex items-center gap-1.5">{open.has(b.name) ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}{b.name}<span className="text-[10px] font-normal text-muted-foreground">({b.stores.length} lojas)</span></span></TableCell>
              {cells(b, true)}
            </TableRow>
            {open.has(b.name) && b.stores.map(s => <TableRow key={s.name} className="bg-secondary/30 text-xs"><TableCell className="pl-9">{s.name}</TableCell>{cells(s)}</TableRow>)}
          </Fragment>)}
          {brands.length > 0 && <TableRow className="bg-secondary font-extrabold"><TableCell>Total Geral</TableCell>{cells(total, true)}</TableRow>}
        </TableBody>
      </Table></div>
      {!brands.length && <p className="p-8 text-center text-sm text-muted-foreground">{isLoading ? 'Carregando coletas…' : loadError ? 'Não foi possível carregar as coletas.' : 'Nenhuma coleta importada ainda.'}</p>}
    </section>
  </div>;
}

function Kpi({ label, value, meta, icon: Icon }: { label: string; value: string; meta: string; icon: typeof Boxes }) {
  return <article className="panel relative min-h-[86px] overflow-hidden p-3"><div className="absolute inset-y-0 left-0 w-0.5 bg-primary" /><div className="flex justify-between gap-2"><p className="text-[9px] font-bold text-muted-foreground">{label}</p><Icon className="h-3.5 w-3.5 text-primary" /></div><div className="mt-2 flex items-baseline gap-2"><p className="text-xl font-extrabold tabular-nums">{value}</p><span className="text-[9px] text-muted-foreground">{meta}</span></div></article>;
}
