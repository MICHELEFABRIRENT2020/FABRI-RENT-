"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Camera, Upload, FileText, X } from "lucide-react";
import { toast } from "sonner";
import type { ExtractedPersonFields, ScannedDocumentKind } from "@/lib/ocr-provider";

const MAX_FILES = 10;
const MAX_SIZE_BYTES = 12 * 1024 * 1024;
const ACCEPTED = "image/jpeg,image/png,image/webp,application/pdf";

type ScannedFile = { url: string; name: string; fields: ExtractedPersonFields | null; ocrNote: string | null };

/**
 * Reusable AI document scanner (section 3): scatta foto / fotocamera /
 * galleria / carica PDF / drag&drop multiplo, fino a 10 file da 12MB.
 * Extracted fields (when a Vision provider is configured) are shown as an
 * editable review form the operator can correct before accepting; when OCR
 * isn't available it always falls back to manual entry.
 */
export function DocumentScanner({
  kind,
  onExtracted,
}: {
  kind: ScannedDocumentKind;
  onExtracted?: (fields: ExtractedPersonFields) => void;
}) {
  const [files, setFiles] = useState<ScannedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  async function uploadOne(file: File) {
    if (file.size > MAX_SIZE_BYTES) {
      toast.error(`${file.name}: file troppo grande (max 12MB)`);
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", kind);
    const res = await fetch("/api/ocr/scan", { method: "POST", body: formData });
    if (!res.ok) {
      toast.error(`${file.name}: errore di caricamento`);
      return;
    }
    const data = await res.json();
    const scanned: ScannedFile = {
      url: data.url,
      name: file.name,
      fields: data.ocr?.ok ? data.ocr.fields : null,
      ocrNote: data.ocr?.ok ? null : data.ocr?.reason ?? null,
    };
    setFiles((prev) => [...prev, scanned]);
    if (scanned.fields && onExtracted) onExtracted(scanned.fields);
  }

  async function handleFiles(fileList: FileList) {
    const remaining = MAX_FILES - files.length;
    if (remaining <= 0) {
      toast.error(`Massimo ${MAX_FILES} file.`);
      return;
    }
    setUploading(true);
    try {
      for (const file of Array.from(fileList).slice(0, remaining)) {
        await uploadOne(file);
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div
        className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) void handleFiles(e.dataTransfer.files);
        }}
      >
        <Upload className="size-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Trascina qui i file oppure scegli un&apos;opzione (max {MAX_FILES} file, 12MB ciascuno)
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button type="button" size="sm" variant="outline" disabled={uploading} onClick={() => cameraInputRef.current?.click()}>
            <Camera className="mr-1.5 size-4" /> Scatta foto
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={uploading} onClick={() => galleryInputRef.current?.click()}>
            <FileText className="mr-1.5 size-4" /> Galleria / PDF
          </Button>
        </div>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => e.target.files && void handleFiles(e.target.files)}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept={ACCEPTED}
          multiple
          className="hidden"
          onChange={(e) => e.target.files && void handleFiles(e.target.files)}
        />
        {uploading && <p className="text-xs text-muted-foreground">Scansione AI in corso...</p>}
      </div>

      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((f) => (
            <div key={f.url} className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs">
              <FileText className="size-3.5" />
              <span className="max-w-[9rem] truncate">{f.name}</span>
              <button type="button" onClick={() => setFiles((prev) => prev.filter((x) => x.url !== f.url))} className="text-destructive">
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {files.some((f) => f.ocrNote) ? (
        <Alert>
          <AlertDescription>
            Scansione AI non disponibile per uno o piu&apos; file ({files.find((f) => f.ocrNote)?.ocrNote}). Nuovo /
            Inserimento manuale: compila i campi anagrafici direttamente nel modulo qui sotto.
          </AlertDescription>
        </Alert>
      ) : (
        <p className="text-xs text-muted-foreground">
          In alternativa alla scansione, puoi sempre procedere con Nuovo / Inserimento manuale nel modulo qui sotto.
        </p>
      )}
    </div>
  );
}
