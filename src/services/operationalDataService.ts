import { importedCohorts } from '@/services/importedDataService';
import type { ImportedRecord } from '@/lib/import/records';
import { brands, carrierMetrics, operations } from "@/data/mock-dashboard";
import type { DashboardFilters, DeliveryStatus } from "@/types/dashboard";
import { matchesFilter } from "@/services/filterUtils";

const ufs = ["SP", "RJ", "MG", "PR", "SC", "RS", "BA", "GO"];
const operationWeights = [0.3375, 0.2879, 0.2031, 0.1715];
const ufWeights = [0.32, 0.19, 0.15, 0.09, 0.07, 0.06, 0.07, 0.05];
const carrierTotal = carrierMetrics.reduce((sum, row) => sum + row.orders, 0);
const stageDefinitions: { status: DeliveryStatus | null; stage: "processing" | "awaitingCollection" | "transit" | "delivered" | "incidents"; share: number }[] = [
  { status: null, stage: "processing", share: 0.18 },
  { status: "Coletado", stage: "awaitingCollection", share: 0.06 },
  { status: "Em trânsito", stage: "transit", share: 0.07 },
  { status: "Em rota", stage: "transit", share: 0.03 },
  { status: "Entregue", stage: "delivered", share: 0.64 },
  { status: "Com ocorrência", stage: "incidents", share: 0.012 },
  { status: "Extravio", stage: "incidents", share: 0.003 },
  { status: "Devolução", stage: "incidents", share: 0.005 },
];

// Weighted mock cohorts: all dashboard services read the same filtered quantities.
const cohorts = operations.slice(1).flatMap((operation, oi) => brands.slice(1).flatMap((brand, bi) => carrierMetrics.flatMap((carrier, ci) => ufs.flatMap((uf, ui) => {
  const volume = 125480 * (operationWeights[oi] ?? 0) / (brands.length - 1) * carrier.orders / carrierTotal * (ufWeights[ui] ?? 0);
  const hours = 18 + ui * 2.8 + oi * 1.7 + ci * 1.3 + bi * 0.6;
  return stageDefinitions.map((definition) => ({ operation, brand, carrier: carrier.name, uf, ...definition, volume: volume * definition.share, hours }));
}))));

export const operationalDataService = {
  getRows(filters: DashboardFilters, records?: ImportedRecord[]) {
    if (records) return importedCohorts(records, filters);
    return cohorts.filter((row) =>
      matchesFilter(filters.operation, row.operation) &&
      matchesFilter(filters.brand, row.brand) &&
      matchesFilter(filters.carrier, row.carrier) &&
      matchesFilter(filters.status, row.status ?? "AG. PROCESSAMENTO")
    ).map((row) => {
      const variation = (row.hours % 5) / 50;
      const periodFactor = filters.period === "Últimas 6 horas" ? 0.34 + variation : filters.period === "Últimas 12 horas" ? 0.68 + variation : filters.period === "Últimas 24 horas" ? 1.08 : filters.period === "Últimos 7 dias" ? 5.72 : 1;
      return { ...row, origin: row.operation, incident: row.stage === "incidents", quantity: Math.round(row.volume * periodFactor) };
    }).filter((row) => row.quantity > 0);
  },
};