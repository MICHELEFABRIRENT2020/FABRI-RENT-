"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export type ExtraServiceDto = {
  id: string;
  code: string;
  label: string;
  price: string;
  perDay: boolean;
};

export type ExtraSelection = { extraServiceId: string; quantity: number };

export function ExtrasSelector({
  extras,
  selected,
  onChange,
}: {
  extras: ExtraServiceDto[];
  selected: ExtraSelection[];
  onChange: (selection: ExtraSelection[]) => void;
}) {
  function toggle(id: string, checked: boolean) {
    if (checked) {
      onChange([...selected, { extraServiceId: id, quantity: 1 }]);
    } else {
      onChange(selected.filter((s) => s.extraServiceId !== id));
    }
  }

  function setQuantity(id: string, quantity: number) {
    onChange(selected.map((s) => (s.extraServiceId === id ? { ...s, quantity } : s)));
  }

  return (
    <div className="space-y-3">
      {extras.map((extra) => {
        const current = selected.find((s) => s.extraServiceId === extra.id);
        return (
          <div key={extra.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
            <div className="flex items-center gap-3">
              <Checkbox
                id={`extra-${extra.id}`}
                checked={Boolean(current)}
                onCheckedChange={(v) => toggle(extra.id, v === true)}
              />
              <Label htmlFor={`extra-${extra.id}`} className="font-normal">
                {extra.label}{" "}
                <span className="text-muted-foreground">
                  (EUR {Number(extra.price).toFixed(2)}
                  {extra.perDay ? "/giorno" : ""})
                </span>
              </Label>
            </div>
            {current && (
              <Input
                type="number"
                min={1}
                max={10}
                value={current.quantity}
                onChange={(e) => setQuantity(extra.id, Math.max(1, Number(e.target.value)))}
                className="w-16"
              />
            )}
          </div>
        );
      })}
      {extras.length === 0 && <p className="text-sm text-muted-foreground">Nessun servizio extra disponibile.</p>}
    </div>
  );
}
