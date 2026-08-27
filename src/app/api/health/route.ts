// Never statically prerendered/cached - every route here reads request-time state (session, DB, query params) or must run per-request.
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Health check (section 15/20/26). Used by Docker's `HEALTHCHECK`,
 * container orchestrators, and uptime monitors. Verifies the process is
 * responsive AND that the database connection actually works - a
 * "the process is up" check alone hides a broken DATABASE_URL.
 */
export async function GET() {
  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      database: "connected",
      uptimeSeconds: Math.floor(process.uptime()),
      latencyMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        database: "unreachable",
        error: error instanceof Error ? error.message : "unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
