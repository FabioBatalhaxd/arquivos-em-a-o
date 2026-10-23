import type { CarrierMetrics, DeliveryStatus, DeliveryTimelinePoint, OperationMetrics, OrderRecord, TimelinePoint } from "@/types/dashboard";

export const brands = ["Todas", "Animale", "Farm Rio", "Fábula", "Foxton", "Cris Barros", "Maria Filó", "NV (Nati Vozza)", "Off Premium", "Reserva", "INK", "OFC", "Marketplace (AM)"];
export const carriers = ["Todas", "RARO LOG", "TOTAL", "R3", "BR COM", "Eu Entrego", "J&T", "Magalog", "Jadlog", "Vennux"];
export const operations = ["Todos", "CD Masculino", "CD Feminino", "SFS Masculino", "SFS Feminino"];
export const periods = ["Hoje", "Últimas 6 horas", "Últimas 12 horas", "Últimas 24 horas", "Últimos 7 dias", "Personalizado"];
export const statuses = ["Todos", "Coletado", "Em trânsito", "Em rota", "Entregue", "Com ocorrência", "Extravio", "Devolução"];

export const operationMetrics: OperationMetrics[] = [
  { key: "CD_MASCULINO", label: "CD Masculino", sold: 42350, picking: 3120, packed: 2480, invoiced: 1920, shipped: 34830, queue: 420, status: "normal" },
  { key: "CD_FEMININO", label: "CD Feminino", sold: 36120, picking: 2340, packed: 1840, invoiced: 1420, shipped: 29180, queue: 510, status: "warning" },
  { key: "SFS_MASCULINO", label: "SFS Masculino", sold: 25480, picking: 1680, packed: 1210, invoiced: 930, shipped: 20740, queue: 155, status: "normal" },
  { key: "SFS_FEMININO", label: "SFS Feminino", sold: 21530, picking: 1310, packed: 750, invoiced: 650, shipped: 17680, queue: 160, status: "normal" },
];

export const carrierMetrics: CarrierMetrics[] = [
  { name: "J&T", orders: 32450, shipped: 28410, pending: 4040 },
  { name: "R3", orders: 18230, shipped: 14960, pending: 3270 },
  { name: "RARO LOG", orders: 15820, shipped: 13240, pending: 2580 },
  { name: "TOTAL", orders: 13500, shipped: 11190, pending: 2310 },
  { name: "Magalog", orders: 9820, shipped: 7890, pending: 1930 },
  { name: "BR COM", orders: 7420, shipped: 5920, pending: 1500 },
  { name: "Eu Entrego", orders: 5230, shipped: 4090, pending: 1140 },
  { name: "Jadlog", orders: 3810, shipped: 3020, pending: 790 },
  { name: "Vennux", orders: 3010, shipped: 2430, pending: 580 },
];

export const timeline: TimelinePoint[] = [
  { time: "08:00", sold: 6500, shipped: 4800, queue: 420 },
  { time: "09:00", sold: 14200, shipped: 10800, queue: 510 },
  { time: "10:00", sold: 23800, shipped: 19200, queue: 630 },
  { time: "11:00", sold: 35400, shipped: 27800, queue: 780 },
  { time: "12:00", sold: 48200, shipped: 38100, queue: 690 },
  { time: "13:00", sold: 60900, shipped: 49200, queue: 820 },
  { time: "14:00", sold: 75300, shipped: 61400, queue: 940 },
  { time: "15:00", sold: 89200, shipped: 72800, queue: 1020 },
  { time: "16:00", sold: 103400, shipped: 84900, queue: 1130 },
  { time: "17:00", sold: 115600, shipped: 94800, queue: 1180 },
  { time: "18:00", sold: 125480, shipped: 102430, queue: 1245 },
];

const names = brands.slice(1);
export const deliveryTimeline: DeliveryTimelinePoint[] = [
  { time: "08:00", coletado: 1320, transito: 980, rota: 420, entregue: 280, ocorrencias: 28, leadTime: 31.8 },
  { time: "10:00", coletado: 2840, transito: 2260, rota: 940, entregue: 720, ocorrencias: 52, leadTime: 30.6 },
  { time: "12:00", coletado: 4680, transito: 3750, rota: 1780, entregue: 1510, ocorrencias: 79, leadTime: 29.7 },
  { time: "14:00", coletado: 6910, transito: 5480, rota: 2860, entregue: 2640, ocorrencias: 105, leadTime: 28.3 },
  { time: "16:00", coletado: 8940, transito: 7160, rota: 3980, entregue: 3910, ocorrencias: 136, leadTime: 27.1 },
  { time: "18:00", coletado: 11240, transito: 8950, rota: 5270, entregue: 5480, ocorrencias: 164, leadTime: 25.8 },
];

const operationNames = ["CD Masculino", "CD Feminino", "SFS Masculino", "SFS Feminino"] as const;
const carrierNames = ["J&T", "R3", "RARO LOG", "TOTAL", "Magalog", "BR COM", "Eu Entrego", "Jadlog", "Vennux"];
const deliveryStatuses: DeliveryStatus[] = ["Entregue", "Em trânsito", "Em rota", "Coletado", "Com ocorrência", "Extravio", "Devolução"];
const keyMap = { "CD Masculino": "CD_MASCULINO", "CD Feminino": "CD_FEMININO", "SFS Masculino": "SFS_MASCULINO", "SFS Feminino": "SFS_FEMININO" } as const;

export const recentOrders: OrderRecord[] = Array.from({ length: 84 }, (_, index) => {
  const operation = operationNames[index % operationNames.length] ?? "CD Masculino";
  const carrier = carrierNames[index % carrierNames.length] ?? "Vennux";
  const brand = names[index % names.length] ?? "Reserva";
  const state = ["SP", "RJ", "MG", "PR", "SC", "RS", "BA", "GO"][index % 8] ?? "SP";
  const second = Math.max(0, 32 - index * 3);
  const deliveryStatus = deliveryStatuses[index % deliveryStatuses.length] ?? "Coletado";
  const collectedAt = new Date(2026, 8, 20, 8 + (index % 8), index % 60);
  const leadHours = 18 + (index % 9) * 2.4;
  const deliveredAt = deliveryStatus === "Entregue" ? new Date(collectedAt.getTime() + leadHours * 3_600_000) : null;
  return {
    pedido_id: `E213456${789 + index}`,
    data_pedido: `2026-09-22T14:${58 - Math.floor(index / 10)}:${String(second).padStart(2, "0")}`,
    data_picking: "2026-09-22T14:20:00",
    data_embalagem: "2026-09-22T14:35:00",
    data_faturamento: "2026-09-22T14:44:00",
    data_expedicao: null,
    status: "Faturado",
    transportadora: carrier,
    marca: brand,
    operacao: keyMap[operation],
    canal: index % 3 === 0 ? "Loja" : "E-commerce",
    origem: operation,
    uf: state,
    loja: `Loja ${String(index + 1).padStart(2, "0")}`,
    tipo_loja: operation.startsWith("SFS") ? "Física" : "CD",
    integrado_intelipost: true,
    data_integracao: `2026-09-22T14:${58 - Math.floor(index / 10)}:${String(second).padStart(2, "0")}`,
    tempo_integracao: 138,
    status_entrega: deliveryStatus,
    data_coleta: collectedAt.toISOString(),
    data_entrega: deliveredAt?.toISOString() ?? null,
    lead_time_horas: deliveredAt ? leadHours : null,
    sub_status: deliveryStatus === "Coletado" ? "Em transferência" : deliveryStatus === "Em rota" ? "Saiu para entrega" : deliveryStatus === "Com ocorrência" ? "Insucesso" : deliveryStatus,
    status_entrega_agrupado: deliveryStatus === "Entregue" ? "Entregue" : deliveryStatus === "Em rota" ? "Em rota" : deliveryStatus === "Coletado" || deliveryStatus === "Em trânsito" ? "Em trânsito" : deliveryStatus === "Extravio" || deliveryStatus === "Devolução" || deliveryStatus === "Com ocorrência" ? "Ocorrência" : "Aguardando coleta",
    last_update: `2026-09-22T15:${String(index % 60).padStart(2, "0")}:00`,
  };
});
