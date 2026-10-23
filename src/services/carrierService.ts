import type { ImportedRecord } from '@/lib/import/records';
import { stratificationService } from "@/services/stratificationService";
import type { DashboardFilters } from "@/types/dashboard";

export const carrierService = {
  getCarriers(filters: DashboardFilters, records?: ImportedRecord[]) {
    return stratificationService.getStages(filters, records).map((row) => ({ name: row.carrier, orders: row.total, shipped: row.total - row.processing, pending: row.processing })).sort((a, b) => b.orders - a.orders);
  },
};
