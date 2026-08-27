"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";

export type ContractSearchResult = {
  bookingId: string;
  contractNumber: number | null;
  customerId: string;
  customerName: string;
  vehicleId: string | null;
  vehicleName: string | null;
  plate: string | null;
};

export function ContractSearchPicker({
  onSelect,
  selected,
  label = "Cerca cliente, contratto o targa",
}: {
  onSelect: (result: ContractSearchResult) => void;
  selected: ContractSearchResult | null;
  label?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ContractSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      const timeout = setTimeout(() => setResults([]), 0);
      return () => clearTimeout(timeout);
    }
    const timeout = setTimeout(() => {
      setLoading(true);
      fetch(`/api/desk/search-contracts?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((data) => setResults(data.results ?? []))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input
          className="pl-8"
          value={selected ? `${selected.customerName} - ${selected.plate ?? selected.vehicleName ?? ""}` : query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nome, email, targa..."
        />
      </div>
      {loading && <p className="text-xs text-muted-foreground">Ricerca...</p>}
      {results.length > 0 && (
        <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border p-1">
          {results.map((r) => (
            <button
              key={r.bookingId}
              type="button"
              className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
              onClick={() => {
                onSelect(r);
                setResults([]);
                setQuery("");
              }}
            >
              <span className="font-medium">{r.customerName}</span>{" "}
              <span className="text-muted-foreground">
                - {r.vehicleName ?? "Parcheggio"} {r.plate ? `(${r.plate})` : ""} - Contratto {r.contractNumber ?? r.bookingId}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
