import type { ImportedRecord } from '@/lib/import/records';
import { operationalDataService } from "@/services/operationalDataService";
import type { DashboardFilters, StageStratification, UfStratification } from "@/types/dashboard";

type Row = ReturnType<typeof operationalDataService.getRows>[number];
function stageTotals(selected: Row[]) {
  const sum = (stage: string) => selected.filter((row) => row.stage === stage).reduce((total, row) => total + row.quantity, 0);
  const total = selected.reduce((t, row) => t + row.quantity, 0);
  const delivered = sum("delivered");
  return { processing: sum("processing"), awaitingCollection: sum("awaitingCollection"), transit: sum("transit"), delivered, total, deliveryRate: total ? delivered / total * 100 : null };
}

/** Rows are returned largest first (by total orders). */
export const stratificationService = {
  getStages(filters: DashboardFilters, records?: ImportedRecord[]): StageStratification[] {
    const rows = operationalDataService.getRows(filters, records);
    return [...new Set(rows.map((row) => row.carrier))].map((carrier) => {
      const selected = rows.filter((row) => row.carrier === carrier);
      return { carrier, ...stageTotals(selected), incidents: selected.filter(row => row.incident && row.stage !== "delivered").reduce((sum,row)=>sum+row.quantity,0) };
    }).sort((a, b) => b.total - a.total);
  },
  getByUf(filters: DashboardFilters, records?: ImportedRecord[]): UfStratification[] {
    const rows = operationalDataService.getRows(filters, records);
    return [...new Set(rows.map(row => row.uf))].map((uf) => ({ uf, ...stageTotals(rows.filter((row) => row.uf === uf)) })).sort((a, b) => b.total - a.total || a.uf.localeCompare(b.uf));
  },
};
