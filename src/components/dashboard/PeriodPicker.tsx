import { useMemo, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ALL_PERIOD, formatDay, parseRange, toRangeValue } from '@/lib/period';

const toDate = (d: string) => new Date(`${d}T12:00:00`);
const toKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Calendar that only enables days present in the imported spreadsheet. */
export function PeriodPicker({ label = 'PERÍODO', value, days, onChange }: { label?: string; value: string; days: string[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const available = useMemo(() => new Set(days), [days]);
  const sorted = useMemo(() => [...available].sort(), [available]);
  const range = parseRange(value);
  const selected: DateRange | undefined = range ? { from: toDate(range.from), to: toDate(range.to) } : undefined;
  const text = range ? (range.from === range.to ? formatDay(range.from) : `${formatDay(range.from)} – ${formatDay(range.to)}`) : value;
  const last = sorted[sorted.length - 1];
  const pick = (from?: string, to?: string) => { onChange(from ? toRangeValue(from, to ?? from) : ALL_PERIOD); };

  return <label className="block min-w-0"><span className="mb-1.5 block text-[9px] font-bold text-muted-foreground">{label}</span>
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild><Button variant="outline" className="h-9 w-full justify-start bg-card px-3 text-xs font-normal"><CalendarDays className="h-3.5 w-3.5 text-primary" /><span className="truncate">{text}</span></Button></PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex flex-wrap gap-1 border-b border-border p-2">
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { pick(); setOpen(false); }}>Todo o período</Button>
          {last && <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { pick(last); setOpen(false); }}>Último dia</Button>}
          {last && <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { const d = toDate(last); d.setDate(d.getDate() - 6); pick(toKey(d), last); setOpen(false); }}>Últimos 7 dias</Button>}
        </div>
        <Calendar mode="range" numberOfMonths={1} selected={selected} defaultMonth={selected?.from ?? (last ? toDate(last) : new Date())}
          disabled={d => !available.has(toKey(d))}
          onSelect={r => pick(r?.from && toKey(r.from), r?.to && toKey(r.to))} className="pointer-events-auto p-3" />
        {!sorted.length && <p className="px-3 pb-3 text-xs text-muted-foreground">Nenhuma data importada.</p>}
      </PopoverContent>
    </Popover></label>;
}
