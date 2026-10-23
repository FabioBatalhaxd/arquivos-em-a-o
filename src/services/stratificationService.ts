import type { ImportedRecord } from '@/lib/import/records';
import { operationalDataService } from "@/services/operationalDataService";
import type { DashboardFilters, StageStratification, UfStratification } from "@/types/dashboard";

export const stratificationService = {
  getStages(filters: DashboardFilters, records?: ImportedRecord[]): StageStratification[] {
    const rows = operationalDataService.getRows(filters, records);
    return [...new Set(rows.map((row) => row.carrier))].map((carrier) => {
      const selected = rows.filter((row) => row.carrier === carrier);
      const sum = (stage: string) => selected.filter((row) => row.stage === stage).reduce((total, row) => total + row.quantity, 0);
      const total = selected.reduce((total, row) => total + row.quantity, 0);
      const delivered = sum("delivered");
      return { carrier, processing: sum("processing"), awaitingCollection: sum("awaitingCollection"), transit: sum("transit"), delivered, incidents: selected.filter(row => row.incident && row.stage !== "delivered").reduce((sum,row)=>sum+row.quantity,0), total, deliveryRate: total ? delivered / total * 100 : null };
    });
  },
  getByUf(filters: DashboardFilters, records?: ImportedRecord[]): UfStratification[] {
    const rows = operationalDataService.getRows(filters, records);
    const carriers = [...new Set(rows.map((row) => row.carrier))];
    return [...new Set(rows.map(row => row.uf))].sort().map((uf) => {
      const selected = rows.filter((row) => row.uf === uf);
      const volumes = Object.fromEntries(carriers.map((carrier) => {
        const group = selected.filter((row) => row.carrier === carrier);
        return [carrier, { total: group.reduce((sum, row) => sum + row.quantity, 0), delivered: group.filter((row) => row.stage === "delivered").reduce((sum, row) => sum + row.quantity, 0) }];
      }));
      const total = selected.reduce((sum, row) => sum + row.quantity, 0);
      const delivered = selected.filter((row) => row.stage === "delivered").reduce((sum, row) => sum + row.quantity, 0);
      return { uf, volumes, total, delivered, rates: Object.fromEntries(Object.entries(volumes).map(([carrier, value]) => [carrier, value.total ? value.delivered / value.total * 100 : null])), totalRate: total ? delivered / total * 100 : null };
    });
  },
};
