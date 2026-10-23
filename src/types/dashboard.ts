export type OperationKey = "CD_MASCULINO" | "CD_FEMININO" | "SFS_MASCULINO" | "SFS_FEMININO";
export type OrderStatus = "Picking" | "Embalado" | "Faturado" | "Expedido";
export type DeliveryStatus = "Coletado" | "Em trânsito" | "Em rota" | "Entregue" | "Com ocorrência" | "Extravio" | "Devolução";
export type GroupedDeliveryStatus = "Aguardando coleta" | "Em trânsito" | "Em rota" | "Entregue" | "Ocorrência";

export interface DashboardFilters {
  origin?: string;
  occurrence?: string;
  period: string;
  operation: string;
  brand: string;
  carrier: string;
  status: string;
}

export interface OrderRecord {
  pedido_id: string;
  data_pedido: string;
  data_picking: string | null;
  data_embalagem: string | null;
  data_faturamento: string | null;
  data_expedicao: string | null;
  status: OrderStatus;
  transportadora: string;
  marca: string;
  operacao: OperationKey;
  canal: string;
  origem: string;
  uf: string;
  loja: string;
  tipo_loja: string;
  integrado_intelipost: boolean;
  data_integracao: string | null;
  tempo_integracao: number;
  status_entrega: DeliveryStatus;
  data_coleta: string;
  data_entrega: string | null;
  lead_time_horas: number | null;
  sub_status: string;
  status_entrega_agrupado: GroupedDeliveryStatus;
  last_update: string;
}

export interface Metrics {
  sold: number;
  picking: number;
  packed: number;
  invoiced: number;
  shipped: number;
  queue: number;
}

export interface OperationMetrics extends Metrics {
  key: OperationKey;
  label: string;
  status: "normal" | "warning" | "critical";
}

export interface CarrierMetrics {
  name: string;
  orders: number;
  shipped: number;
  pending: number;
}

export interface TimelinePoint {
  time: string;
  sold: number;
  shipped: number;
  queue: number;
}

export interface DeliveryTimelinePoint {
  time: string;
  coletado: number;
  transito: number;
  rota: number;
  entregue: number;
  ocorrencias: number;
  leadTime: number;
}

export interface AlertItem {
  id: string;
  level: "warning" | "critical";
  title: string;
  description: string;
  context?: string;
  time?: string;
  action?: string;
}

export interface StageStratification {
  carrier: string;
  processing: number;
  awaitingCollection: number;
  transit: number;
  delivered: number;
  total: number;
  incidents: number;
  deliveryRate: number | null;
}

export interface UfStratification {
  uf: string;
  volumes: Record<string, { total: number; delivered: number }>;
  total: number;
  delivered: number;
  rates: Record<string, number | null>;
  totalRate: number | null;
}

export interface OriginPerformance {
  origin: string;
  orders: number;
  shipped: number;
  delivered: number;
  backlog: number;
  incidents: number;
  leadTime: number;
}

export interface LeadTimeSummary {
  minimum: number;
  sampleCount: number;
  average: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  maximum: number;
}
