"use server";

import { revalidatePath } from "next/cache";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { assertTenant, ADMIN_ROLES } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import type { AppUserRole } from "@/types/next-auth";
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

// ---------------------------------------------------------------------------
// Staff / utenti (section 28: RBAC, più operatori)
// ---------------------------------------------------------------------------

const STAFF_ASSIGNABLE_ROLES: AppUserRole[] = [
  "admin",
  "responsabile",
  "operator",
  "officina",
  "contabilita",
  "visualizzatore",
];

export async function createStaffUser(params: {
  fullName: string;
  email: string;
  phone: string;
  role: AppUserRole;
}) {
  const { user, tenantId } = await assertAdmin();
  if (!STAFF_ASSIGNABLE_ROLES.includes(params.role)) throw new Error("Ruolo non valido.");

  const temporaryPassword = crypto.randomBytes(9).toString("base64url");
  const passwordHash = await bcrypt.hash(temporaryPassword, 10);

  const staff = await prisma.user.create({
    data: {
      tenantId,
      fullName: params.fullName,
      email: params.email,
      phone: params.phone,
      role: params.role,
      passwordHash,
    },
  });

  await logAudit({ tenantId, actorId: user.id, action: "staff_user_created", entityType: "user", entityId: staff.id, metadata: { role: params.role } });
  revalidatePath("/admin/utenti");
  return { temporaryPassword };
}

export async function updateStaffUserRole(id: string, role: AppUserRole) {
  const { user, tenantId } = await assertAdmin();
  if (!STAFF_ASSIGNABLE_ROLES.includes(role)) throw new Error("Ruolo non valido.");

  await prisma.user.update({ where: { id, tenantId }, data: { role } });
  await logAudit({ tenantId, actorId: user.id, action: "staff_user_role_updated", entityType: "user", entityId: id, metadata: { role } });
  revalidatePath("/admin/utenti");
}

export async function resetStaffPassword(id: string) {
  const { user, tenantId } = await assertAdmin();
  const temporaryPassword = crypto.randomBytes(9).toString("base64url");
  const passwordHash = await bcrypt.hash(temporaryPassword, 10);

  await prisma.user.update({ where: { id, tenantId }, data: { passwordHash } });
  await logAudit({ tenantId, actorId: user.id, action: "staff_password_reset", entityType: "user", entityId: id });
  revalidatePath("/admin/utenti");
  return { temporaryPassword };
}

// ---------------------------------------------------------------------------
// Impostazioni contratto (franchigie configurabili, section 5)
// ---------------------------------------------------------------------------

export async function updateContractSettings(params: {
  franchigiaRcaAmount: number;
  franchigiaRcaPercent: number;
  franchigiaKaskoAmount: number;
  franchigiaKaskoPercent: number;
  franchigiaFurtoAmount: number;
  franchigiaFurtoPercent: number;
  franchigiaIncendioAmount: number;
  franchigiaIncendioPercent: number;
  franchigiaDanniAmount: number;
  franchigiaDanniPercent: number;
  maintenanceIntervalKm: number;
}) {
  const { user, tenantId } = await assertAdmin();
  await prisma.tenant.update({ where: { id: tenantId }, data: params });
  await logAudit({ tenantId, actorId: user.id, action: "contract_settings_updated", entityType: "tenant", entityId: tenantId });
  revalidatePath("/admin/impostazioni");
}

export async function updateTenantProfile(params: { name: string; vatNumber?: string; pec?: string; sdiCode?: string; address?: string }) {
  const { user, tenantId } = await assertAdmin();
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      name: params.name,
      vatNumber: params.vatNumber || null,
      pec: params.pec || null,
      sdiCode: params.sdiCode || null,
      address: params.address || null,
    },
  });
  await logAudit({ tenantId, actorId: user.id, action: "tenant_profile_updated", entityType: "tenant", entityId: tenantId });
  revalidatePath("/admin/impostazioni");
}
