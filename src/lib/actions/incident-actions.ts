"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertTenant, WRITE_ROLES } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import type { DamageRecordType, DamageRecordStatus, ClaimStatus } from "@/generated/prisma/client";

function assertWrite(role: string) {
  if (!WRITE_ROLES.includes(role as (typeof WRITE_ROLES)[number])) throw new Error("Non autorizzato.");
}

// ---------------------------------------------------------------------------
// Danni (section 12)
// ---------------------------------------------------------------------------

export async function createDamageRecord(params: {
  vehicleId?: string;
  bookingId?: string;
  customerId?: string;
  type: DamageRecordType;
  position?: string;
  photoUrls: string[];
  videoUrls: string[];
  documentUrls: string[];
  costEstimated?: number;
  franchigiaAmount?: number;
  notes?: string;
}) {
  const { user, tenantId } = await assertTenant();
  assertWrite(user.role);

  const record = await prisma.damageRecord.create({
    data: {
      tenantId,
      vehicleId: params.vehicleId,
      bookingId: params.bookingId,
      customerId: params.customerId,
      type: params.type,
      position: params.position,
      photoUrls: params.photoUrls,
      videoUrls: params.videoUrls,
      documentUrls: params.documentUrls,
      costEstimated: params.costEstimated,
      franchigiaAmount: params.franchigiaAmount,
      notes: params.notes,
      operatorId: user.id,
    },
  });

  await logAudit({ tenantId, actorId: user.id, action: "damage_record_created", entityType: "damage_record", entityId: record.id });
  revalidatePath("/desk/danni");
}

export async function updateDamageRecord(id: string, status: DamageRecordStatus, costFinal?: number) {
  const { user, tenantId } = await assertTenant();
  assertWrite(user.role);

  await prisma.damageRecord.update({ where: { id, tenantId }, data: { status, costFinal } });
  await logAudit({ tenantId, actorId: user.id, action: "damage_record_updated", entityType: "damage_record", entityId: id, metadata: { status } });
  revalidatePath("/desk/danni");
}

// ---------------------------------------------------------------------------
// Sinistri (section 13)
// ---------------------------------------------------------------------------

export async function createClaim(params: {
  vehicleId?: string;
  bookingId?: string;
  customerId?: string;
  date: string;
  location?: string;
  dynamics?: string;
  photoUrls: string[];
  documentUrls: string[];
  insuranceCompany?: string;
  franchigiaAmount?: number;
  costs?: number;
  responsibleParty?: string;
  notes?: string;
}) {
  const { user, tenantId } = await assertTenant();
  assertWrite(user.role);

  const claim = await prisma.claim.create({
    data: {
      tenantId,
      vehicleId: params.vehicleId,
      bookingId: params.bookingId,
      customerId: params.customerId,
      date: new Date(params.date),
      location: params.location,
      dynamics: params.dynamics,
      photoUrls: params.photoUrls,
      documentUrls: params.documentUrls,
      insuranceCompany: params.insuranceCompany,
      franchigiaAmount: params.franchigiaAmount,
      costs: params.costs,
      responsibleParty: params.responsibleParty,
      notes: params.notes,
      operatorId: user.id,
    },
  });

  await logAudit({ tenantId, actorId: user.id, action: "claim_created", entityType: "claim", entityId: claim.id });
  revalidatePath("/desk/sinistri");
}

export async function updateClaimStatus(id: string, status: ClaimStatus) {
  const { user, tenantId } = await assertTenant();
  assertWrite(user.role);

  await prisma.claim.update({ where: { id, tenantId }, data: { status } });
  await logAudit({ tenantId, actorId: user.id, action: "claim_status_updated", entityType: "claim", entityId: id, metadata: { status } });
  revalidatePath("/desk/sinistri");
}
