import { filterImportedRecords } from '@/services/importedDataService';
import type { ImportedRecord } from '@/lib/import/records';
import { recentOrders, timeline } from "@/data/mock-dashboard";
import type { DashboardFilters, Metrics } from "@/types/dashboard";
import { getFilterFactor } from "@/services/filterUtils";
import { operationalDataService } from "@/services/operationalDataService";


export const ordersService = {
  getMetrics(filters: DashboardFilters, records?: ImportedRecord[]): Metrics {
    const rows = operationalDataService.getRows(filters, records);
    const sold = rows.reduce((sum, row) => sum + row.quantity, 0);
    const processing = rows.filter((row) => row.stage === "processing").reduce((sum, row) => sum + row.quantity, 0);
    const picking = Math.round(processing * 0.43);
    const packed = Math.round(processing * 0.32);
    return { sold, picking, packed, invoiced: processing - picking - packed, shipped: sold - processing, queue: Math.round(processing * 0.055) };
  },
  getTimeline(filters: DashboardFilters, records?: ImportedRecord[]) {
    const factor = getFilterFactor(filters);
    return timeline.map((point) => ({ ...point, sold: Math.round(point.sold * factor), shipped: Math.round(point.shipped * factor), queue: Math.round(point.queue * factor) }));
  },
  getRecentOrders(filters: DashboardFilters, records?: ImportedRecord[]) {
    if (records) return filterImportedRecords(records,filters).slice(0,20).map((r,index) => ({pedido_id:`${r.id}-${index}`,origem:r.origin,operacao:r.operation,marca:r.brand,transportadora:r.carrier,status_entrega:r.status,data_coleta:r.soldAt,data_entrega:r.deliveredAt,lead_time_horas:r.hours}));
    const allowed = operationalDataService.getRows(filters, records);
    return recentOrders.filter((order) => allowed.some((row) => row.operation === order.origem && row.brand === order.marca && row.carrier === order.transportadora && row.status === order.status_entrega)).filter((order) => (filters.operation === "Todos" || order.origem === filters.operation) && (filters.brand === "Todas" || order.marca === filters.brand) && (filters.carrier === "Todas" || order.transportadora === filters.carrier) && (filters.status === "Todos" || order.status_entrega === filters.status)).slice(0, 20);
  },
};
