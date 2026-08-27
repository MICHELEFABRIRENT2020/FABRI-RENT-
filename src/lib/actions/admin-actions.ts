"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertTenant, ADMIN_ROLES } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import type { ParkingCategory, ParkingSlotType, PricingRuleType, PricingScope, VehicleStatus } from "@/generated/prisma/client";

async function assertAdmin() {
  const { user, tenantId } = await assertTenant();
  if (!ADMIN_ROLES.includes(user.role)) throw new Error("Non autorizzato per questa operazione.");
  return { user, tenantId };
}

// ---------------------------------------------------------------------------
// Dynamic pricing rules
// ---------------------------------------------------------------------------

export async function createPricingRule(params: {
  name: string;
  scope: PricingScope;
  type: PricingRuleType;
  startDate?: string;
  endDate?: string;
  category?: string;
  multiplier: number;
  fixedRate?: number;
  priority: number;
}) {
  const { user, tenantId } = await assertAdmin();
  const rule = await prisma.pricingRule.create({
    data: {
      tenantId,
      name: params.name,
      scope: params.scope,
      type: params.type,
      startDate: params.startDate ? new Date(params.startDate) : undefined,
      endDate: params.endDate ? new Date(params.endDate) : undefined,
      category: params.category || undefined,
      multiplier: params.multiplier,
      fixedRate: params.fixedRate,
      priority: params.priority,
    },
  });
  await logAudit({ tenantId, actorId: user.id, action: "pricing_rule_created", entityType: "pricing_rule", entityId: rule.id });
  revalidatePath("/admin/pricing");
}

export async function togglePricingRule(id: string, active: boolean) {
  const { user, tenantId } = await assertAdmin();
  await prisma.pricingRule.update({ where: { id, tenantId }, data: { active } });
  await logAudit({ tenantId, actorId: user.id, action: "pricing_rule_toggled", entityType: "pricing_rule", entityId: id, metadata: { active } });
  revalidatePath("/admin/pricing");
}

export async function deletePricingRule(id: string) {
  const { user, tenantId } = await assertAdmin();
  await prisma.pricingRule.delete({ where: { id, tenantId } });
  await logAudit({ tenantId, actorId: user.id, action: "pricing_rule_deleted", entityType: "pricing_rule", entityId: id });
  revalidatePath("/admin/pricing");
}

export async function updateParkingBaseRate(category: ParkingCategory, dailyRate: number, copertoUplift: number) {
  const { user, tenantId } = await assertAdmin();
  await prisma.parkingBaseRate.upsert({
    where: { tenantId_category: { tenantId, category } },
    update: { dailyRate, copertoUplift },
    create: { tenantId, category, dailyRate, copertoUplift },
  });
  await logAudit({ tenantId, actorId: user.id, action: "parking_base_rate_updated", entityType: "parking_base_rate", metadata: { category, dailyRate, copertoUplift } });
  revalidatePath("/admin/pricing");
}

// ---------------------------------------------------------------------------
// Parking capacity caps (overbooking prevention)
// ---------------------------------------------------------------------------

export async function updateParkingCapacity(slotType: ParkingSlotType, maxSlots: number) {
  const { user, tenantId } = await assertAdmin();
  await prisma.parkingCapacity.upsert({
    where: { tenantId_slotType: { tenantId, slotType } },
    update: { maxSlots },
    create: { tenantId, slotType, maxSlots },
  });
  await logAudit({ tenantId, actorId: user.id, action: "parking_capacity_updated", entityType: "parking_capacity", metadata: { slotType, maxSlots } });
  revalidatePath("/admin/parcheggio");
}

// ---------------------------------------------------------------------------
// Fleet management
// ---------------------------------------------------------------------------

export async function createVehicle(params: {
  name: string;
  brand?: string;
  model?: string;
  category: string;
  dailyRate: number;
  seats?: number;
  transmission?: string;
  fuelType?: string;
  plate?: string;
  chassisNumber?: string;
  year?: number;
  odometerKm?: number;
  ownershipType?: "aziendale" | "leasing" | "sub_noleggio" | "comodato_uso" | "altro";
  bolloExpiryDate?: string;
  revisioneExpiryDate?: string;
}) {
  const { user, tenantId } = await assertAdmin();
  const vehicle = await prisma.vehicle.create({
    data: {
      tenantId,
      name: params.name,
      brand: params.brand,
      model: params.model,
      category: params.category,
      dailyRate: params.dailyRate,
      seats: params.seats,
      transmission: params.transmission,
      fuelType: params.fuelType,
      plate: params.plate || undefined,
      chassisNumber: params.chassisNumber || undefined,
      year: params.year,
      odometerKm: params.odometerKm,
      ownershipType: params.ownershipType,
      bolloExpiryDate: params.bolloExpiryDate ? new Date(params.bolloExpiryDate) : undefined,
      revisioneExpiryDate: params.revisioneExpiryDate ? new Date(params.revisioneExpiryDate) : undefined,
    },
  });
  await logAudit({ tenantId, actorId: user.id, action: "vehicle_created", entityType: "vehicle", entityId: vehicle.id });
  revalidatePath("/admin/flotta");
}

export async function updateVehicleStatus(id: string, status: VehicleStatus, maintenanceNote?: string) {
  const { user, tenantId } = await assertAdmin();
  await prisma.vehicle.update({ where: { id, tenantId }, data: { status, maintenanceNote } });
  await logAudit({ tenantId, actorId: user.id, action: "vehicle_status_updated", entityType: "vehicle", entityId: id, metadata: { status } });
  revalidatePath("/admin/flotta");
}

export async function retireVehicle(id: string, exitReason: "venduta" | "rottamata" | "esportata" | "incidente" | "altro") {
  const { user, tenantId } = await assertAdmin();
  await prisma.vehicle.update({
    where: { id, tenantId },
    data: { status: "fuori_flotta", exitDate: new Date(), exitReason },
  });
  await logAudit({ tenantId, actorId: user.id, action: "vehicle_retired", entityType: "vehicle", entityId: id, metadata: { exitReason } });
  revalidatePath("/admin/flotta");
}

export async function deleteVehicle(id: string) {
  const { user, tenantId } = await assertAdmin();
  await prisma.vehicle.delete({ where: { id, tenantId } });
  await logAudit({ tenantId, actorId: user.id, action: "vehicle_deleted", entityType: "vehicle", entityId: id });
  revalidatePath("/admin/flotta");
}
