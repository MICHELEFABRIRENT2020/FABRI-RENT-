import { requireRole, STAFF_ROLES } from "@/lib/session";
import { isAiAssistantConfigured } from "@/lib/ai-assistant";
import { AiAssistantChat } from "@/components/desk/ai-assistant-chat";

export default async function AiAssistantPage() {
  await requireRole(...STAFF_ROLES);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Assistente AI</h1>
        <p className="text-sm text-muted-foreground">
          Ricerca rapida di clienti, veicoli, contratti e statistiche. Solo lettura: non puo&apos; creare, modificare
          o cancellare dati.
        </p>
      </div>
      <AiAssistantChat configured={isAiAssistantConfigured()} />
    </div>
  );
}
