/** Date ranges are encoded in the period filter string as "range:YYYY-MM-DD:YYYY-MM-DD". */
export const ALL_PERIOD = 'Todo o período';
export const toRangeValue = (from: string, to: string) => `range:${from <= to ? from : to}:${from <= to ? to : from}`;
export function parseRange(value: string | undefined) {
  const m = /^range:(\d{4}-\d{2}-\d{2}):(\d{4}-\d{2}-\d{2})$/.exec(value ?? '');
  return m ? { from: m[1]!, to: m[2]! } : null;
}
export const inRange = (value: string | undefined, day: string) => { const r = parseRange(value); return !r || (day >= r.from && day <= r.to); };
export const formatDay = (d: string) => d.split('-').reverse().join('/');
