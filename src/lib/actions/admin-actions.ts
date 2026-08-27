"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertRole } from "@/lib/session";
import type { ParkingCategory, ParkingSlotType, PricingRuleType, PricingScope, VehicleStatus } from "@/generated/prisma/client";

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
  await assertRole("super_admin");
  await prisma.pricingRule.create({
    data: {
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
  revalidatePath("/admin/pricing");
}

export async function togglePricingRule(id: string, active: boolean) {
  await assertRole("super_admin");
  await prisma.pricingRule.update({ where: { id }, data: { active } });
  revalidatePath("/admin/pricing");
}

export async function deletePricingRule(id: string) {
  await assertRole("super_admin");
  await prisma.pricingRule.delete({ where: { id } });
  revalidatePath("/admin/pricing");
}

export async function updateParkingBaseRate(category: ParkingCategory, dailyRate: number, copertoUplift: number) {
  await assertRole("super_admin");
  await prisma.parkingBaseRate.upsert({
    where: { category },
    update: { dailyRate, copertoUplift },
    create: { category, dailyRate, copertoUplift },
  });
  revalidatePath("/admin/pricing");
}

// ---------------------------------------------------------------------------
// Parking capacity caps (overbooking prevention)
// ---------------------------------------------------------------------------

export async function updateParkingCapacity(slotType: ParkingSlotType, maxSlots: number) {
  await assertRole("super_admin");
  await prisma.parkingCapacity.upsert({
    where: { slotType },
    update: { maxSlots },
    create: { slotType, maxSlots },
  });
  revalidatePath("/admin/parcheggio");
}

// ---------------------------------------------------------------------------
// Fleet management
// ---------------------------------------------------------------------------

export async function createVehicle(params: {
  name: string;
  category: string;
  dailyRate: number;
  seats?: number;
  transmission?: string;
  fuelType?: string;
  plate?: string;
  imageUrl?: string;
}) {
  await assertRole("super_admin");
  await prisma.vehicle.create({
    data: {
      name: params.name,
      category: params.category,
      dailyRate: params.dailyRate,
      seats: params.seats,
      transmission: params.transmission,
      fuelType: params.fuelType,
      plate: params.plate || undefined,
      imageUrl: params.imageUrl || undefined,
    },
  });
  revalidatePath("/admin/flotta");
}

export async function updateVehicleStatus(id: string, status: VehicleStatus, maintenanceNote?: string) {
  await assertRole("super_admin");
  await prisma.vehicle.update({ where: { id }, data: { status, maintenanceNote } });
  revalidatePath("/admin/flotta");
}

export async function deleteVehicle(id: string) {
  await assertRole("super_admin");
  await prisma.vehicle.delete({ where: { id } });
  revalidatePath("/admin/flotta");
}
