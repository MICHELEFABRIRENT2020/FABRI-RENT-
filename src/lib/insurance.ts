import { prisma } from "@/lib/prisma";
import type { InsuranceZone } from "@/generated/prisma/client";

export { resolveInsuranceZone, isKasko, assertInsuranceSelectable } from "@/lib/insurance-zone";

export async function listInsuranceOptionsForZone(zone: InsuranceZone) {
  return prisma.insuranceOption.findMany({
    where: { zone, active: true },
    orderBy: { dailyCost: "asc" },
  });
}
