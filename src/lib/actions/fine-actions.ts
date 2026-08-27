"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertTenant, WRITE_ROLES } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import type { FineStatus } from "@/generated/prisma/client";

function assertWrite(role: string) {
  if (!WRITE_ROLES.includes(role as (typeof WRITE_ROLES)[number])) throw new Error("Non autorizzato.");
}

// ---------------------------------------------------------------------------
// Enti verbalizzanti / rubrica PEC (section 16)
// ---------------------------------------------------------------------------

export async function createIssuingAuthority(params: { name: string; pec?: string; source?: string }) {
  const { user, tenantId } = await assertTenant();
  assertWrite(user.role);

  const authority = await prisma.issuingAuthority.upsert({
    where: { tenantId_name: { tenantId, name: params.name } },
    update: { pec: params.pec || undefined, source: params.source || undefined, verifiedAt: params.pec ? new Date() : undefined },
    create: {
      tenantId,
      name: params.name,
      pec: params.pec || undefined,
      source: params.source || undefined,
      verifiedAt: params.pec ? new Date() : undefined,
    },
  });

  await logAudit({ tenantId, actorId: user.id, action: "issuing_authority_saved", entityType: "issuing_authority", entityId: authority.id });
  revalidatePath("/desk/multe");
  revalidatePath("/desk/multe/enti");
  return authority;
}

// ---------------------------------------------------------------------------
// Multe (section 15/17)
// ---------------------------------------------------------------------------

export async function createFine(params: {
  plate: string;
  vehicleId?: string;
  contractId?: string;
  customerId?: string;
  violationDate: string;
  violationTime?: string;
  verbaleNumber: string;
  issuingAuthorityName?: string;
  issuingAuthorityPec?: string;
  amount: number;
  dueDate?: string;
  documentUrl?: string;
}) {
  const { user, tenantId } = await assertTenant();
  assertWrite(user.role);

  let issuingAuthorityId: string | undefined;
  if (params.issuingAuthorityName) {
    const authority = await prisma.issuingAuthority.upsert({
      where: { tenantId_name: { tenantId, name: params.issuingAuthorityName } },
      update: params.issuingAuthorityPec ? { pec: params.issuingAuthorityPec, verifiedAt: new Date() } : {},
      create: { tenantId, name: params.issuingAuthorityName, pec: params.issuingAuthorityPec || undefined },
    });
    issuingAuthorityId = authority.id;
  }

  const fine = await prisma.fine.create({
    data: {
      tenantId,
      plate: params.plate,
      vehicleId: params.vehicleId,
      contractId: params.contractId,
      customerId: params.customerId,
      violationDate: new Date(params.violationDate),
      violationTime: params.violationTime,
      verbaleNumber: params.verbaleNumber,
      issuingAuthorityId,
      amount: params.amount,
      dueDate: params.dueDate ? new Date(params.dueDate) : undefined,
      documentUrl: params.documentUrl,
      operatorId: user.id,
    },
  });

  await logAudit({ tenantId, actorId: user.id, action: "fine_created", entityType: "fine", entityId: fine.id });
  revalidatePath("/desk/multe");
}

export async function updateFineStatus(id: string, status: FineStatus) {
  const { user, tenantId } = await assertTenant();
  assertWrite(user.role);

  await prisma.fine.update({ where: { id, tenantId }, data: { status } });
  await logAudit({ tenantId, actorId: user.id, action: "fine_status_updated", entityType: "fine", entityId: id, metadata: { status } });
  revalidatePath("/desk/multe");
}
