"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type IssuingAuthorityOption = { id: string; name: string; pec: string | null };

export function IssuingAuthorityPicker({
  name,
  pec,
  onChange,
}: {
  name: string;
  pec: string;
  onChange: (name: string, pec: string) => void;
}) {
  const [results, setResults] = useState<IssuingAuthorityOption[]>([]);

  useEffect(() => {
    if (name.trim().length < 2) {
      const timeout = setTimeout(() => setResults([]), 0);
      return () => clearTimeout(timeout);
    }
    const timeout = setTimeout(() => {
      fetch(`/api/desk/issuing-authorities?q=${encodeURIComponent(name)}`)
        .then((r) => r.json())
        .then((data) => setResults(data.results ?? []));
    }, 250);
    return () => clearTimeout(timeout);
  }, [name]);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label>Ente verbalizzante</Label>
        <Input value={name} onChange={(e) => onChange(e.target.value, pec)} placeholder="es. Comune di Napoli - Polizia Municipale" />
        {results.length > 0 && (
          <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-1">
            {results.map((r) => (
              <button
                key={r.id}
                type="button"
                className="block w-full rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent"
                onClick={() => {
                  onChange(r.name, r.pec ?? "");
                  setResults([]);
                }}
              >
                <span className="font-medium">{r.name}</span>{" "}
                <span className="text-muted-foreground">{r.pec ?? "PEC non presente"}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="space-y-2">
        <Label>PEC (elemento principale)</Label>
        <Input value={pec} onChange={(e) => onChange(name, e.target.value)} placeholder="pec@enteverbalizzante.it" />
        <p className="text-xs text-muted-foreground">
          Salvando la multa, questa PEC viene aggiunta/aggiornata nella rubrica dell&apos;azienda.
        </p>
      </div>
    </div>
  );
}
