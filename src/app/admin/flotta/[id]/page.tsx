import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/session";
import { VehicleEditForm } from "@/components/admin/vehicle-edit-form";
import { InsurancePolicyPanel } from "@/components/admin/insurance-policy-panel";
import { VehicleExitPanel } from "@/components/admin/vehicle-exit-panel";

export default async function VehicleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { tenantId } = await requireTenant();

  const vehicle = await prisma.vehicle.findFirst({
    where: { id, tenantId },
    include: { insurancePolicies: { orderBy: { periodEnd: "desc" } } },
  });

  if (!vehicle) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {vehicle.brand} {vehicle.model}
        </h1>
        <p className="text-sm text-muted-foreground">{vehicle.name}</p>
      </div>

      <VehicleEditForm
        vehicle={{
          id: vehicle.id,
          name: vehicle.name,
          brand: vehicle.brand ?? "",
          model: vehicle.model ?? "",
          category: vehicle.category,
          dailyRate: vehicle.dailyRate.toString(),
          seats: vehicle.seats?.toString() ?? "",
          transmission: vehicle.transmission ?? "",
          fuelType: vehicle.fuelType ?? "",
          plate: vehicle.plate ?? "",
          chassisNumber: vehicle.chassisNumber ?? "",
          year: vehicle.year?.toString() ?? "",
          odometerKm: vehicle.odometerKm?.toString() ?? "",
          bolloExpiryDate: vehicle.bolloExpiryDate ? vehicle.bolloExpiryDate.toISOString().slice(0, 10) : "",
          revisioneExpiryDate: vehicle.revisioneExpiryDate ? vehicle.revisioneExpiryDate.toISOString().slice(0, 10) : "",
          ownershipType: vehicle.ownershipType,
          purchaseVendor: vehicle.purchaseVendor ?? "",
          purchaseDate: vehicle.purchaseDate ? vehicle.purchaseDate.toISOString().slice(0, 10) : "",
          purchasePrice: vehicle.purchasePrice?.toString() ?? "",
          purchasePaymentMethod: vehicle.purchasePaymentMethod ?? "",
        }}
      />

      <InsurancePolicyPanel
        vehicleId={vehicle.id}
        policies={vehicle.insurancePolicies.map((p) => ({
          id: p.id,
          company: p.company,
          policyNumber: p.policyNumber,
          rcaAmount: p.rcaAmount?.toString() ?? null,
          kaskoAmount: p.kaskoAmount?.toString() ?? null,
          theftFireAmount: p.theftFireAmount?.toString() ?? null,
          damageAmount: p.damageAmount?.toString() ?? null,
          periodStart: p.periodStart.toISOString(),
          periodEnd: p.periodEnd.toISOString(),
          premium: p.premium?.toString() ?? null,
          broker: p.broker,
          roadsideAssistance: p.roadsideAssistance,
          gpsTracking: p.gpsTracking,
        }))}
      />

      <VehicleExitPanel
        vehicleId={vehicle.id}
        exitDate={vehicle.exitDate ? vehicle.exitDate.toISOString() : null}
        exitReason={vehicle.exitReason}
      />
    </div>
  );
}
