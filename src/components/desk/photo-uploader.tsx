"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { X, Upload } from "lucide-react";

export function PhotoUploader({ urls, onChange }: { urls: string[]; onChange: (urls: string[]) => void }) {
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
          <div key={url} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="Foto danno" className="size-20 rounded-md object-cover" />
            <button
              type="button"
              onClick={() => onChange(urls.filter((u) => u !== url))}
              className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-destructive-foreground"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}
      </div>
      <label className="flex w-fit cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground hover:bg-accent">
        <Upload className="size-4" />
        {uploading ? "Caricamento..." : "Aggiungi foto"}
        <Input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            if (e.target.files?.length) void handleFiles(e.target.files);
          }}
        />
      </label>
    </div>
  );
}
