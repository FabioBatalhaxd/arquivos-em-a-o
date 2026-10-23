import type { ImportedRecord } from '@/lib/import/records';
import { operationalDataService } from "@/services/operationalDataService";
import type { DashboardFilters, LeadTimeSummary } from "@/types/dashboard";

const defaultFilters: DashboardFilters = { period: "Hoje", operation: "Todos", brand: "Todas", carrier: "Todas", status: "Todos" };
const deliveredRows = (filters: DashboardFilters, records?: ImportedRecord[]) => operationalDataService.getRows(filters, records).filter((row) => row.stage === "delivered" && Number.isFinite(row.hours));
export const leadTimeService = {
  getSummary(filters: DashboardFilters = defaultFilters, records?: ImportedRecord[]): LeadTimeSummary {
    const rows = deliveredRows(filters, records).sort((a, b) => a.hours - b.hours);
    const total = rows.reduce((sum, row) => sum + row.quantity, 0);
    const percentile = (fraction: number) => { let cumulative = 0; for (const row of rows) { cumulative += row.quantity; if (cumulative >= total * fraction) return row.hours; } return 0; };
    return { minimum: rows.length ? Math.min(...rows.map(row => ('minHours' in row && Number.isFinite(row.minHours) ? row.minHours as number : row.hours))) : 0, average: total ? rows.reduce((sum, row) => sum + row.hours * row.quantity, 0) / total : 0, p50: percentile(0.5), p75: percentile(0.75), p90: percentile(0.9), p95: percentile(0.95), maximum: rows.length ? Math.max(...rows.map(row => ('maxHours' in row && Number.isFinite(row.maxHours) ? row.maxHours as number : row.hours))) : 0, sampleCount: total };
  },
  getByUf(filters: DashboardFilters, records?: ImportedRecord[]) {
    const rows = deliveredRows(filters, records);
    return [...new Set(rows.map((row) => row.uf))].map((uf) => {
      const selected = rows.filter((row) => row.uf === uf);
      const total = selected.reduce((sum, row) => sum + row.quantity, 0);
      return { uf, days: selected.reduce((sum, row) => sum + row.hours * row.quantity, 0) / total / 24, quantity: total };
    }).sort((a, b) => b.days - a.days);
  },
};
