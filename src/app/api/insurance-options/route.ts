import { NextRequest, NextResponse } from "next/server";
import { listInsuranceOptionsForZone } from "@/lib/insurance";
import { getPublicTenant } from "@/lib/tenant";
import type { InsuranceZone } from "@/generated/prisma/client";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const zone = searchParams.get("zone") as InsuranceZone | null;

  if (zone !== "sud_italia" && zone !== "centro_nord_italia") {
    return NextResponse.json({ error: "Parametro zone non valido" }, { status: 400 });
  }

  const tenant = await getPublicTenant();
  const options = await listInsuranceOptionsForZone(tenant.id, zone);
  return NextResponse.json({ options });
}
