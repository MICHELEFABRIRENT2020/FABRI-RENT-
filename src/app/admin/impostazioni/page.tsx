import { prisma } from "@/lib/prisma";
import { ContractSettingsForm } from "@/components/admin/contract-settings-form";
import { TenantProfileForm } from "@/components/admin/tenant-profile-form";
import { requireTenant } from "@/lib/session";

export default async function AdminSettingsPage() {
  const { tenantId } = await requireTenant();
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Impostazioni</h1>
      <TenantProfileForm
        profile={{
          name: tenant.name,
          vatNumber: tenant.vatNumber ?? "",
          pec: tenant.pec ?? "",
          sdiCode: tenant.sdiCode ?? "",
          address: tenant.address ?? "",
        }}
      />
      <ContractSettingsForm
        settings={{
          franchigiaRcaAmount: tenant.franchigiaRcaAmount.toString(),
          franchigiaRcaPercent: tenant.franchigiaRcaPercent.toString(),
          franchigiaKaskoAmount: tenant.franchigiaKaskoAmount.toString(),
          franchigiaKaskoPercent: tenant.franchigiaKaskoPercent.toString(),
          franchigiaFurtoAmount: tenant.franchigiaFurtoAmount.toString(),
          franchigiaFurtoPercent: tenant.franchigiaFurtoPercent.toString(),
          franchigiaIncendioAmount: tenant.franchigiaIncendioAmount.toString(),
          franchigiaIncendioPercent: tenant.franchigiaIncendioPercent.toString(),
          franchigiaDanniAmount: tenant.franchigiaDanniAmount.toString(),
          franchigiaDanniPercent: tenant.franchigiaDanniPercent.toString(),
          maintenanceIntervalKm: tenant.maintenanceIntervalKm,
        }}
      />
    </div>
  );
}
