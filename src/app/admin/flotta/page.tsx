import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VehicleForm } from "@/components/admin/vehicle-form";
import { VehicleTable } from "@/components/admin/vehicle-table";
import { requireTenant } from "@/lib/session";

export default async function AdminFleetPage() {
  const { tenantId } = await requireTenant();
  const vehicles = await prisma.vehicle.findMany({ where: { tenantId }, orderBy: [{ category: "asc" }, { name: "asc" }] });
  const dto = vehicles.map((v) => ({
    id: v.id,
    name: v.name,
    category: v.category,
    dailyRate: v.dailyRate.toString(),
    status: v.status,
    plate: v.plate,
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
