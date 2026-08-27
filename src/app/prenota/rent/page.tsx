import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { computeVehiclePrice } from "@/lib/pricing-engine";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { RentCheckoutWizard } from "@/components/booking/rent-checkout-wizard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default async function RentBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string; category?: string }>;
}) {
  const { start, end, category } = await searchParams;

  if (!start || !end || !category) {
    notFound();
  }

  const startDate = new Date(start);
  const endDate = new Date(end);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16">
          <Alert variant="destructive">
            <AlertTitle>Date non valide</AlertTitle>
            <AlertDescription>Torna alla home e seleziona nuovamente ritiro e riconsegna.</AlertDescription>
          </Alert>
        </main>
        <SiteFooter />
      </>
    );
  }

  const representative = await prisma.vehicle.findFirst({
    where: { category, status: "available" },
    orderBy: { dailyRate: "asc" },
  });

  if (!representative) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16">
          <Alert>
            <AlertTitle>Categoria non disponibile</AlertTitle>
            <AlertDescription>
              Al momento non ci sono veicoli disponibili nella categoria selezionata. Prova con un&apos;altra
              categoria o altre date.
            </AlertDescription>
          </Alert>
        </main>
        <SiteFooter />
      </>
    );
  }

  const { days, total } = await computeVehiclePrice({
    vehicleId: representative.id,
    startDate,
    endDate,
  });

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        <h1 className="mb-6 text-2xl font-bold">Prenota: {representative.name} o simile</h1>
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
    </>
  );
}
