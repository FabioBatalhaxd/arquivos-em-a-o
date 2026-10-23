import { operationMetrics } from "@/data/mock-dashboard";
import { ordersService } from "@/services/ordersService";
import type { DashboardFilters } from "@/types/dashboard";

export const operationService = {
  getOperations(filters: DashboardFilters) {
    return operationMetrics.filter((operation) => filters.operation === "Todos" || operation.label === filters.operation).map((operation) => ({ ...operation, ...ordersService.getMetrics({ ...filters, operation: operation.label }) }));
  },
};
