import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { StorefrontShell } from "@/components/site/storefront-shell";
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
    <StorefrontShell>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-16">
        <Card className="surface-panel shadow-[var(--elevation-floating)]">
          <CardHeader className="items-center text-center">
            <CheckCircle2 className="mb-2 size-12 text-primary motion-safe:animate-in motion-safe:zoom-in motion-safe:fade-in motion-safe:duration-[var(--motion-slow)] motion-safe:ease-[var(--motion-ease-spring)]" />
            <CardTitle className="text-4xl leading-tight font-bold tracking-tight">Prenotazione confermata</CardTitle>
            <p className="text-xs font-medium text-muted-foreground">Riferimento: {booking.id}</p>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between text-xs font-medium text-muted-foreground">
              <span>Servizio</span>
              <span className="text-foreground">{booking.serviceType === "rent" ? "Noleggio Auto" : "Parcheggio (Parking Go)"}</span>
            </div>
            {booking.vehicle && (
              <div className="flex justify-between text-xs font-medium text-muted-foreground">
                <span>Veicolo</span>
                <span className="text-foreground">{booking.vehicle.name} o simile</span>
              </div>
            )}
            <div className="flex justify-between text-xs font-medium text-muted-foreground">
              <span>Ritiro / Ingresso</span>
              <span className="text-foreground">{formatItalianDate(booking.startDate)}</span>
            </div>
            <div className="flex justify-between text-xs font-medium text-muted-foreground">
              <span>Riconsegna / Uscita</span>
              <span className="text-foreground">{formatItalianDate(booking.endDate)}</span>
            </div>
            <div className="flex justify-between text-xs font-medium text-muted-foreground">
              <span>Sede</span>
              <span className="text-foreground">{booking.location}</span>
            </div>
            <Separator />
            {booking.insuranceOption && (
              <div className="flex justify-between text-xs font-medium text-muted-foreground">
                <span>Assicurazione</span>
                <span className="text-foreground">{booking.insuranceOption.label}</span>
              </div>
            )}
            {booking.extras.length > 0 && (
              <div className="text-xs font-medium text-muted-foreground">
                <p>Servizi extra</p>
                <ul className="ml-4 list-disc text-foreground">
                  {booking.extras.map((e) => (
                    <li key={e.id}>
                      {e.extraService.label} x{e.quantity}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Totale</span>
              <span className="text-xl font-black tabular-nums text-primary">EUR {Number(booking.totalPrice).toFixed(2)}</span>
            </div>
            {booking.hasDeposit && (
              <div className="flex justify-between text-xs font-medium text-muted-foreground">
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
    </StorefrontShell>
  );
}
