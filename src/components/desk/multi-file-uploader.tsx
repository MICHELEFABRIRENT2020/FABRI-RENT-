"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Upload, X, FileText } from "lucide-react";

export function MultiFileUploader({
  urls,
  onChange,
  accept,
  label,
}: {
  urls: string[];
  onChange: (urls: string[]) => void;
  accept: string;
  label: string;
}) {
  const [uploading, setUploading] = useState(false);

  async function handleFiles(files: FileList) {
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", "damage-photos");
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (res.ok) {
          const { url } = await res.json();
          uploaded.push(url);
        }
      }
      onChange([...urls, ...uploaded]);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {urls.map((url) => (
          <div key={url} className="relative flex items-center gap-1 rounded-md border px-2 py-1 text-xs">
            <FileText className="size-3.5" />
            <span className="max-w-[10rem] truncate">{url.split("/").pop()}</span>
            <button type="button" onClick={() => onChange(urls.filter((u) => u !== url))} className="text-destructive">
              <X className="size-3" />
            </button>
          </div>
        ))}
      </div>
      <label className="flex w-fit cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground hover:bg-accent">
        <Upload className="size-4" />
        {uploading ? "Caricamento..." : label}
        <Input type="file" accept={accept} multiple className="hidden" disabled={uploading} onChange={(e) => {
          if (e.target.files?.length) void handleFiles(e.target.files);
        }} />
      </label>
    </div>
  );
}
