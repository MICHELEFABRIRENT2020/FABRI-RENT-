import { NextRequest, NextResponse } from "next/server";
import { assertTenant, STAFF_ROLES } from "@/lib/session";
import { lookupPlate } from "@/lib/plate-lookup";
import { rateLimit, RATE_LIMITS, clientIp } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  let tenantId: string;
  let userId: string;
  try {
    const session = await assertTenant();
    if (!STAFF_ROLES.includes(session.user.role)) throw new Error("Non autorizzato");
    tenantId = session.tenantId;
    userId = session.user.id;
  } catch {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const limit = await rateLimit("plate-lookup", `${tenantId}:${clientIp(req.headers)}`, RATE_LIMITS.plateLookup);
  if (!limit.allowed) return NextResponse.json({ error: "Troppe richieste, riprova tra qualche minuto." }, { status: 429 });

  const plate = new URL(req.url).searchParams.get("plate")?.trim();
  if (!plate) return NextResponse.json({ error: "Targa mancante" }, { status: 400 });

  const result = await lookupPlate(plate);
  await logAudit({ tenantId, actorId: userId, action: "plate_lookup", entityType: "vehicle", metadata: { plate, found: result.ok } });

  if (!result.ok) return NextResponse.json({ ok: false, reason: result.reason }, { status: 200 });
  return NextResponse.json({ ok: true, data: result.data });
}
