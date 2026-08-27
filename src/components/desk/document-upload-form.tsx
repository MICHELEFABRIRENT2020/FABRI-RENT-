"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { createDocumentRecord } from "@/lib/actions/document-actions";
import { DOCUMENT_ENTITY_TYPES, type DocumentEntityType } from "@/lib/document-types";

const ENTITY_LABEL: Record<DocumentEntityType, string> = {
  cliente: "Cliente",
  contratto: "Contratto",
  veicolo: "Veicolo",
  assicurazione: "Assicurazione",
  multa: "Multa",
  sinistro: "Sinistro",
  officina: "Officina",
  fattura: "Fattura",
  altro: "Altro",
};

export function DocumentUploadForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [entityType, setEntityType] = useState<DocumentEntityType>("altro");
  const [entityId, setEntityId] = useState("");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);

  function handleSubmit(file: File) {
    setUploading(true);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", "documents");
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (!res.ok) throw new Error("Errore di caricamento file");
        const { url } = await res.json();

        await createDocumentRecord({
          entityType,
          entityId: entityId || "n/a",
          fileUrl: url,
          fileName: file.name,
          fileType: file.type,
          notes: notes || undefined,
        });
        toast.success("Documento caricato");
        setEntityId("");
        setNotes("");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Errore");
      } finally {
        setUploading(false);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Carica documento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={entityType} onValueChange={(v) => setEntityType(v as DocumentEntityType)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_ENTITY_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {ENTITY_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Riferimento (ID contratto/veicolo/etc, opzionale)</Label>
            <Input value={entityId} onChange={(e) => setEntityId(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Note</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <Input
          type="file"
          accept="image/*,application/pdf"
          disabled={uploading || isPending}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleSubmit(file);
          }}
        />
      </CardContent>
    </Card>
  );
}
