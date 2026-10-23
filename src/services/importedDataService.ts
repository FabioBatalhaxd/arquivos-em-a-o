import type { DashboardFilters } from '@/types/dashboard';
import type { ImportedRecord } from '@/lib/import/records';
import { filterValues, matchesFilter } from '@/services/filterUtils';

export function filterImportedRecords(records: ImportedRecord[], filters: DashboardFilters, now = new Date()) {
  const localDay = (date: Date) => new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
  const hourLimits: Record<string,number> = {'Últimas 6 horas':6,'Últimas 12 horas':12,'Últimas 24 horas':24,'Últimos 7 dias':168};
  return records.filter(r => {
    const sale = new Date(r.soldAt);
    const limit = hourLimits[filters.period];
    const period = filters.period === 'Hoje' ? localDay(sale) === localDay(now) : limit ? sale.getTime() <= now.getTime() && sale.getTime() >= now.getTime()-limit*3600000 : true;
    const statuses = filterValues(filters.status);
    return period && matchesFilter(filters.brand, r.brand) && matchesFilter(filters.operation, r.operation) &&
      matchesFilter(filters.carrier, r.carrier) && matchesFilter(filters.origin, r.origin) &&
      (!filters.occurrence || filters.occurrence === 'Todas' || (r.incident && r.stage !== 'delivered') === (filters.occurrence === 'Com ocorrências')) &&
      (!statuses || statuses.some(s => s === 'EXPEDIDOS' ? r.stage !== 'processing' : s === 'ENTREGUES' ? r.stage === 'delivered' : r.status === s));
  });
}
export function importedCohorts(records: ImportedRecord[], filters: DashboardFilters) {
  return filterImportedRecords(records,filters).map(r=>({...r,quantity:r.quantity ?? 1,volume:r.quantity ?? 1,minHours:r.minHours ?? r.hours ?? Number.NaN,maxHours:r.maxHours ?? r.hours ?? Number.NaN,status:r.status as import('@/types/dashboard').DeliveryStatus | null,hours:r.hours ?? Number.NaN}));
}
