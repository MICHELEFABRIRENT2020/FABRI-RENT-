import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getPublicTenant } from "@/lib/tenant";
import { resolvePricingMultiplier } from "@/lib/pricing-engine";
import { findAvailableVehiclesInCategory } from "@/lib/fleet-engine";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { FleetCatalog, type CatalogVehicle } from "@/components/booking/fleet-catalog";

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getPublicTenant();
  return { title: `Flotta - ${tenant.name}` };
}

export default async function FleetPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; start?: string; end?: string }>;
}) {
  const { category: initialCategory, start: initialStart, end: initialEnd } = await searchParams;
  const tenant = await getPublicTenant();

  const vehicles = await prisma.vehicle.findMany({
    where: { tenantId: tenant.id, status: "available" },
    orderBy: [{ category: "asc" }, { dailyRate: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      brand: true,
      model: true,
      isOrSimilar: true,
      category: true,
      dailyRate: true,
      seats: true,
      transmission: true,
      fuelType: true,
    },
  });

  // One card per distinct model ("o simile" already covers the rest of the
  // fleet in that category/model bucket) - a 48-car grid with 20+ identical
  // "Fiat Panda Hybrid" cards would just be noise, not a real catalog.
  const seen = new Set<string>();
  const catalog: CatalogVehicle[] = [];
  for (const v of vehicles) {
    if (seen.has(v.name)) continue;
    seen.add(v.name);
    catalog.push({ ...v, dailyRate: Number(v.dailyRate), availability: null });
  }

  // When real search dates are known, apply the same pricing rules the checkout
  // uses (resolvePricingMultiplier - the same function computeVehiclePrice calls
  // for /prenota/rent) so the catalog price matches what will actually be charged.
  // One lookup per distinct category, not per vehicle, to reuse the existing rule
  // engine without duplicating it or querying per-card.
  const startDate = initialStart ? new Date(initialStart) : null;
  const endDate = initialEnd ? new Date(initialEnd) : null;
  const datesKnown =
    startDate && endDate && !Number.isNaN(startDate.getTime()) && !Number.isNaN(endDate.getTime()) && endDate > startDate;

  if (datesKnown) {
    const categoriesInCatalog = Array.from(new Set(catalog.map((v) => v.category)));
    const pricingByCategory = new Map<string, { multiplier: number; fixedRate: number | null }>();
    // Same date-aware check createBooking()/prenota-rent already use (Step 34) -
    // reused here, not duplicated, so a card's "Disponibile" state means the
    // same thing the booking flow will actually verify, not a static status flag.
    const availableNamesByCategory = new Map<string, Set<string>>();
    for (const category of categoriesInCatalog) {
      const [{ multiplier, fixedRate }, availableVehicles] = await Promise.all([
        resolvePricingMultiplier({ tenantId: tenant.id, scope: "rent", category, startDate, endDate }),
        findAvailableVehiclesInCategory({ tenantId: tenant.id, category, startDate, endDate }),
      ]);
      pricingByCategory.set(category, { multiplier, fixedRate });
      availableNamesByCategory.set(category, new Set(availableVehicles.map((v) => v.name)));
    }
    for (const vehicle of catalog) {
      const pricing = pricingByCategory.get(vehicle.category);
      if (pricing) vehicle.dailyRate = pricing.fixedRate ?? vehicle.dailyRate * pricing.multiplier;
      const availableNames = availableNamesByCategory.get(vehicle.category);
      vehicle.availability = availableNames?.has(vehicle.name) ? "available" : "unavailable";
    }
  }

  const categories = Array.from(new Set(catalog.map((v) => v.category)));

  return (
    <div className="storefront flex flex-1 flex-col bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        <div className="mb-8 space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">La nostra flotta</h1>
          <p className="text-muted-foreground">
            {catalog.length} modelli disponibili presso {tenant.name}. Scegli data, categoria e prenota.
          </p>
        </div>
        <FleetCatalog
          vehicles={catalog}
          categories={categories}
          initialCategory={initialCategory}
          initialStart={initialStart}
          initialEnd={initialEnd}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
