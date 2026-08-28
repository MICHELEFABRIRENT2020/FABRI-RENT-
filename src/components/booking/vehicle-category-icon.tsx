import { Car, Truck, Bike, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// No real vehicle photos yet (see TESTING.md/decision log) - a clean icon
// placeholder per category avoids both broken <img> tags and the copyright
// risk of sourcing manufacturer/stock photos without a license. Swap for
// real fleet photos (Vehicle.imageUrl) once available.
const CATEGORY_ICON: Record<string, LucideIcon> = {
  Scooter: Bike,
  Furgone: Truck,
};

export function VehicleCategoryIcon({
  category,
  className,
  iconClassName,
}: {
  category: string;
  className?: string;
  iconClassName?: string;
}) {
  const Icon = CATEGORY_ICON[category] ?? Car;
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-xl bg-muted",
        className
      )}
    >
      <Icon className={cn("text-primary", iconClassName)} strokeWidth={1.5} />
    </div>
  );
}
