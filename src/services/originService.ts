import { operationService } from "@/services/operationService";
import type { DashboardFilters, OriginPerformance } from "@/types/dashboard";

export const originService = {
  getOrigins(filters: DashboardFilters): OriginPerformance[] {
    return operationService.getOperations(filters).map((operation, index) => {
      const delivered = Math.round(operation.shipped * (0.78 + index * 0.035));
      return { origin: operation.label, orders: operation.sold, shipped: operation.shipped, delivered, backlog: operation.sold - operation.shipped, incidents: Math.round(operation.sold * (0.009 + index * 0.002)), leadTime: 22.8 + index * 3.7 };
    });
  },
};