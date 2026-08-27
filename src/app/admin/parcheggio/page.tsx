import { prisma } from "@/lib/prisma";
import { ParkingCapacityForm } from "@/components/admin/parking-capacity-form";

export default async function AdminParkingPage() {
  const capacities = await prisma.parkingCapacity.findMany();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Capienza Parcheggio</h1>
      <ParkingCapacityForm capacities={capacities} />
    </div>
  );
}
