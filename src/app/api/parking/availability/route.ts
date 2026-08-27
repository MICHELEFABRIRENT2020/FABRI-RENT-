import { NextRequest, NextResponse } from "next/server";
import { checkParkingAvailability } from "@/lib/parking-engine";
import { computeParkingPrice } from "@/lib/pricing-engine";
import { getPublicTenant } from "@/lib/tenant";
import type { ParkingCategory, ParkingSlotType } from "@/generated/prisma/client";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slotType = searchParams.get("slotType") as ParkingSlotType | null;
  const category = searchParams.get("category") as ParkingCategory | null;
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (!slotType || !category || !start || !end) {
    return NextResponse.json({ error: "Parametri mancanti" }, { status: 400 });
  }

  const startDate = new Date(start);
  const endDate = new Date(end);
  const tenant = await getPublicTenant();

  const [availability, price] = await Promise.all([
    checkParkingAvailability({ tenantId: tenant.id, slotType, startDate, endDate }),
    computeParkingPrice({ tenantId: tenant.id, category, slotType, startDate, endDate }),
  ]);

  return NextResponse.json({ ...availability, ...price });
}
