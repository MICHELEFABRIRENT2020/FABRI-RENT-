"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertTenant, BLACKLIST_ROLES } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import type { AppUserRole } from "@/types/next-auth";
import type { BlacklistReason, BlacklistStatus } from "@/generated/prisma/client";

function assertBlacklistAccess(role: AppUserRole) {
  if (!BLACKLIST_ROLES.includes(role)) throw new Error("Accesso non autorizzato alla blacklist.");
}

export async function createBlacklistEntry(params: {
  customerId?: string;
  fullNameSnapshot: string;
  fiscalCode?: string;
  contractId?: string;
  plate?: string;
  reason: BlacklistReason;
  details: string;
  amountDue?: number;
  documentUrls: string[];
  photoUrls: string[];
}) {
  const { user, tenantId } = await assertTenant();
  assertBlacklistAccess(user.role);

  const entry = await prisma.blacklistEntry.create({
    data: {
      tenantId,
      customerId: params.customerId,
      fullNameSnapshot: params.fullNameSnapshot,
      fiscalCode: params.fiscalCode,
      contractId: params.contractId,
      plate: params.plate,
      reason: params.reason,
      details: params.details,
      amountDue: params.amountDue,
      documentUrls: params.documentUrls,
      photoUrls: params.photoUrls,
      operatorId: user.id,
    },
  });

  await logAudit({
    tenantId,
    actorId: user.id,
    action: "blacklist_entry_created",
    entityType: "blacklist_entry",
    entityId: entry.id,
    metadata: { reason: params.reason },
  });
  revalidatePath("/desk/blacklist");
}

export async function updateBlacklistStatus(id: string, status: BlacklistStatus) {
  const { user, tenantId } = await assertTenant();
  assertBlacklistAccess(user.role);

  await prisma.blacklistEntry.update({ where: { id, tenantId }, data: { status } });
  await logAudit({ tenantId, actorId: user.id, action: "blacklist_status_updated", entityType: "blacklist_entry", entityId: id, metadata: { status } });
  revalidatePath("/desk/blacklist");
}
