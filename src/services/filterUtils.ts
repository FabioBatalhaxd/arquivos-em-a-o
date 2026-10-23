import type { DashboardFilters } from "@/types/dashboard";

const periodFactors: Record<string, number> = {
  Hoje: 1,
  "Últimas 6 horas": 0.34,
  "Últimas 12 horas": 0.68,
  "Últimas 24 horas": 1.08,
  "Últimos 7 dias": 5.72,
  Personalizado: 1,
};

const operationFactors: Record<string, number> = {
  "CD Masculino": 0.3375,
  "CD Feminino": 0.2879,
  "SFS Masculino": 0.2031,
  "SFS Feminino": 0.1715,
};

export function getFilterFactor(filters: DashboardFilters) {
  let factor = periodFactors[filters.period] ?? 1;
  if (filters.operation !== "Todos") factor *= operationFactors[filters.operation] ?? 1;
  if (filters.brand !== "Todas") factor *= 0.075 + (filters.brand.length % 5) * 0.012;
  if (filters.carrier !== "Todas") factor *= 0.08 + (filters.carrier.length % 4) * 0.035;
  if (filters.status !== "Todos") factor *= 0.18;
  return factor;
}
/** Multi-select filters are encoded as values joined by MULTI_SEPARATOR; "Todos"/"Todas"/empty means no restriction. */
export const MULTI_SEPARATOR = "||";
export const filterValues = (value: string | undefined) => !value || value === "Todos" || value === "Todas" ? null : value.split(MULTI_SEPARATOR);
export const matchesFilter = (value: string | undefined, actual: string) => { const list = filterValues(value); return !list || list.includes(actual); };
