// Never statically prerendered/cached - every route here reads request-time state (session, DB, query params) or must run per-request.
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, RATE_LIMITS, clientIp } from "@/lib/rate-limit";

/**
 * Global vehicle make/model catalog lookup (section 7), used by the fleet
 * form's brand/model picker. Not tenant-scoped - the catalog is shared
 * across every tenant. Searches "brand model" as a single string so
 * typing "panda" or "fiat panda" both match.
 */
export async function GET(req: NextRequest) {
  const limit = await rateLimit("vehicle-catalog-search", clientIp(req.headers), RATE_LIMITS.publicApi);
  if (!limit.allowed) return NextResponse.json({ error: "Troppe richieste" }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  const models = await prisma.vehicleModel.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { brand: { name: { contains: q, mode: "insensitive" } } },
      ],
    },
    include: { brand: true },
    orderBy: [{ brand: { name: "asc" } }, { name: "asc" }],
    take: 20,
  });

  return NextResponse.json({
    results: models.map((m) => ({
      brandId: m.brandId,
      brandName: m.brand.name,
      modelId: m.id,
      modelName: m.name,
      category: m.category,
    })),
  });
}
