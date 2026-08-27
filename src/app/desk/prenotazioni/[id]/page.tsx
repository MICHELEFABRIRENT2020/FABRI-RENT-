import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { formatItalianDate } from "@/lib/rental-time";
import { DocumentAuditPanel } from "@/components/desk/document-audit-panel";
import { CheckInPanel } from "@/components/desk/checkin-panel";
import { CheckOutPanel } from "@/components/desk/checkout-panel";
import { PriceOverridePanel } from "@/components/desk/price-override-panel";
import { requireTenant } from "@/lib/session";

export default async function DeskBookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { tenantId } = await requireTenant();

  const booking = await prisma.booking.findFirst({
    where: { id, tenantId },
    include: {
      user: true,
      vehicle: true,
      insuranceOption: true,
      extras: { include: { extraService: true } },
      damageReports: true,
      damageTickets: true,
      payments: true,
    },
  });

  if (!booking) notFound();

  const documents = await prisma.documentAudit.findMany({
    where: { tenantId, userId: booking.userId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{booking.user.fullName}</h1>
          <p className="text-sm text-muted-foreground">Prenotazione {booking.id}</p>
        </div>
        <Badge>{booking.status}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dettagli prenotazione</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <p>
            <span className="text-muted-foreground">Servizio: </span>
            {booking.serviceType === "rent" ? `${booking.vehicle?.name} o simile` : "Parcheggio Parking Go"}
          </p>
          <p>
            <span className="text-muted-foreground">Sede: </span>
            {booking.location}
          </p>
          <p>
            <span className="text-muted-foreground">Ritiro/Ingresso: </span>
            {formatItalianDate(booking.startDate)}
          </p>
          <p>
            <span className="text-muted-foreground">Riconsegna/Uscita prevista: </span>
            {formatItalianDate(booking.endDate)}
          </p>
          <p>
            <span className="text-muted-foreground">Telefono cliente: </span>
            {booking.user.phone}
          </p>
          <p>
            <span className="text-muted-foreground">Totale: </span>
            EUR {Number(booking.priceOverride ?? booking.totalPrice).toFixed(2)}
            {booking.priceOverride && <span className="text-muted-foreground"> (modificato)</span>}
          </p>
          {booking.insuranceOption && (
            <p>
              <span className="text-muted-foreground">Assicurazione: </span>
              {booking.insuranceOption.label}
            </p>
          )}
          {booking.hasDeposit && (
            <p>
              <span className="text-muted-foreground">Cauzione: </span>
              EUR {Number(booking.depositAmount).toFixed(2)}
            </p>
          )}
        </CardContent>
      </Card>

      <DocumentAuditPanel documents={documents} />

      {!booking.checkInAt && <CheckInPanel bookingId={booking.id} customerPhone={booking.user.phone} />}

      {booking.checkInAt && !booking.actualReturnAt && (
        <CheckOutPanel bookingId={booking.id} scheduledEndDate={booking.endDate.toISOString()} />
      )}

      {(booking.damageReports.length > 0 || booking.damageTickets.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Danni</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {booking.damageReports.map((r) => (
              <div key={r.id}>
                <p className="font-medium">Report check-in ({formatItalianDate(r.createdAt)})</p>
                <p className="text-muted-foreground">{r.notes ?? "Nessuna nota"} - {r.photoUrls.length} foto</p>
              </div>
            ))}
            <Separator />
            {booking.damageTickets.map((t) => (
              <div key={t.id}>
                <p className="font-medium">Ticket Danno ({formatItalianDate(t.createdAt)})</p>
                <p className="text-muted-foreground">{t.description}</p>
                <p>Cauzione trattenuta: EUR {Number(t.depositWithheldAmount).toFixed(2)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <PriceOverridePanel
        bookingId={booking.id}
        currentTotal={Number(booking.totalPrice)}
        existingOverride={
          booking.priceOverride
            ? { newTotal: Number(booking.priceOverride), reason: booking.priceOverrideReason ?? "" }
            : null
        }
      />
    </div>
  );
}
