import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VehicleCategoryIcon } from "@/components/booking/vehicle-category-icon";
import { defaultPickupValue, defaultReturnValue } from "@/lib/datetime-input";

export type ShowcaseVehicle = {
  id: string;
  name: string;
  category: string;
  dailyRate: number;
  seats: number | null;
  transmission: string | null;
  fuelType: string | null;
  imageUrl: string | null;
  isOrSimilar: boolean;
};

export function FleetShowcase({ vehicles, fleetHref }: { vehicles: ShowcaseVehicle[]; fleetHref: string }) {
  if (vehicles.length === 0) return null;

  const start = defaultPickupValue();
  const end = defaultReturnValue();

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16">
      <div className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">La nostra flotta</h2>
          <p className="text-muted-foreground">Una selezione della flotta Fabri Rent, categoria per categoria.</p>
        </div>
        <Button asChild variant="link" className="h-auto p-0 text-sm font-semibold">
          <Link href={fleetHref}>
            Vedi tutta la flotta <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {vehicles.map((vehicle) => {
          const specs = [
            vehicle.seats ? `${vehicle.seats} posti` : null,
            vehicle.transmission,
            vehicle.fuelType,
          ].filter((s): s is string => !!s);

          const bookHref = `/prenota/rent?${new URLSearchParams({ start, end, category: vehicle.category }).toString()}`;

          return (
            <Card
              key={vehicle.id}
              className="premium-panel flex flex-col gap-0 overflow-hidden rounded-3xl border-white/10 bg-card/60 p-0 backdrop-blur-md"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                {vehicle.imageUrl ? (
                  <Image
                    src={vehicle.imageUrl}
                    alt={vehicle.name}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover"
                  />
                ) : (
                  <VehicleCategoryIcon
                    category={vehicle.category}
                    className="h-full w-full rounded-none"
                    iconClassName="size-12"
                  />
                )}
              </div>
              <CardContent className="flex flex-1 flex-col gap-3 p-6">
                <div className="space-y-1">
                  <p className="text-xs font-bold tracking-wide text-primary uppercase">{vehicle.category}</p>
                  <h3 className="text-lg font-semibold leading-tight">{vehicle.name}</h3>
                  {vehicle.isOrSimilar && <p className="text-xs text-muted-foreground">o simile</p>}
                </div>

                {specs.length > 0 && <p className="text-sm text-muted-foreground">{specs.join(" · ")}</p>}

                <div className="mt-auto flex items-center justify-between gap-3 pt-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Da</p>
                    <p className="text-xl font-bold text-foreground">
                      {vehicle.dailyRate.toFixed(0)}&euro;{" "}
                      <span className="text-xs font-normal text-muted-foreground">/giorno</span>
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href={bookHref}>Prenota</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
