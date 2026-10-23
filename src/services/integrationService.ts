import type { Metrics, TimelinePoint } from "@/types/dashboard";

export function getQueueStatus(queue: number) {
  if (queue < 500) return { label: "NORMAL", level: "normal" as const };
  if (queue <= 1000) return { label: "ATENÇÃO", level: "warning" as const };
  if (queue <= 2000) return { label: "ALERTA", level: "alert" as const };
  return { label: "CRÍTICO", level: "critical" as const };
}

export const integrationService = {
  getSummary(metrics: Metrics, timeline: TimelinePoint[]) {
    const last = timeline.at(-1)?.queue ?? metrics.queue;
    const previous = timeline.at(-3)?.queue ?? last;
    const trend = last > previous * 1.02 ? "Fila crescendo nos últimos 30 minutos" : last < previous * 0.98 ? "Fila reduzindo nos últimos 30 minutos" : "Fila estável";
    return { queue: metrics.queue, integratedLastHour: Math.round(metrics.shipped * 0.0822), lastOrder: "#E213456789", lastTime: "14:58:32", averageTime: "02min 18s", status: getQueueStatus(metrics.queue), trend };
  },
};
