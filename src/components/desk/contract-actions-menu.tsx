"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { MoreHorizontal } from "lucide-react";
import {
  closeContract,
  deleteContract,
  replaceContractVehicle,
  generateSignatureLink,
  sendSignatureEmail,
  createProforma,
  sendInvoice,
} from "@/lib/actions/contract-actions";

export type ContractRowDto = {
  id: string;
  customerName: string;
  customerPhone: string;
  status: string;
};

export function ContractActionsMenu({ booking }: { booking: ContractRowDto }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function run(fn: () => Promise<void>) {
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Errore");
      }
    });
  }

  async function ensureSignatureLink(): Promise<string> {
    const { token } = await generateSignatureLink(booking.id);
    return `${window.location.origin}/firma/${token}`;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" disabled={isPending}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Documenti</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => window.open(`/api/contracts/${booking.id}/pdf`, "_blank")}>
          Stampa contratto / PDF
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() =>
            run(async () => {
              const { pdfUrl } = await createProforma(booking.id);
              window.open(pdfUrl, "_blank");
            })
          }
        >
          Proforma / Pre-fattura
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() =>
            run(async () => {
              const res = await sendInvoice(booking.id);
              if (res.status === "sent") toast.success("Fattura inviata allo SDI");
              else toast.warning(res.errorMessage ?? "Fattura generata ma non trasmessa");
              window.open(res.pdfUrl, "_blank");
            })
          }
        >
          Invia Fattura (SDI)
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => toast.info("Integrazione C.A.R.G.O.S. non configurata per questo tenant.")}>
          C.A.R.G.O.S.
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Comunicazioni</DropdownMenuLabel>
        <DropdownMenuItem
          onSelect={() =>
            run(async () => {
              const link = await ensureSignatureLink();
              await sendSignatureEmail(booking.id, link);
              toast.success("Email inviata");
            })
          }
        >
          Invia Email
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() =>
            run(async () => {
              const link = await ensureSignatureLink();
              const text = encodeURIComponent(`Firma il tuo contratto di noleggio: ${link}`);
              window.open(`https://wa.me/${booking.customerPhone.replace(/\D/g, "")}?text=${text}`, "_blank");
            })
          }
        >
          Invia WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() =>
            run(async () => {
              const link = await ensureSignatureLink();
              const text = encodeURIComponent(`Firma il tuo contratto di noleggio: ${link}`);
              window.open(`sms:${booking.customerPhone}?body=${text}`, "_blank");
            })
          }
        >
          Invia SMS
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() =>
            run(async () => {
              const link = await ensureSignatureLink();
              window.open(link, "_blank");
            })
          }
        >
          Firma OTP (apri link)
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Gestione</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => router.push(`/desk/prolungamenti?bookingId=${booking.id}`)}>
          Prolunga
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push(`/desk/prenotazioni/${booking.id}`)}>Modifica</DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() =>
            run(async () => {
              const res = await replaceContractVehicle(booking.id);
              toast.success(`Veicolo sostituito con ${res.newVehicleName}`);
            })
          }
        >
          Sostituisci veicolo
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => run(() => closeContract(booking.id))}>Chiudi</DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => {
            if (confirm("Eliminare definitivamente questo contratto?")) run(() => deleteContract(booking.id));
          }}
        >
          Elimina
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
