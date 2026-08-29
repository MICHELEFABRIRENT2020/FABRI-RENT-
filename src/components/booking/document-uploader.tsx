"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExtractedPersonFields, ScannedDocumentKind } from "@/lib/ocr-provider";

export type DocumentSlotKey = "idCardFrontUrl" | "idCardBackUrl" | "licenseFrontUrl" | "licenseBackUrl";

const SLOTS: { key: DocumentSlotKey; label: string; kind: ScannedDocumentKind }[] = [
  { key: "idCardFrontUrl", label: "Carta d'Identita' - Fronte", kind: "id_card" },
  { key: "idCardBackUrl", label: "Carta d'Identita' - Retro", kind: "id_card" },
  { key: "licenseFrontUrl", label: "Patente - Fronte", kind: "driver_license" },
  { key: "licenseBackUrl", label: "Patente - Retro", kind: "driver_license" },
];

export function DocumentUploader({
  values,
  onChange,
  onExtracted,
  consentGiven,
  consentTimestamp,
}: {
  values: Partial<Record<DocumentSlotKey, string>>;
  onChange: (key: DocumentSlotKey, url: string) => void;
  onExtracted?: (fields: ExtractedPersonFields) => void;
  consentGiven: boolean;
  consentTimestamp: string | null;
}) {
  const [uploading, setUploading] = useState<Partial<Record<DocumentSlotKey, boolean>>>({});
  const [errors, setErrors] = useState<Partial<Record<DocumentSlotKey, string>>>({});
  const [ocrNotes, setOcrNotes] = useState<Partial<Record<DocumentSlotKey, string>>>({});

  async function handleFile(slot: (typeof SLOTS)[number], file: File) {
    const key = slot.key;
    if (!consentGiven) {
      setErrors((s) => ({ ...s, [key]: "Accetta l'informativa privacy prima di caricare i documenti." }));
      return;
    }
    setUploading((s) => ({ ...s, [key]: true }));
    setErrors((s) => ({ ...s, [key]: undefined }));
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", slot.kind);
      formData.append("consent", "true");
      if (consentTimestamp) formData.append("consentAt", consentTimestamp);
      const res = await fetch("/api/ocr/scan", { method: "POST", body: formData });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Errore di caricamento");
      }
      const data = await res.json();
      onChange(key, data.url);
      if (data.ocr?.ok) {
        onExtracted?.(data.ocr.fields);
        setOcrNotes((s) => ({ ...s, [key]: undefined }));
      } else {
        setOcrNotes((s) => ({ ...s, [key]: data.ocr?.reason ?? "Scansione AI non disponibile: verifica i dati manualmente." }));
      }
    } catch (err) {
      setErrors((s) => ({ ...s, [key]: err instanceof Error ? err.message : "Errore di caricamento" }));
    } finally {
      setUploading((s) => ({ ...s, [key]: false }));
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-4 sm:grid-cols-2">
        {SLOTS.map((slot) => {
          const url = values[slot.key];
          const isUploading = uploading[slot.key];
          const error = errors[slot.key];
          return (
            <div key={slot.key} className="space-y-2">
              <Label htmlFor={slot.key}>{slot.label}</Label>
              <label
                htmlFor={slot.key}
                className={cn(
                  "flex h-24 flex-col items-center justify-center gap-1 rounded-md border border-dashed text-xs text-muted-foreground transition-colors",
                  url && "border-primary bg-primary/5 text-primary",
                  !consentGiven && !url ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-accent"
                )}
              >
                {url ? (
                  <>
                    <CheckCircle2 className="size-5" />
                    <span>Caricato</span>
                  </>
                ) : (
                  <>
                    <Upload className="size-5" />
                    <span>
                      {!consentGiven
                        ? "Accetta l'informativa privacy per caricare"
                        : isUploading
                          ? "Scansione AI..."
                          : "Scatta foto o carica file"}
                    </span>
                  </>
                )}
              </label>
              <Input
                id={slot.key}
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                capture="environment"
                className="hidden"
                disabled={isUploading || !consentGiven}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(slot, file);
                }}
              />
              {isUploading && <Progress value={66} className="h-1" />}
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
          );
        })}
      </div>
      {Object.values(ocrNotes).some(Boolean) && (
        <p className="text-xs text-muted-foreground">
          Scansione AI non disponibile per uno o piu&apos; documenti: Nuovo / Inserimento manuale - verifica e
          completa i dati anagrafici nel modulo qui sopra.
        </p>
      )}
    </div>
  );
}
