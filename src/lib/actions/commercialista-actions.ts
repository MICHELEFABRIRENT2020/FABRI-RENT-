"use server";

import Anthropic from "@anthropic-ai/sdk";
import { assertTenant, ADMIN_ROLES } from "@/lib/session";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { computeFinancialReport, type FinancialReport } from "@/lib/commercialista";
import { isAiAssistantConfigured } from "@/lib/ai-assistant";
import { logger } from "@/lib/logger";

export async function getFinancialReport(from: string, to: string): Promise<FinancialReport> {
  const { user, tenantId } = await assertTenant();
  if (!ADMIN_ROLES.includes(user.role) && user.role !== "contabilita") throw new Error("Non autorizzato.");
  return computeFinancialReport(tenantId, new Date(from), new Date(to));
}

/**
 * AI narrative layer: explains the ALREADY-COMPUTED deterministic report
 * in plain language. The model is given the finished numbers as data and
 * explicitly instructed never to recompute or alter them - see the system
 * prompt below. This is commentary, not accounting: it never substitutes
 * for a real accountant, and the UI must say so wherever this is shown.
 */
export async function generateFinancialNarrative(
  report: FinancialReport
): Promise<{ ok: true; narrative: string } | { ok: false; reason: string }> {
  const { user, tenantId } = await assertTenant();
  if (!ADMIN_ROLES.includes(user.role) && user.role !== "contabilita") return { ok: false, reason: "Non autorizzato." };
  if (!isAiAssistantConfigured()) return { ok: false, reason: "Assistente AI non configurato (ANTHROPIC_API_KEY mancante)." };

  const limit = await rateLimit("ai-assistant", `${tenantId}:${user.id}`, RATE_LIMITS.aiAssistant);
  if (!limit.allowed) return { ok: false, reason: "Troppe richieste, riprova tra qualche minuto." };

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 1024,
      system:
        "Sei un assistente che spiega in italiano semplice un report finanziario GIA' CALCOLATO da codice deterministico, fornito come JSON. " +
        "Non calcolare, stimare o correggere alcun numero: usa esclusivamente quelli forniti. " +
        "Riassumi l'andamento, evidenzia le anomalie piu' rilevanti, e ricorda che questo NON sostituisce un commercialista abilitato. " +
        "Massimo 200 parole.",
      messages: [{ role: "user", content: JSON.stringify(report) }],
    });

    const narrative = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    return { ok: true, narrative: narrative || "Nessuna sintesi generata." };
  } catch (error) {
    logger.error({ err: error, tenantId }, "[commercialista] narrative generation failed");
    return { ok: false, reason: "Errore imprevisto durante la generazione della sintesi." };
  }
}
