import { notFound } from "next/navigation";
import { checkParkingAvailability } from "@/lib/parking-engine";
import { computeParkingPrice } from "@/lib/pricing-engine";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { ParkingCheckoutWizard } from "@/components/booking/parking-checkout-wizard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { ParkingCategory, ParkingSlotType } from "@/generated/prisma/client";

export default async function ParkingBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string; category?: string; slotType?: string; keysLeft?: string }>;
}) {
  const { start, end, category, slotType, keysLeft } = await searchParams;

  if (!start || !end || !category || !slotType) {
    notFound();
  }
  if (!["moto", "auto", "furgone"].includes(category) || !["coperto", "scoperto"].includes(slotType)) {
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
            <AlertDescription>Torna alla home e seleziona nuovamente ingresso e uscita.</AlertDescription>
          </Alert>
        </main>
        <SiteFooter />
      </>
    );
  }

  const parkingCategory = category as ParkingCategory;
  const parkingSlotType = slotType as ParkingSlotType;

  const [availability, price] = await Promise.all([
    checkParkingAvailability({ slotType: parkingSlotType, startDate, endDate }),
    computeParkingPrice({ category: parkingCategory, slotType: parkingSlotType, startDate, endDate }),
  ]);

  if (!availability.available) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16">
          <Alert variant="destructive">
            <AlertTitle>Capienza esaurita</AlertTitle>
            <AlertDescription>
              I posti {parkingSlotType} sono al completo per le date selezionate ({availability.occupied}/
              {availability.capacity}). Prova con altre date o un altro tipo di posto.
            </AlertDescription>
          </Alert>
        </main>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        <h1 className="mb-6 text-2xl font-bold">Prenota il tuo posto - Parking Go</h1>
        <ParkingCheckoutWizard
          category={parkingCategory}
          slotType={parkingSlotType}
          keysLeft={keysLeft === "true"}
          startDate={startDate.toISOString()}
          endDate={endDate.toISOString()}
          days={price.days}
          basePrice={price.total}
        />
      </main>
      <SiteFooter />
    </>
  );
}
