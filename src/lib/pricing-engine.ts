import { prisma } from "@/lib/prisma";
import { computeBillableDays } from "@/lib/rental-time";
import type { ParkingCategory, ParkingSlotType, PricingScope } from "@/generated/prisma/client";

/**
 * Resolves the best-matching dynamic pricing rule (super admin governance:
 * alta/bassa stagione, festivita', ponti, feriali vs weekend) for a given
 * scope, date range and optional category. Highest `priority` wins; when
 * several rules tie, the most recently created one wins.
 */
export async function resolvePricingMultiplier(params: {
  scope: PricingScope;
  category?: string | null;
  startDate: Date;
  endDate: Date;
}): Promise<{ multiplier: number; fixedRate: number | null; ruleName: string | null }> {
  const rules = await prisma.pricingRule.findMany({
    where: { scope: params.scope, active: true },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });

  for (const rule of rules) {
    if (rule.category && params.category && rule.category !== params.category) continue;

    if (rule.type === "date_range" || rule.type === "holiday") {
      if (!rule.startDate) continue;
      const ruleEnd = rule.endDate ?? rule.startDate;
      const overlaps = params.startDate <= ruleEnd && params.endDate >= rule.startDate;
      if (!overlaps) continue;
    }

    if (rule.type === "weekday") {
      const day = params.startDate.getDay();
      if (day === 0 || day === 6) continue; // not a weekday
    }

    if (rule.type === "weekend") {
      const day = params.startDate.getDay();
      if (day !== 0 && day !== 6) continue; // not a weekend
    }

    return {
      multiplier: Number(rule.multiplier),
      fixedRate: rule.fixedRate ? Number(rule.fixedRate) : null,
      ruleName: rule.name,
    };
  }

  return { multiplier: 1, fixedRate: null, ruleName: null };
}

export async function computeVehiclePrice(params: {
  vehicleId: string;
  startDate: Date;
  endDate: Date;
}): Promise<{ days: number; dailyRate: number; total: number; ruleName: string | null }> {
  const vehicle = await prisma.vehicle.findUniqueOrThrow({ where: { id: params.vehicleId } });
  const days = computeBillableDays(params.startDate, params.endDate);

  const { multiplier, fixedRate, ruleName } = await resolvePricingMultiplier({
    scope: "rent",
    category: vehicle.category,
    startDate: params.startDate,
    endDate: params.endDate,
  });

  const dailyRate = fixedRate ?? Number(vehicle.dailyRate) * multiplier;
  return { days, dailyRate, total: Number((dailyRate * days).toFixed(2)), ruleName };
}

export async function computeParkingPrice(params: {
  category: ParkingCategory;
  slotType: ParkingSlotType;
  startDate: Date;
  endDate: Date;
}): Promise<{ days: number; dailyRate: number; total: number; ruleName: string | null }> {
  const baseRate = await prisma.parkingBaseRate.findUniqueOrThrow({
    where: { category: params.category },
  });
  const days = computeBillableDays(params.startDate, params.endDate);

  const { multiplier, fixedRate, ruleName } = await resolvePricingMultiplier({
    scope: "parking",
    category: params.category,
    startDate: params.startDate,
    endDate: params.endDate,
  });

  let dailyRate = fixedRate ?? Number(baseRate.dailyRate) * multiplier;
  if (params.slotType === "coperto") {
    dailyRate = dailyRate * (1 + Number(baseRate.copertoUplift));
  }

  return { days, dailyRate: Number(dailyRate.toFixed(2)), total: Number((dailyRate * days).toFixed(2)), ruleName };
}

export async function computeInsurancePrice(insuranceOptionId: string, days: number) {
  const option = await prisma.insuranceOption.findUniqueOrThrow({ where: { id: insuranceOptionId } });
  return Number((Number(option.dailyCost) * days).toFixed(2));
}

export async function computeExtrasPrice(
  items: { extraServiceId: string; quantity: number }[],
  days: number
): Promise<{ total: number; lines: { extraServiceId: string; unitPrice: number; quantity: number }[] }> {
  if (items.length === 0) return { total: 0, lines: [] };

  const services = await prisma.extraService.findMany({
    where: { id: { in: items.map((i) => i.extraServiceId) } },
  });

  let total = 0;
  const lines = items.map((item) => {
    const service = services.find((s) => s.id === item.extraServiceId);
    if (!service) throw new Error(`Extra service ${item.extraServiceId} not found`);
    const unitPrice = Number(service.price);
    const multiplier = service.perDay ? days : 1;
    total += unitPrice * item.quantity * multiplier;
    return { extraServiceId: item.extraServiceId, unitPrice, quantity: item.quantity };
  });

  return { total: Number(total.toFixed(2)), lines };
}
