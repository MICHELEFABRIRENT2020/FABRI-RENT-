"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bot, User, Send } from "lucide-react";
import { askAiAssistant } from "@/lib/actions/ai-assistant-actions";

type ChatMessage = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Quanti veicoli sono attualmente disponibili?",
  "Cerca il cliente Mario Rossi",
  "Ci sono notifiche critiche attive?",
];

export function AiAssistantChat({ configured }: { configured: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function send(text: string) {
    if (!text.trim() || isPending) return;
    setError(null);
    const history = messages;
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");

    startTransition(async () => {
      const result = await askAiAssistant(text, history);
      if (result.ok) {
        setMessages((prev) => [...prev, { role: "assistant", content: result.answer }]);
      } else {
        setError(result.reason);
      }
    });
  }

  if (!configured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="size-4" /> Assistente AI
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Assistente AI non configurato: imposta <code className="text-xs">ANTHROPIC_API_KEY</code> per
            attivarlo. L&apos;interfaccia e gli strumenti di ricerca (clienti, veicoli, contratti, statistiche
            flotta, notifiche) sono gia&apos; pronti.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="size-4" /> Assistente AI
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-h-96 space-y-3 overflow-y-auto rounded-md border border-border bg-muted/20 p-3">
          {messages.length === 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Chiedi informazioni operative: clienti, veicoli, contratti, statistiche flotta, notifiche attive.
                Non puo&apos; creare, modificare o cancellare nulla.
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-accent"
                    onClick={() => send(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex items-start gap-2 ${m.role === "user" ? "flex-row-reverse text-right" : ""}`}>
              <div className="mt-0.5 shrink-0 rounded-full bg-muted p-1.5">
                {m.role === "user" ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
              </div>
              <p className={`whitespace-pre-wrap rounded-md px-3 py-2 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}>
                {m.content}
              </p>
            </div>
          ))}
          {isPending && <p className="text-xs text-muted-foreground">L&apos;assistente sta rispondendo...</p>}
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div ref={scrollRef} />
        </div>
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Scrivi una domanda..."
            className="min-h-16 resize-none"
            disabled={isPending}
          />
          <Button onClick={() => send(input)} disabled={isPending || !input.trim()}>
            <Send className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
