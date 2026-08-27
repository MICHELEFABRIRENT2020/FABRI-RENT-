"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertTenant, WRITE_ROLES } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import type { AppUserRole } from "@/types/next-auth";
import type { WorkshopCategory } from "@/generated/prisma/client";

const WORKSHOP_ROLES: AppUserRole[] = ["super_admin", "admin", "responsabile", "officina"];

function assertWorkshop(role: AppUserRole) {
  if (!WORKSHOP_ROLES.includes(role)) throw new Error("Non autorizzato per l'officina.");
}

export async function createWorkshopIntervention(params: {
  vehicleId: string;
  category: WorkshopCategory;
  catalogItemId?: string;
  label: string;
  price?: number;
  parts?: string;
  supplier?: string;
  km?: number;
  notes?: string;
  documentUrl?: string;
  invoiceUrl?: string;
}) {
  const { user, tenantId } = await assertTenant();
  assertWorkshop(user.role);

  const intervention = await prisma.workshopIntervention.create({
    data: {
      tenantId,
      vehicleId: params.vehicleId,
      catalogItemId: params.catalogItemId,
      category: params.category,
      label: params.label,
      price: params.price,
      parts: params.parts,
      supplier: params.supplier,
      km: params.km,
      notes: params.notes,
      documentUrl: params.documentUrl,
      invoiceUrl: params.invoiceUrl,
      operatorId: user.id,
    },
  });

  if (params.km) {
    await prisma.vehicle.update({
      where: { id: params.vehicleId },
      data: { odometerKm: params.km, lastMaintenanceKm: params.km },
    });
  }

  await logAudit({
    tenantId,
    actorId: user.id,
    action: "workshop_intervention_created",
    entityType: "workshop_intervention",
    entityId: intervention.id,
    metadata: { category: params.category, label: params.label },
  });

  revalidatePath("/desk/officina");
}

export async function createWorkshopCatalogItem(category: WorkshopCategory, label: string) {
  const { user, tenantId } = await assertTenant();
  if (!WRITE_ROLES.includes(user.role)) throw new Error("Non autorizzato.");

  const item = await prisma.workshopCatalogItem.create({ data: { tenantId, category, label } });
  await logAudit({ tenantId, actorId: user.id, action: "workshop_catalog_item_created", entityType: "workshop_catalog_item", entityId: item.id });
  revalidatePath("/desk/officina");
}
