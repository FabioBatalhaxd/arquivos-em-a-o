import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { createLovableAiGatewayRunIdFetch } from "./run-id.server";

export type OperationalAnalysisInput = {
  period: string;
  operation: string;
  metrics: Record<string, number>;
  delivery: Record<string, number>;
  carriers: Array<{ name: string; orders: number; shipped: number; pending: number }>;
  orderTimeline: Array<{ time: string; sold: number; shipped: number; queue: number }>;
  deliveryTimeline: Array<{ time: string; coletado: number; transito: number; rota: number; entregue: number; ocorrencias: number; leadTime: number }>;
};

function safeGatewayMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) return error.message;
  return "Não foi possível concluir a análise neste momento.";
}

export async function analyzeOperationalData(data: OperationalAnalysisInput) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("A análise por IA ainda não está configurada.");

  const runIdFetch = createLovableAiGatewayRunIdFetch();
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: {
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
    fetch: runIdFetch.fetch,
  });

  try {
    const result = streamText({
      model: provider.responses("openai/gpt-6-astra"),
      system: "Você é um especialista sênior em operações de e-commerce e logística. Analise somente os dados agregados fornecidos. Não invente causas ou números. Responda em português do Brasil, de forma executiva e direta.",
      prompt: `Analise o período ${data.period}, operação ${data.operation}. Identifique anomalias em pedidos, transportadoras e lead time e recomende ações operacionais priorizadas. Para cada achado, use exatamente: SEVERIDADE — TÍTULO; Evidência: ...; Impacto: ...; Ação: ... . Termine com uma seção PRIORIDADE IMEDIATA contendo até 3 ações. Se não houver evidência suficiente, declare isso. Dados agregados: ${JSON.stringify(data)}`,
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "medium",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
    });
    return { text: await result.text, runId: runIdFetch.getRunId() };
  } catch (error) {
    throw new Error(safeGatewayMessage(error));
  }
}