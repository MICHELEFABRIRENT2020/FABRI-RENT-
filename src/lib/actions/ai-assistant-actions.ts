"use server";

import { assertTenant, STAFF_ROLES } from "@/lib/session";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { askAssistant, isAiAssistantConfigured } from "@/lib/ai-assistant";

export async function isAssistantAvailable(): Promise<boolean> {
  return isAiAssistantConfigured();
}

export async function askAiAssistant(
  message: string,
  history: { role: "user" | "assistant"; content: string }[]
): Promise<{ ok: true; answer: string } | { ok: false; reason: string }> {
  const { user, tenantId } = await assertTenant();
  if (!STAFF_ROLES.includes(user.role)) return { ok: false, reason: "Non autorizzato." };
  if (!message.trim()) return { ok: false, reason: "Messaggio vuoto." };
  if (message.length > 2000) return { ok: false, reason: "Messaggio troppo lungo (max 2000 caratteri)." };

  const limit = await rateLimit("ai-assistant", `${tenantId}:${user.id}`, RATE_LIMITS.aiAssistant);
  if (!limit.allowed) return { ok: false, reason: "Troppe richieste, riprova tra qualche minuto." };

  // Cap history sent back to the model - keeps cost/latency bounded on long sessions.
  const trimmedHistory = history.slice(-10);

  return askAssistant({ tenantId, actorId: user.id, message: message.trim(), history: trimmedHistory });
}
