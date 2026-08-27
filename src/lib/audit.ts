import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Governance audit trail (section 28): chi -> cosa -> quando -> da quale
 * IP. Call from every mutating Server Action / API route after a write
 * succeeds. Never throws - a failed audit write must not roll back the
 * business transaction it is describing.
 */
export async function logAudit(params: {
  tenantId: string | null;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  try {
    const headerList = await headers();
    const ipAddress =
      headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headerList.get("x-real-ip") ?? undefined;

    await prisma.auditLog.create({
      data: {
        tenantId: params.tenantId,
        actorId: params.actorId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        ipAddress,
        metadata: params.metadata,
      },
    });
  } catch (error) {
    logger.error({ err: error, action: params.action }, "[audit] failed to write audit log entry");
  }
}
