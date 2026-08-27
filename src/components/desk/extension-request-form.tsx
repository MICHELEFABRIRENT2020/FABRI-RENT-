"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { createExtensionRequest } from "@/lib/actions/desk-actions";
import { toDatetimeLocalValue, datetimeLocalToISO } from "@/lib/datetime-input";

export function ExtensionRequestForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [bookingId, setBookingId] = useState("");
  const [requestedEndDate, setRequestedEndDate] = useState(toDatetimeLocalValue(new Date()));
  const [channel, setChannel] = useState<"whatsapp" | "web">("whatsapp");

  function handleSubmit() {
    if (!bookingId.trim()) {
      toast.error("Inserisci l'ID della prenotazione.");
      return;
    }
    startTransition(async () => {
      try {
        await createExtensionRequest({
          bookingId: bookingId.trim(),
          requestedEndDate: datetimeLocalToISO(requestedEndDate),
          channel,
        });
        toast.success("Richiesta di prolungamento registrata");
        setBookingId("");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Errore");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Registra richiesta di prolungamento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Da usare quando il cliente richiede un prolungamento via WhatsApp o web: il sistema verifica la
          disponibilita&apos; e riassegna automaticamente eventuali clienti in conflitto ad un&apos;auto
          &quot;o simile&quot;.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="bookingId">ID Prenotazione</Label>
            <Input id="bookingId" value={bookingId} onChange={(e) => setBookingId(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newEnd">Nuova data riconsegna richiesta</Label>
            <Input
              id="newEnd"
              type="datetime-local"
              value={requestedEndDate}
              onChange={(e) => setRequestedEndDate(e.target.value)}
            />
          </div>
        </div>
        <RadioGroup value={channel} onValueChange={(v) => setChannel(v as typeof channel)} className="flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="whatsapp" /> WhatsApp
          </label>
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="web" /> Web
          </label>
        </RadioGroup>
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Salvataggio..." : "Registra richiesta"}
        </Button>
      </CardContent>
    </Card>
  );
}
