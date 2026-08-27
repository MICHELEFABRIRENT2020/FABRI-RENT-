"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { reviewDocument } from "@/lib/actions/desk-actions";
import { toast } from "sonner";

const DOC_LABEL: Record<string, string> = {
  id_card_front: "Carta d'Identita' - Fronte",
  id_card_back: "Carta d'Identita' - Retro",
  license_front: "Patente - Fronte",
  license_back: "Patente - Retro",
};

const STATUS_VARIANT: Record<string, "secondary" | "default" | "destructive"> = {
  pending: "secondary",
  approved: "default",
  reupload_requested: "destructive",
};

export function DocumentAuditPanel({
  documents,
}: {
  documents: { id: string; documentType: string; fileUrl: string; status: string }[];
}) {
  const [isPending, startTransition] = useTransition();
  const [localStatus, setLocalStatus] = useState<Record<string, string>>({});

  function act(id: string, status: "approved" | "reupload_requested") {
    startTransition(async () => {
      try {
        await reviewDocument({ documentAuditId: id, status });
        setLocalStatus((s) => ({ ...s, [id]: status }));
        toast.success(status === "approved" ? "Documento approvato" : "Richiesto nuovo caricamento");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Errore");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Audit Documenti</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {documents.length === 0 && <p className="text-sm text-muted-foreground">Nessun documento caricato.</p>}
        {documents.map((doc) => {
          const status = localStatus[doc.id] ?? doc.status;
          return (
            <div key={doc.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
              <div className="flex items-center gap-3">
                <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-sm underline">
                  {DOC_LABEL[doc.documentType] ?? doc.documentType}
                </a>
                <Badge variant={STATUS_VARIANT[status] ?? "secondary"}>{status}</Badge>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={isPending} onClick={() => act(doc.id, "reupload_requested")}>
                  Richiedi Re-upload
                </Button>
                <Button size="sm" disabled={isPending} onClick={() => act(doc.id, "approved")}>
                  Approva
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
