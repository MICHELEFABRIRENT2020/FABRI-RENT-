import Link from "next/link";
import { findAvailableVehiclesInCategory } from "@/lib/fleet-engine";
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
  searchParams: Promise<{ start?: string; end?: string; category?: string; model?: string }>;
}) {
  const { start, end, category, model } = await searchParams;

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
          <Button asChild className="mt-4 h-11">
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
          <Button asChild className="mt-4 h-11">
            <Link href="/flotta">Torna alla flotta</Link>
          </Button>
        </main>
        <SiteFooter />
      </StorefrontShell>
    );
  }

  const tenant = await getPublicTenant();
  // Single source of truth for "what's really available for these dates": the same
  // date-aware check used by createBooking()/assignVehicleForBooking() at submission
  // time, so the preview can never show a vehicle/count the final confirmation would
  // reject. No new availability rules - just reusing the existing one here too.
  const availableVehicles = await findAvailableVehiclesInCategory({
    tenantId: tenant.id,
    category,
    startDate,
    endDate,
  });

  // If the customer picked a specific model on /flotta, prefer that exact model when
  // still available; otherwise fall back to the cheapest of the real candidates -
  // same "o simile" semantics as before, now scoped to real availability.
  const representative =
    (model && availableVehicles.find((v) => v.name === model)) ||
    [...availableVehicles].sort((a, b) => Number(a.dailyRate) - Number(b.dailyRate))[0];

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
          <Button asChild className="mt-4 h-11">
            <Link href="/flotta">Torna alla flotta</Link>
          </Button>
        </main>
        <SiteFooter />
      </StorefrontShell>
    );
  }

  // Derived from the same date-aware candidates above - no separate query, and no
  // risk of claiming more (or fewer) real alternatives than actually exist for these dates.
  const modelCount = new Set(availableVehicles.map((v) => v.name)).size;
  const flottaHref = `/flotta?category=${encodeURIComponent(category)}&start=${encodeURIComponent(
    start
  )}&end=${encodeURIComponent(end)}`;

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
        <div className="mb-2 flex items-center gap-4">
          <VehicleCategoryIcon category={category} className="size-16 shrink-0" iconClassName="size-8" />
          <div>
            <h1 className="text-2xl font-bold">Prenota: {representative.name} o simile</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Categoria <span className="font-medium text-foreground">{category}</span>
              {modelCount > 1 ? (
                <>
                  {" "}
                  &middot;{" "}
                  <Link href={flottaHref} className="text-primary underline underline-offset-2 hover:text-primary/80">
                    vedi tutti i {modelCount} modelli disponibili in questa categoria
                  </Link>
                </>
              ) : (
                <> &middot; unico modello attualmente disponibile in questa categoria</>
              )}
            </p>
          </div>
        </div>
        <p className="mb-6 text-xs text-muted-foreground">
          Il veicolo assegnato verra&apos; confermato in base alla disponibilita&apos; al momento del ritiro, tra i
          modelli di questa categoria.
        </p>
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
