import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { requireTenant } from "@/lib/session";
import { formatItalianDate, computeBillableDays } from "@/lib/rental-time";
import { ContractActionsMenu } from "@/components/desk/contract-actions-menu";

const STATUS_LABEL: Record<string, string> = {
  confirmed: "Confermato",
  checked_in: "In corso",
  completed: "Completato",
  canceled: "Annullato",
};

const SIGNATURE_LABEL: Record<string, string> = {
  none: "Da inviare",
  link_sent: "Link inviato",
  otp_pending: "OTP in corso",
  signed: "Firmato",
};

export default async function ContractsPage() {
  const { tenantId } = await requireTenant();

  const bookings = await prisma.booking.findMany({
    where: { tenantId, serviceType: "rent" },
    include: { user: true, vehicle: true, operator: true, payments: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Contratti</h1>
        <Button asChild size="sm">
          <Link href="/desk/contratti/nuovo">
            <Plus className="mr-1 size-4" /> Nuovo Contratto
          </Link>
        </Button>
      </div>
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table className="text-sm">
            <TableHeader>
              <TableRow>
                <TableHead>N.</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Veicolo</TableHead>
                <TableHead>Targa</TableHead>
                <TableHead>Uscita</TableHead>
                <TableHead>Rientro</TableHead>
                <TableHead>Giorni</TableHead>
                <TableHead>Prezzo</TableHead>
                <TableHead>Cauzione</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Operatore</TableHead>
                <TableHead>Firma</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="whitespace-nowrap font-mono text-xs">{b.contractNumber ?? "-"}</TableCell>
                  <TableCell className="whitespace-nowrap">{b.user.fullName}</TableCell>
                  <TableCell className="whitespace-nowrap">{b.vehicle?.name ?? "-"}</TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-xs">{b.vehicle?.plate ?? "-"}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatItalianDate(b.startDate)}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatItalianDate(b.endDate)}</TableCell>
                  <TableCell>{computeBillableDays(b.startDate, b.endDate)}</TableCell>
                  <TableCell className="whitespace-nowrap">EUR {Number(b.priceOverride ?? b.totalPrice).toFixed(2)}</TableCell>
                  <TableCell className="whitespace-nowrap">EUR {Number(b.depositAmount).toFixed(2)}</TableCell>
                  <TableCell className="whitespace-nowrap">{b.paymentMethod ?? "-"}</TableCell>
                  <TableCell className="whitespace-nowrap">{b.operator?.fullName ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant={b.signatureStatus === "signed" ? "default" : "secondary"}>
                      {SIGNATURE_LABEL[b.signatureStatus]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{STATUS_LABEL[b.status] ?? b.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <ContractActionsMenu
                      booking={{ id: b.id, customerName: b.user.fullName, customerPhone: b.user.phone, status: b.status }}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {bookings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={14} className="text-center text-muted-foreground">
                    Nessun contratto.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
