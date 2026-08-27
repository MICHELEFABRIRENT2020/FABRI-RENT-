"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { togglePricingRule, deletePricingRule } from "@/lib/actions/admin-actions";

export type PricingRuleDto = {
  id: string;
  name: string;
  scope: string;
  type: string;
  category: string | null;
  multiplier: string;
  active: boolean;
  priority: number;
};

export function PricingRuleTable({ rules }: { rules: PricingRuleDto[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Ambito</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Categoria</TableHead>
          <TableHead>Moltiplicatore</TableHead>
          <TableHead>Priorita'</TableHead>
          <TableHead>Attiva</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rules.map((rule) => (
          <TableRow key={rule.id}>
            <TableCell>{rule.name}</TableCell>
            <TableCell>
              <Badge variant="outline">{rule.scope}</Badge>
            </TableCell>
            <TableCell>{rule.type}</TableCell>
            <TableCell>{rule.category ?? "Tutte"}</TableCell>
            <TableCell>x{Number(rule.multiplier).toFixed(2)}</TableCell>
            <TableCell>{rule.priority}</TableCell>
            <TableCell>
              <Switch
                checked={rule.active}
                disabled={isPending}
                onCheckedChange={(checked) =>
                  startTransition(async () => {
                    await togglePricingRule(rule.id, checked);
                    router.refresh();
                  })
                }
              />
            </TableCell>
            <TableCell>
              <Button
                size="sm"
                variant="ghost"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    await deletePricingRule(rule.id);
                    toast.success("Tariffa eliminata");
                    router.refresh();
                  })
                }
              >
                Elimina
              </Button>
            </TableCell>
          </TableRow>
        ))}
        {rules.length === 0 && (
          <TableRow>
            <TableCell colSpan={8} className="text-center text-muted-foreground">
              Nessuna tariffa dinamica configurata.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
