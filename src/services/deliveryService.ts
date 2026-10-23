import type { ImportedRecord } from '@/lib/import/records';
import { deliveryTimeline } from "@/data/mock-dashboard";
import type { DashboardFilters } from "@/types/dashboard";
import { getFilterFactor } from "@/services/filterUtils";
import { operationalDataService } from "@/services/operationalDataService";
import { leadTimeService } from "@/services/leadTimeService";

const statusKey = {
  Coletado: "coletado",
  "Em trânsito": "transito",
  "Em rota": "rota",
  Entregue: "entregue",
  "Com ocorrência": "ocorrencias",
  Extravio: "ocorrencias",
  Devolução: "ocorrencias",
} as const;

export const deliveryService = {
  getTimeline(filters: DashboardFilters, records?: ImportedRecord[]) {
    const factor = getFilterFactor({ ...filters, status: "Todos" });
    return deliveryTimeline.map((point) => {
      const scaled = {
        ...point,
        coletado: Math.round(point.coletado * factor),
        transito: Math.round(point.transito * factor),
        rota: Math.round(point.rota * factor),
        entregue: Math.round(point.entregue * factor),
        ocorrencias: Math.round(point.ocorrencias * factor),
      };
      if (filters.status === "Todos") return scaled;
      const selectedKey = statusKey[filters.status as keyof typeof statusKey];
      return { ...scaled, coletado: 0, transito: 0, rota: 0, entregue: 0, ocorrencias: 0, [selectedKey]: scaled[selectedKey] };
    });
  },
  getSummary(filters: DashboardFilters, records?: ImportedRecord[]) {
    const rows = operationalDataService.getRows(filters, records);
    const sum = (status: string) => rows.filter((row) => row.status === status).reduce((sum, row) => sum + row.quantity, 0);
    return {
      collected: sum("Coletado"), inTransit: sum("Em trânsito"), onRoute: sum("Em rota"), delivered: sum("Entregue"),
      incidents: rows.filter((row) => row.incident && row.stage !== "delivered").reduce((sum, row) => sum + row.quantity, 0),
      averageLeadTime: leadTimeService.getSummary(filters, records).average,
    };
  },
};
