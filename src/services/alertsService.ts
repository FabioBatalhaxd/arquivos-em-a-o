import type { AlertItem, Metrics, OperationMetrics } from "@/types/dashboard";

export const alertsService = {
  getAlerts(metrics: Metrics, operations: OperationMetrics[], leadTimeDays = 0): AlertItem[] {
    const alerts: AlertItem[] = [];
    if (metrics.queue >= 1000) alerts.push({ id: "queue", level: metrics.queue > 2000 ? "critical" : "warning", title: "FILA INTELIPOST ACIMA DO LIMITE", description: `${metrics.queue.toLocaleString("pt-BR")} pedidos aguardando integração.`, context: "Intelipost", time: "15:18", action: "Redistribuir capacidade de integração e monitorar a fila." });
    const feminino = operations.find((operation) => operation.key === "CD_FEMININO");
    if (feminino && feminino.picking > 2000) alerts.push({ id: "feminino", level: "warning", title: "CD FEMININO COM ACÚMULO", description: `${feminino.picking.toLocaleString("pt-BR")} pedidos em picking.`, context: "CD Feminino", time: "15:12", action: "Reforçar a onda de separação prioritária." });
    if (metrics.sold > 50000) alerts.push({ id: "carrier", level: "warning", title: "J&T COM VOLUME ACIMA DO NORMAL", description: "Volume expedido 18% acima do esperado.", context: "J&T", time: "15:08", action: "Confirmar janela extra de coleta com a transportadora." });
    if (leadTimeDays > 1.8 || metrics.shipped > 80000) alerts.push({ id: "lead", level: "critical", title: "LEAD TIME ACIMA DO PADRÃO", description: `O maior lead time por UF chegou a ${leadTimeDays.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} dias.`, context: "Operação nacional", time: "14:54", action: "Priorizar os pedidos das UFs com maior tempo de entrega." });
    return alerts;
  },
};
