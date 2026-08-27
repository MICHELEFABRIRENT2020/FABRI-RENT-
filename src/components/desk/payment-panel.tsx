"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { recordManualPayment, createSumupPayment, refreshSumupPaymentStatus } from "@/lib/actions/payment-actions";
import type { PaymentMethod, PaymentStatus } from "@/generated/prisma/client";

const METHOD_LABEL: Record<PaymentMethod, string> = {
  contanti: "Contanti",
  pos: "POS",
  stripe: "Stripe",
  sumup: "SumUp",
  bonifico: "Bonifico",
  altro: "Altro",
};

const STATUS_COLOR: Record<PaymentStatus, string> = {
  pending: "border-amber-500/30 bg-amber-500/15 text-amber-500",
  authorized: "border-blue-500/30 bg-blue-500/15 text-blue-400",
  captured: "border-emerald-500/30 bg-emerald-500/15 text-emerald-500",
  failed: "border-red-500/30 bg-red-500/15 text-red-500",
  refunded: "border-slate-500/30 bg-slate-500/15 text-slate-400",
  canceled: "border-slate-500/30 bg-slate-500/15 text-slate-400",
};

type PaymentRow = {
  id: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: string;
  sumupCheckoutId: string | null;
  createdAt: string;
};

export function PaymentPanel({ bookingId, payments, sumupEnabled }: { bookingId: string; payments: PaymentRow[]; sumupEnabled: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("contanti");
  const [hostedCheckoutUrl, setHostedCheckoutUrl] = useState<string | null>(null);

  function handleRecord() {
    const value = Number(amount);
    if (!value || value <= 0) {
      toast.error("Inserisci un importo valido.");
      return;
    }
    startTransition(async () => {
      try {
        if (method === "sumup") {
          const result = await createSumupPayment({ bookingId, type: "extra_charge", amount: value });
          setHostedCheckoutUrl(result.hostedCheckoutUrl);
          toast.success("Checkout SumUp creato. Condividi il link con il cliente.");
        } else {
          await recordManualPayment({ bookingId, type: "extra_charge", method, amount: value });
          toast.success("Pagamento registrato.");
        }
        setAmount("");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Errore.");
      }
    });
  }

  function handleRefresh(paymentId: string) {
    startTransition(async () => {
      try {
        const result = await refreshSumupPaymentStatus(paymentId);
        toast.info(`Stato aggiornato: ${result.status}`);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Errore.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pagamenti</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {payments.length === 0 && <p className="text-sm text-muted-foreground">Nessun pagamento registrato.</p>}
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Badge variant="outline">{METHOD_LABEL[p.method]}</Badge>
                <Badge variant="outline" className={STATUS_COLOR[p.status]}>
                  {p.status}
                </Badge>
                EUR {Number(p.amount).toFixed(2)}
              </span>
              {p.method === "sumup" && p.status === "pending" && (
                <Button size="sm" variant="ghost" disabled={isPending} onClick={() => handleRefresh(p.id)}>
                  <RefreshCw className="size-3.5" /> Verifica stato
                </Button>
              )}
            </div>
          ))}
        </div>

        {hostedCheckoutUrl && (
          <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
            <p className="mb-1 font-medium">Link di pagamento SumUp:</p>
            <a href={hostedCheckoutUrl} target="_blank" rel="noopener noreferrer" className="break-all text-primary underline">
              {hostedCheckoutUrl}
            </a>
          </div>
        )}

        <div className="flex flex-wrap items-end gap-2 border-t border-border pt-4">
          <div className="space-y-2">
            <Label className="text-xs">Metodo</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contanti">Contanti</SelectItem>
                <SelectItem value="pos">POS</SelectItem>
                <SelectItem value="bonifico">Bonifico</SelectItem>
                <SelectItem value="altro">Altro</SelectItem>
                <SelectItem value="sumup" disabled={!sumupEnabled}>
                  SumUp {!sumupEnabled && "(non configurato)"}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Importo (EUR)</Label>
            <Input type="number" className="w-32" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <Button onClick={handleRecord} disabled={isPending}>
            {method === "sumup" ? "Crea checkout SumUp" : "Registra pagamento"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
