import { prisma } from "@/lib/prisma";
import { ParkingCapacityForm } from "@/components/admin/parking-capacity-form";
import { requireTenant } from "@/lib/session";

export default async function AdminParkingPage() {
  const { tenantId } = await requireTenant();
  const capacities = await prisma.parkingCapacity.findMany({ where: { tenantId } });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Capienza Parcheggio</h1>
      <ParkingCapacityForm capacities={capacities} />
    </div>
  );
}
