"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { createPricingRule } from "@/lib/actions/admin-actions";
import type { PricingRuleType, PricingScope } from "@/generated/prisma/client";

export function PricingRuleForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [scope, setScope] = useState<PricingScope>("rent");
  const [type, setType] = useState<PricingRuleType>("date_range");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [category, setCategory] = useState("");
  const [multiplier, setMultiplier] = useState("1.30");
  const [priority, setPriority] = useState("0");

  function handleSubmit() {
    if (!name.trim()) {
      toast.error("Assegna un nome alla tariffa.");
      return;
    }
    startTransition(async () => {
      try {
        await createPricingRule({
          name,
          scope,
          type,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          category: category || undefined,
          multiplier: Number(multiplier),
          priority: Number(priority),
        });
        toast.success("Tariffa dinamica creata");
        setName("");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Errore");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Nuova tariffa dinamica</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Nome (es. Alta stagione agosto)</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Categoria (opzionale)</Label>
            <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Tutte" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Ambito</Label>
            <Select value={scope} onValueChange={(v) => setScope(v as PricingScope)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rent">Noleggio</SelectItem>
                <SelectItem value="parking">Parcheggio</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tipo regola</Label>
            <Select value={type} onValueChange={(v) => setType(v as PricingRuleType)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date_range">Intervallo date (alta stagione / ponte)</SelectItem>
                <SelectItem value="holiday">Festivita'</SelectItem>
                <SelectItem value="weekday">Feriali (Lun-Ven)</SelectItem>
                <SelectItem value="weekend">Weekend (Sab-Dom)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="priority">Priorita'</Label>
            <Input id="priority" type="number" value={priority} onChange={(e) => setPriority(e.target.value)} />
          </div>
        </div>

        {(type === "date_range" || type === "holiday") && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startDate">Data inizio</Label>
              <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            {type === "date_range" && (
              <div className="space-y-2">
                <Label htmlFor="endDate">Data fine</Label>
                <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="multiplier">Moltiplicatore tariffa (1.30 = +30%)</Label>
          <Input id="multiplier" type="number" step="0.05" value={multiplier} onChange={(e) => setMultiplier(e.target.value)} />
        </div>

        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Salvataggio..." : "Crea tariffa"}
        </Button>
      </CardContent>
    </Card>
  );
}
