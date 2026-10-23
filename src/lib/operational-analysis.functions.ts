import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { analyzeOperationalData } from "./ai/anomaly-analysis.server";

const timelinePoint = z.object({
  time: z.string(), sold: z.number(), shipped: z.number(), queue: z.number(),
});

const deliveryPoint = z.object({
  time: z.string(), coletado: z.number(), transito: z.number(), rota: z.number(),
  entregue: z.number(), ocorrencias: z.number(), leadTime: z.number(),
});

const analysisInput = z.object({
  period: z.string(),
  operation: z.string(),
  metrics: z.record(z.number()),
  delivery: z.record(z.number()),
  carriers: z.array(z.object({ name: z.string(), orders: z.number(), shipped: z.number(), pending: z.number() })),
  orderTimeline: z.array(timelinePoint),
  deliveryTimeline: z.array(deliveryPoint),
});

export const analyzeOperationalAnomalies = createServerFn({ method: "POST" })
  .validator((data) => analysisInput.parse(data))
  .handler(async ({ data }) => analyzeOperationalData(data));