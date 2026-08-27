import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VehicleForm } from "@/components/admin/vehicle-form";
import { VehicleTable } from "@/components/admin/vehicle-table";
import { requireTenant } from "@/lib/session";

export default async function AdminFleetPage() {
  const { tenantId } = await requireTenant();
  const vehicles = await prisma.vehicle.findMany({
    where: { tenantId },
    include: {
      insurancePolicies: { orderBy: { periodEnd: "desc" }, take: 1 },
      bookings: {
        where: { status: { in: ["confirmed", "checked_in"] } },
        orderBy: { startDate: "desc" },
        take: 1,
        include: { user: true },
      },
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  const dto = vehicles.map((v) => ({
    id: v.id,
    name: v.name,
    brand: v.brand,
    model: v.model,
    category: v.category,
    fuelType: v.fuelType,
    year: v.year,
    plate: v.plate,
    chassisNumber: v.chassisNumber,
    odometerKm: v.odometerKm,
    assignedCustomer: v.bookings[0]?.user.fullName ?? null,
    status: v.status,
    insuranceExpiryDate: v.insurancePolicies[0]?.periodEnd.toISOString() ?? null,
    bolloExpiryDate: v.bolloExpiryDate?.toISOString() ?? null,
    revisioneExpiryDate: v.revisioneExpiryDate?.toISOString() ?? null,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Gestione Flotta</h1>
      <VehicleForm />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Veicoli ({vehicles.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <VehicleTable vehicles={dto} />
        </CardContent>
      </Card>
    </div>
  );
}
