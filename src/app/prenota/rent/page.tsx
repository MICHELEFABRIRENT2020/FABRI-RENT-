import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { computeVehiclePrice } from "@/lib/pricing-engine";
import { getPublicTenant } from "@/lib/tenant";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { StorefrontShell } from "@/components/site/storefront-shell";
import { RentCheckoutWizard } from "@/components/booking/rent-checkout-wizard";
import { VehicleCategoryIcon } from "@/components/booking/vehicle-category-icon";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default async function RentBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string; category?: string }>;
}) {
  const { start, end, category } = await searchParams;

  if (!start || !end || !category) {
    return (
      <StorefrontShell>
        <SiteHeader />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16">
          <Alert>
            <AlertTitle>Ricerca incompleta</AlertTitle>
            <AlertDescription>
              Mancano data di ritiro, data di riconsegna o categoria veicolo per procedere con la prenotazione.
            </AlertDescription>
          </Alert>
          <Button asChild className="mt-4">
            <Link href="/flotta">Torna alla flotta</Link>
          </Button>
        </main>
        <SiteFooter />
      </StorefrontShell>
    );
  }

  const startDate = new Date(start);
  const endDate = new Date(end);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
    return (
      <StorefrontShell>
        <SiteHeader />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16">
          <Alert variant="destructive">
            <AlertTitle>Date non valide</AlertTitle>
            <AlertDescription>
              Le date di ritiro e riconsegna selezionate non sono corrette. Scegli nuovamente il tuo veicolo dalla
              flotta.
            </AlertDescription>
          </Alert>
          <Button asChild className="mt-4">
            <Link href="/flotta">Torna alla flotta</Link>
          </Button>
        </main>
        <SiteFooter />
      </StorefrontShell>
    );
  }

  const tenant = await getPublicTenant();
  const representative = await prisma.vehicle.findFirst({
    where: { tenantId: tenant.id, category, status: "available" },
    orderBy: { dailyRate: "asc" },
  });

  if (!representative) {
    return (
      <StorefrontShell>
        <SiteHeader />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16">
          <Alert>
            <AlertTitle>Categoria non disponibile</AlertTitle>
            <AlertDescription>
              Al momento non ci sono veicoli disponibili nella categoria selezionata. Prova con un&apos;altra
              categoria dalla flotta.
            </AlertDescription>
          </Alert>
          <Button asChild className="mt-4">
            <Link href="/flotta">Torna alla flotta</Link>
          </Button>
        </main>
        <SiteFooter />
      </StorefrontShell>
    );
  }

  const { days, total } = await computeVehiclePrice({
    tenantId: tenant.id,
    vehicleId: representative.id,
    startDate,
    endDate,
  });

  return (
    <StorefrontShell>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        <div className="mb-6 flex items-center gap-4">
          <VehicleCategoryIcon category={category} className="size-16 shrink-0" iconClassName="size-8" />
          <h1 className="text-2xl font-bold">Prenota: {representative.name} o simile</h1>
        </div>
        <RentCheckoutWizard
          vehicleCategory={category}
          vehicleName={representative.name}
          startDate={startDate.toISOString()}
          endDate={endDate.toISOString()}
          days={days}
          basePrice={total}
        />
      </main>
      <SiteFooter />
    </StorefrontShell>
  );
}
