"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";

export type BrandModelResult = {
  brandId: string;
  brandName: string;
  modelId: string;
  modelName: string;
  category: string | null;
};

/**
 * Searches the global vehicle make/model catalog (section 7). Selecting a
 * result fills brandId/vehicleModelId (kept in sync with the parent's
 * free-text brand/model inputs); the parent form still lets the operator
 * type a brand/model that isn't in the catalog (free text stays valid,
 * just without the FK link).
 */
export function BrandModelPicker({
  onSelect,
  placeholder = "Es. Fiat Panda, Volkswagen Golf...",
}: {
  onSelect: (result: BrandModelResult) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BrandModelResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      const timeout = setTimeout(() => setResults([]), 0);
      return () => clearTimeout(timeout);
    }
    const timeout = setTimeout(() => {
      setLoading(true);
      fetch(`/api/vehicle-catalog/search?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((data) => setResults(data.results ?? []))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <div className="space-y-2">
      <Label>Cerca nel catalogo marche/modelli</Label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input className="pl-8" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} />
      </div>
      {loading && <p className="text-xs text-muted-foreground">Ricerca...</p>}
      {results.length > 0 && (
        <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border p-1">
          {results.map((r) => (
            <button
              key={r.modelId}
              type="button"
              className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
              onClick={() => {
                onSelect(r);
                setResults([]);
                setQuery(`${r.brandName} ${r.modelName}`);
              }}
            >
              <span className="font-medium">{r.brandName}</span> <span>{r.modelName}</span>
              {r.category && <span className="text-muted-foreground"> - {r.category}</span>}
            </button>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Non trovi il modello? Compila comunque marca e modello qui sotto: verranno salvati come testo libero.
      </p>
    </div>
  );
}
