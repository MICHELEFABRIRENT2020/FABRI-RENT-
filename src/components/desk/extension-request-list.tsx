"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { decideExtensionRequest } from "@/lib/actions/desk-actions";
import { formatItalianDate } from "@/lib/rental-time";

export type ExtensionRequestDto = {
  id: string;
  bookingId: string;
  channel: string;
  requestedEndDate: string;
  status: string;
  booking: { user: { fullName: string }; vehicle: { name: string } | null };
};

export function ExtensionRequestList({ requests }: { requests: ExtensionRequestDto[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function decide(id: string) {
    startTransition(async () => {
      try {
        const res = await decideExtensionRequest(id);
        if (res.approved) {
          toast.success(
            res.bumped
              ? "Prolungamento approvato: un secondo cliente e' stato riassegnato ad un'auto o simile."
              : "Prolungamento approvato."
          );
        } else {
          toast.error("Prolungamento rifiutato: nessuna auto o simile disponibile per il cliente in conflitto.");
        }
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Errore");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Richieste in attesa</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {requests.length === 0 && <p className="text-sm text-muted-foreground">Nessuna richiesta in attesa.</p>}
        {requests.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="font-medium">{r.booking.user.fullName}</p>
              <p className="text-sm text-muted-foreground">
                {r.booking.vehicle?.name ?? "Veicolo"} - richiesta via {r.channel} - nuova riconsegna:{" "}
                {formatItalianDate(new Date(r.requestedEndDate))}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{r.status}</Badge>
              {r.status === "pending" && (
                <Button size="sm" disabled={isPending} onClick={() => decide(r.id)}>
                  Elabora
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
