import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2 } from "lucide-react";
import { formatItalianDate } from "@/lib/rental-time";

export default async function BookingConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { vehicle: true, user: true, insuranceOption: true, extras: { include: { extraService: true } } },
  });

  if (!booking) notFound();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-16">
        <Card>
          <CardHeader className="items-center text-center">
            <CheckCircle2 className="mb-2 size-12 text-primary" />
            <CardTitle className="text-2xl">Prenotazione confermata</CardTitle>
            <p className="text-sm text-muted-foreground">Riferimento: {booking.id}</p>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Servizio</span>
              <span>{booking.serviceType === "rent" ? "Noleggio Auto" : "Parcheggio (Parking Go)"}</span>
            </div>
            {booking.vehicle && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Veicolo</span>
                <span>{booking.vehicle.name} o simile</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ritiro / Ingresso</span>
              <span>{formatItalianDate(booking.startDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Riconsegna / Uscita</span>
              <span>{formatItalianDate(booking.endDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sede</span>
              <span>{booking.location}</span>
            </div>
            <Separator />
            {booking.insuranceOption && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Assicurazione</span>
                <span>{booking.insuranceOption.label}</span>
              </div>
            )}
            {booking.extras.length > 0 && (
              <div>
                <p className="text-muted-foreground">Servizi extra</p>
                <ul className="ml-4 list-disc">
                  {booking.extras.map((e) => (
                    <li key={e.id}>
                      {e.extraService.label} x{e.quantity}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Totale</span>
              <span>EUR {Number(booking.totalPrice).toFixed(2)}</span>
            </div>
            {booking.hasDeposit && (
              <div className="flex justify-between text-muted-foreground">
                <span>Cauzione trattenuta (pre-autorizzata)</span>
                <span>EUR {Number(booking.depositAmount).toFixed(2)}</span>
              </div>
            )}
            <p className="pt-4 text-xs text-muted-foreground">
              Riceverai una email di conferma a {booking.user.email}. Ti aspettiamo in Via Privata Detta Sacra 33.
            </p>
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </>
  );
}
