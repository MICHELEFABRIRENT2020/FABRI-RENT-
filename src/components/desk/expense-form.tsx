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
import { createExpense } from "@/lib/actions/cash-actions";
import { toDatetimeLocalValue } from "@/lib/datetime-input";
import type { ExpenseCategory } from "@/generated/prisma/client";

const CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  carburante: "Carburante",
  operaio: "Operaio",
  ricambi: "Ricambi",
  buoni_pasto: "Buoni pasto",
  fornitori: "Fornitori",
  altro: "Altro",
};

export function ExpenseForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [category, setCategory] = useState<ExpenseCategory>("carburante");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(toDatetimeLocalValue(new Date()).slice(0, 10));

  function handleSubmit() {
    if (!amount) {
      toast.error("Indica un importo.");
      return;
    }
    startTransition(async () => {
      try {
        await createExpense({ category, amount: Number(amount), description: description || undefined, date });
        toast.success("Spesa registrata");
        setAmount("");
        setDescription("");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Errore");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Nuova spesa</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-3">
        <div className="space-y-2">
          <Label className="text-xs">Categoria</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as ExpenseCategory)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Importo (EUR)</Label>
          <Input type="number" className="w-32" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Data</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="min-w-48 flex-1 space-y-2">
          <Label className="text-xs">Descrizione</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <Button onClick={handleSubmit} disabled={isPending}>
          Aggiungi spesa
        </Button>
      </CardContent>
    </Card>
  );
}
