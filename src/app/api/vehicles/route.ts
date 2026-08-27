import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeVehiclePrice } from "@/lib/pricing-engine";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const startParam = searchParams.get("start");
  const endParam = searchParams.get("end");

  const vehicles = await prisma.vehicle.findMany({
    where: { status: "available" },
    orderBy: [{ category: "asc" }, { dailyRate: "asc" }],
  });

  const byCategory = new Map<string, typeof vehicles>();
  for (const vehicle of vehicles) {
    const list = byCategory.get(vehicle.category) ?? [];
    list.push(vehicle);
    byCategory.set(vehicle.category, list);
  }

  const startDate = startParam ? new Date(startParam) : null;
  const endDate = endParam ? new Date(endParam) : null;

  const categories = await Promise.all(
    Array.from(byCategory.entries()).map(async ([category, group]) => {
      const representative = group[0];
      let days = 1;
      let dailyRate = Number(representative.dailyRate);
      let total = Number(representative.dailyRate);
      let ruleName: string | null = null;

      if (startDate && endDate) {
        const priced = await computeVehiclePrice({
          vehicleId: representative.id,
          startDate,
          endDate,
        });
        days = priced.days;
        dailyRate = priced.dailyRate;
        total = priced.total;
        ruleName = priced.ruleName;
      }

      return {
        category,
        representative: {
          id: representative.id,
          name: representative.name,
          seats: representative.seats,
          transmission: representative.transmission,
          fuelType: representative.fuelType,
          imageUrl: representative.imageUrl,
        },
        vehicleCount: group.length,
        isOrSimilar: group.length > 1 || representative.isOrSimilar,
        days,
        dailyRate,
        total,
        ruleName,
      };
    })
  );

  return NextResponse.json({ categories });
}
