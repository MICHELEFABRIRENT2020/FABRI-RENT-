"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

export type DocumentSlotKey = "idCardFrontUrl" | "idCardBackUrl" | "licenseFrontUrl" | "licenseBackUrl";

const SLOTS: { key: DocumentSlotKey; label: string }[] = [
  { key: "idCardFrontUrl", label: "Carta d'Identita' - Fronte" },
  { key: "idCardBackUrl", label: "Carta d'Identita' - Retro" },
  { key: "licenseFrontUrl", label: "Patente - Fronte" },
  { key: "licenseBackUrl", label: "Patente - Retro" },
];

export function DocumentUploader({
  values,
  onChange,
}: {
  values: Partial<Record<DocumentSlotKey, string>>;
  onChange: (key: DocumentSlotKey, url: string) => void;
}) {
  const [uploading, setUploading] = useState<Partial<Record<DocumentSlotKey, boolean>>>({});
  const [errors, setErrors] = useState<Partial<Record<DocumentSlotKey, string>>>({});

  async function handleFile(key: DocumentSlotKey, file: File) {
    setUploading((s) => ({ ...s, [key]: true }));
    setErrors((s) => ({ ...s, [key]: undefined }));
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "documents");
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Errore di caricamento");
      }
      const { url } = await res.json();
      onChange(key, url);
    } catch (err) {
      setErrors((s) => ({ ...s, [key]: err instanceof Error ? err.message : "Errore di caricamento" }));
    } finally {
      setUploading((s) => ({ ...s, [key]: false }));
    }
  }

  return (
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
                "flex h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed text-xs text-muted-foreground transition-colors hover:bg-accent",
                url && "border-primary bg-primary/5 text-primary"
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
                  <span>{isUploading ? "Caricamento..." : "Carica file"}</span>
                </>
              )}
            </label>
            <Input
              id={slot.key}
              type="file"
              accept="image/png,image/jpeg,image/webp,application/pdf"
              className="hidden"
              disabled={isUploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(slot.key, file);
              }}
            />
            {isUploading && <Progress value={66} className="h-1" />}
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        );
      })}
    </div>
  );
}
