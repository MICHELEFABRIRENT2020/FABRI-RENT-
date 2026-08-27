import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import type { Prisma } from "@/generated/prisma/client";

/**
 * AI Assistant (section: AI Assistant), tool-layer architecture:
 *
 *   AI SERVICE (this file) -> TOOL LAYER (buildTools) -> PERMISSION LAYER
 *   (every tool closes over the caller's tenantId; the model can never
 *   choose which tenant to query) -> DOMAIN SERVICES (plain Prisma reads)
 *   -> DATABASE
 *
 * Every tool is read-only by design - search/lookup/summary/stats. There
 * is deliberately no write or destructive tool in this version: the spec
 * requires explicit confirmation before any financial or destructive
 * operation, and the safest way to guarantee that in v1 is to not expose
 * one at all rather than half-build a confirmation flow. Extend
 * `buildTools` with a write tool only alongside a real confirmation UI.
 */

const MODEL = "claude-opus-5";
const MAX_TOKENS = 4096;
const MAX_ITERATIONS = 6;

export function isAiAssistantConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function getClient(): Anthropic {
  return new Anthropic(); // resolves ANTHROPIC_API_KEY from the environment
}

type ToolCallRecord = { name: string; input: unknown; resultSummary: string };

function buildTools(tenantId: string, toolLog: ToolCallRecord[]) {
  const record = (name: string, input: unknown, resultSummary: string) => {
    toolLog.push({ name, input, resultSummary });
  };

  return [
    betaZodTool({
      name: "search_customer",
      description: "Cerca un cliente per nome, email o telefono. Restituisce al massimo 5 risultati.",
      inputSchema: z.object({ query: z.string().describe("Nome, email o telefono, anche parziale") }),
      run: async ({ query }) => {
        const results = await prisma.user.findMany({
          where: {
            tenantId,
            role: "client",
            OR: [
              { fullName: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
              { phone: { contains: query, mode: "insensitive" } },
            ],
          },
          take: 5,
          select: { id: true, fullName: true, email: true, phone: true, createdAt: true },
        });
        record("search_customer", { query }, `${results.length} risultati`);
        return JSON.stringify(results);
      },
    }),
    betaZodTool({
      name: "search_vehicle",
      description: "Cerca un veicolo per targa, nome, marca o modello. Restituisce al massimo 5 risultati.",
      inputSchema: z.object({ query: z.string() }),
      run: async ({ query }) => {
        const results = await prisma.vehicle.findMany({
          where: {
            tenantId,
            OR: [
              { plate: { contains: query, mode: "insensitive" } },
              { name: { contains: query, mode: "insensitive" } },
              { brand: { contains: query, mode: "insensitive" } },
              { model: { contains: query, mode: "insensitive" } },
            ],
          },
          take: 5,
          select: { id: true, name: true, plate: true, status: true, category: true, dailyRate: true },
        });
        record("search_vehicle", { query }, `${results.length} risultati`);
        return JSON.stringify(results);
      },
    }),
    betaZodTool({
      name: "search_contract",
      description: "Cerca un contratto di noleggio per numero, targa o nome/email cliente. Restituisce al massimo 5 risultati.",
      inputSchema: z.object({ query: z.string() }),
      run: async ({ query }) => {
        const numericQuery = Number(query);
        const results = await prisma.booking.findMany({
          where: {
            tenantId,
            serviceType: "rent",
            OR: [
              ...(Number.isFinite(numericQuery) ? [{ contractNumber: numericQuery }] : []),
              { vehicle: { plate: { contains: query, mode: "insensitive" as const } } },
              { user: { fullName: { contains: query, mode: "insensitive" as const } } },
              { user: { email: { contains: query, mode: "insensitive" as const } } },
            ],
          },
          take: 5,
          include: { user: true, vehicle: true },
        });
        record("search_contract", { query }, `${results.length} risultati`);
        return JSON.stringify(
          results.map((b) => ({
            id: b.id,
            contractNumber: b.contractNumber,
            customer: b.user.fullName,
            vehicle: b.vehicle?.name,
            plate: b.vehicle?.plate,
            status: b.status,
            startDate: b.startDate,
            endDate: b.endDate,
            totalPrice: b.totalPrice.toString(),
            paymentStatus: b.paymentStatus,
          }))
        );
      },
    }),
    betaZodTool({
      name: "contract_summary",
      description: "Riepilogo completo di un contratto dato il suo ID (usa prima search_contract per trovare l'ID).",
      inputSchema: z.object({ bookingId: z.string() }),
      run: async ({ bookingId }) => {
        const booking = await prisma.booking.findFirst({
          where: { id: bookingId, tenantId },
          include: { user: true, vehicle: true, insuranceOption: true, payments: true, extras: { include: { extraService: true } } },
        });
        record("contract_summary", { bookingId }, booking ? "trovato" : "non trovato");
        if (!booking) return JSON.stringify({ error: "Contratto non trovato" });
        return JSON.stringify({
          contractNumber: booking.contractNumber,
          customer: booking.user.fullName,
          vehicle: booking.vehicle?.name,
          plate: booking.vehicle?.plate,
          status: booking.status,
          startDate: booking.startDate,
          endDate: booking.endDate,
          actualReturnAt: booking.actualReturnAt,
          totalPrice: booking.totalPrice.toString(),
          depositAmount: booking.depositAmount.toString(),
          insurance: booking.insuranceOption?.label,
          extras: booking.extras.map((e) => e.extraService.label),
          payments: booking.payments.map((p) => ({ method: p.method, status: p.status, amount: p.amount.toString() })),
        });
      },
    }),
    betaZodTool({
      name: "fleet_stats",
      description: "Statistiche aggregate della flotta: numero veicoli per stato (disponibile, noleggiato, manutenzione, ecc.).",
      inputSchema: z.object({}),
      run: async () => {
        const stats = await prisma.vehicle.groupBy({ by: ["status"], where: { tenantId }, _count: { _all: true } });
        record("fleet_stats", {}, `${stats.length} stati`);
        return JSON.stringify(stats.map((s) => ({ status: s.status, count: s._count._all })));
      },
    }),
    betaZodTool({
      name: "notification_summary",
      description: "Riepilogo delle notifiche/alert attivi (non lette/non ignorate), raggruppate per tipo e gravita'.",
      inputSchema: z.object({}),
      run: async () => {
        const notifications = await prisma.notification.findMany({
          where: { tenantId, dismissedAt: null },
          select: { type: true, severity: true },
        });
        const bySeverity = notifications.reduce<Record<string, number>>((acc, n) => {
          acc[n.severity] = (acc[n.severity] ?? 0) + 1;
          return acc;
        }, {});
        record("notification_summary", {}, `${notifications.length} notifiche attive`);
        return JSON.stringify({ total: notifications.length, bySeverity });
      },
    }),
  ];
}

const SYSTEM_PROMPT = `Sei l'assistente AI interno di FabriGroup Rent Manager, un gestionale per autonoleggio.
Rispondi in italiano, in modo conciso e operativo, rivolgendoti a un membro dello staff (non al cliente finale).
Usa sempre gli strumenti disponibili per rispondere con dati reali: non inventare mai numeri, targhe, nomi cliente o importi.
Se uno strumento non trova risultati, dillo chiaramente invece di indovinare.
Non hai accesso a strumenti di scrittura: non puoi creare, modificare o cancellare nulla. Se ti viene chiesta un'azione di questo tipo, spiega che va eseguita manualmente nel gestionale e indica in quale sezione.`;

export type AskAssistantResult = { ok: true; answer: string } | { ok: false; reason: string };

export async function askAssistant(params: {
  tenantId: string;
  actorId: string;
  message: string;
  history: { role: "user" | "assistant"; content: string }[];
}): Promise<AskAssistantResult> {
  if (!isAiAssistantConfigured()) {
    return { ok: false, reason: "Assistente AI non configurato (ANTHROPIC_API_KEY mancante)." };
  }

  const toolLog: ToolCallRecord[] = [];
  const client = getClient();

  try {
    const finalMessage = await client.beta.messages.toolRunner({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      tools: buildTools(params.tenantId, toolLog),
      messages: [
        ...params.history.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: params.message },
      ],
      max_iterations: MAX_ITERATIONS,
    });

    const answer = finalMessage.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    await prisma.aiInteractionLog.create({
      data: {
        tenantId: params.tenantId,
        actorId: params.actorId,
        prompt: params.message.slice(0, 2000),
        toolsUsed: toolLog.length > 0 ? (JSON.parse(JSON.stringify(toolLog)) as Prisma.InputJsonValue) : undefined,
        responsePreview: answer.slice(0, 500),
        model: finalMessage.model,
        inputTokens: finalMessage.usage.input_tokens,
        outputTokens: finalMessage.usage.output_tokens,
      },
    });

    return { ok: true, answer: answer || "Nessuna risposta testuale generata." };
  } catch (error) {
    logger.error({ err: error, tenantId: params.tenantId }, "[ai-assistant] request failed");
    if (error instanceof Anthropic.AuthenticationError) {
      return { ok: false, reason: "Chiave API Anthropic non valida." };
    }
    if (error instanceof Anthropic.RateLimitError) {
      return { ok: false, reason: "Limite di richieste dell'assistente AI superato, riprova tra poco." };
    }
    return { ok: false, reason: "Errore imprevisto dell'assistente AI." };
  }
}
